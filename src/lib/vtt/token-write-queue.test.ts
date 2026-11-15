import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createTokenWriteQueue,
	isMoveOnlyUpdate,
	type MoveUpdates,
} from "./token-write-queue";

interface Call {
	tokenId: string;
	updates: MoveUpdates;
	resolve: (ok: boolean) => void;
}

function setup(minIntervalMs = 120) {
	let clock = 0;
	const timers: { at: number; fn: () => void }[] = [];
	const calls: Call[] = [];
	const queue = createTokenWriteQueue({
		minIntervalMs,
		now: () => clock,
		setTimer: (fn, ms) => {
			const timer = { at: clock + ms, fn };
			timers.push(timer);
			return timer;
		},
		send: (tokenId, updates) =>
			new Promise<boolean>((resolve) => {
				calls.push({ tokenId, updates, resolve });
			}),
	});
	const advance = async (ms: number) => {
		clock += ms;
		for (const timer of timers.splice(0)) {
			if (timer.at <= clock) timer.fn();
			else timers.push(timer);
		}
		await Promise.resolve();
	};
	const flush = () => new Promise<void>((r) => setTimeout(r, 0));
	return { queue, calls, advance, flush, now: () => clock };
}

describe("isMoveOnlyUpdate", () => {
	it("só posição e direção vão pela fila", () => {
		expect(isMoveOnlyUpdate({ x: 1, y: 2 })).toBe(true);
		expect(isMoveOnlyUpdate({ x: 1, y: 2, rotation: 90 })).toBe(true);
		expect(isMoveOnlyUpdate({ x: 1, y: 2, targetX: undefined })).toBe(true);
		expect(isMoveOnlyUpdate({ x: 1, hpCurrent: 3 })).toBe(false);
		expect(isMoveOnlyUpdate({ rotation: 90 })).toBe(true);
		expect(isMoveOnlyUpdate({ rotation: 90, hpCurrent: 3 })).toBe(false);
		expect(isMoveOnlyUpdate({ hpCurrent: 3 })).toBe(false);
		expect(isMoveOnlyUpdate({})).toBe(false);
	});
});

describe("createTokenWriteQueue", () => {
	let ctx: ReturnType<typeof setup>;
	beforeEach(() => {
		ctx = setup();
	});

	it("a primeira gravação sai na hora", () => {
		void ctx.queue.enqueue("a", { x: 70, y: 0 });
		expect(ctx.calls).toHaveLength(1);
		expect(ctx.calls[0]?.updates).toEqual({ x: 70, y: 0 });
	});

	it("nunca há duas gravações em voo para o mesmo token", async () => {
		void ctx.queue.enqueue("a", { x: 1, y: 0 });
		void ctx.queue.enqueue("a", { x: 2, y: 0 });
		void ctx.queue.enqueue("a", { x: 3, y: 0 });
		await ctx.advance(500);
		expect(ctx.calls).toHaveLength(1);
		expect(ctx.queue.hasPending("a")).toBe(true);
	});

	it("tokens diferentes não esperam um pelo outro", () => {
		void ctx.queue.enqueue("a", { x: 1, y: 0 });
		void ctx.queue.enqueue("b", { x: 1, y: 0 });
		expect(ctx.calls.map((c) => c.tokenId)).toEqual(["a", "b"]);
	});

	it("funde o que chega durante o voo: sai UMA gravação com a posição mais recente", async () => {
		void ctx.queue.enqueue("a", { x: 1, y: 0, rotation: 90 });
		for (let i = 2; i <= 6; i++) {
			void ctx.queue.enqueue("a", { x: i, y: 0, rotation: i % 2 ? 90 : 270 });
		}
		ctx.calls[0]?.resolve(true);
		await ctx.flush();
		await ctx.advance(200);
		expect(ctx.calls).toHaveLength(2);
		expect(ctx.calls[1]?.updates).toEqual({ x: 6, y: 0, rotation: 270 });
	});

	it("a fusão mantém campos de passos anteriores que o último não traz", async () => {
		void ctx.queue.enqueue("a", { x: 1, y: 0 });
		void ctx.queue.enqueue("a", { x: 2, y: 0, rotation: 90 });
		void ctx.queue.enqueue("a", { x: 3, y: 0 });
		ctx.calls[0]?.resolve(true);
		await ctx.flush();
		await ctx.advance(200);
		expect(ctx.calls[1]?.updates).toEqual({ x: 3, y: 0, rotation: 90 });
	});

	it("respeita o intervalo mínimo mesmo com o voo terminando antes", async () => {
		void ctx.queue.enqueue("a", { x: 1, y: 0 });
		ctx.calls[0]?.resolve(true);
		await ctx.flush();
		void ctx.queue.enqueue("a", { x: 2, y: 0 });
		expect(ctx.calls).toHaveLength(1);
		await ctx.advance(119);
		expect(ctx.calls).toHaveLength(1);
		await ctx.advance(1);
		expect(ctx.calls).toHaveLength(2);
	});

	it("a ÚLTIMA posição sempre é enviada, mesmo depois da rajada acabar", async () => {
		void ctx.queue.enqueue("a", { x: 1, y: 0 });
		void ctx.queue.enqueue("a", { x: 2, y: 0 });
		void ctx.queue.enqueue("a", { x: 3, y: 0 });
		ctx.calls[0]?.resolve(true);
		await ctx.flush();
		await ctx.advance(150);
		expect(ctx.calls[1]?.updates.x).toBe(3);
		ctx.calls[1]?.resolve(true);
		await ctx.flush();
		await ctx.advance(1000);
		expect(ctx.calls).toHaveLength(2);
		expect(ctx.queue.isBusy("a")).toBe(false);
	});

	it("movimentos fundidos compartilham o resultado da gravação que os levou", async () => {
		const first = ctx.queue.enqueue("a", { x: 1, y: 0 });
		const second = ctx.queue.enqueue("a", { x: 2, y: 0 });
		const third = ctx.queue.enqueue("a", { x: 3, y: 0 });
		ctx.calls[0]?.resolve(true);
		await expect(first).resolves.toBe(true);
		await ctx.flush();
		await ctx.advance(150);
		ctx.calls[1]?.resolve(true);
		await expect(second).resolves.toBe(true);
		await expect(third).resolves.toBe(true);
	});

	it("falha: o que estava em voo e o que esperava voltam false e nada mais velho/novo é enviado por cima", async () => {
		const first = ctx.queue.enqueue("a", { x: 1, y: 0 });
		const second = ctx.queue.enqueue("a", { x: 2, y: 0 });
		ctx.calls[0]?.resolve(false);
		await expect(first).resolves.toBe(false);
		await expect(second).resolves.toBe(false);
		await ctx.advance(1000);
		expect(ctx.calls).toHaveLength(1);
		expect(ctx.queue.isBusy("a")).toBe(false);
		// depois da falha, um passo novo volta a ser gravado normalmente
		void ctx.queue.enqueue("a", { x: 9, y: 0 });
		await ctx.advance(200);
		expect(ctx.calls).toHaveLength(2);
		expect(ctx.calls[1]?.updates.x).toBe(9);
	});

	it("send que lança conta como falha e não trava a fila", async () => {
		const queue = createTokenWriteQueue({
			send: () => {
				throw new Error("boom");
			},
		});
		await expect(queue.enqueue("a", { x: 1, y: 0 })).resolves.toBe(false);
		expect(queue.isBusy("a")).toBe(false);
	});

	it("send que rejeita conta como falha", async () => {
		const queue = createTokenWriteQueue({
			send: () => Promise.reject(new Error("rede")),
		});
		await expect(queue.enqueue("a", { x: 1, y: 0 })).resolves.toBe(false);
		expect(queue.isBusy("a")).toBe(false);
	});

	describe("eco do próprio passo (estado completo x, y, rotation)", () => {
		const st = (x: number, y = 0, rotation = 0) => ({ x, y, rotation });

		it("o eco de um estado que EU enviei e já foi ultrapassado é velho; o do último, com a fila vazia, não", async () => {
			void ctx.queue.enqueue("a", { x: 1, y: 0 }, st(1));
			ctx.calls[0]?.resolve(true);
			await ctx.flush();
			await ctx.advance(150);
			void ctx.queue.enqueue("a", { x: 2, y: 0 }, st(2));
			ctx.calls[1]?.resolve(true);
			await ctx.flush();
			expect(ctx.queue.isStaleEcho("a", st(1))).toBe(true);
			// o último enviado, com a fila vazia: é aplicado (corrige divergência)
			expect(ctx.queue.isStaleEcho("a", st(2))).toBe(false);
		});

		it("com gravação mais nova esperando, até o eco do último enviado é velho", () => {
			void ctx.queue.enqueue("a", { x: 1, y: 0 }, st(1));
			void ctx.queue.enqueue("a", { x: 2, y: 0 }, st(2));
			expect(ctx.queue.hasPending("a")).toBe(true);
			expect(ctx.queue.isStaleEcho("a", st(1))).toBe(true);
		});

		it("estado que NUNCA enviei (outro usuário) não é eco meu: nem posição, nem rotação isolada", async () => {
			void ctx.queue.enqueue("a", { x: 70, y: 140 }, st(70, 140, 0));
			void ctx.queue.enqueue("a", { x: 70, y: 210 }, st(70, 210, 0));
			// outro usuário só GIROU o token: x,y iguais a uma posição minha, rotação nova
			expect(ctx.queue.isStaleEcho("a", st(70, 140, 90))).toBe(false);
			// outro usuário moveu para uma posição que nunca enviei
			expect(ctx.queue.isStaleEcho("a", st(70, 70, 0))).toBe(false);
			// o mesmo estado, em outro token
			expect(ctx.queue.isStaleEcho("b", st(70, 140, 0))).toBe(false);
		});

		it("giro só de rotation entra na fila e o estado esperado inclui a posição atual", async () => {
			void ctx.queue.enqueue("a", { rotation: 90 }, st(70, 70, 90));
			expect(ctx.calls[0]?.updates).toEqual({ rotation: 90 });
			void ctx.queue.enqueue("a", { rotation: 135 }, st(70, 70, 135));
			ctx.calls[0]?.resolve(true);
			await ctx.flush();
			await ctx.advance(150);
			expect(ctx.calls[1]?.updates).toEqual({ rotation: 135 });
			expect(ctx.queue.isStaleEcho("a", st(70, 70, 90))).toBe(true);
		});

		it("estados fundidos e nunca enviados não contam como meus", async () => {
			void ctx.queue.enqueue("a", { x: 1, y: 0 }, st(1));
			void ctx.queue.enqueue("a", { x: 2, y: 0 }, st(2));
			void ctx.queue.enqueue("a", { x: 3, y: 0 }, st(3));
			ctx.calls[0]?.resolve(true);
			await ctx.flush();
			await ctx.advance(150);
			expect(ctx.queue.isStaleEcho("a", st(2))).toBe(false);
			expect(ctx.queue.isStaleEcho("a", st(1))).toBe(true);
		});

		it("sem o estado esperado, nada é reconhecido como eco", () => {
			void ctx.queue.enqueue("a", { x: 1, y: 0 });
			expect(ctx.queue.isStaleEcho("a", st(1))).toBe(false);
		});

		it("depois do prazo, o estado deixa de ser considerado meu", async () => {
			void ctx.queue.enqueue("a", { x: 1, y: 0 }, st(1));
			ctx.calls[0]?.resolve(true);
			await ctx.flush();
			await ctx.advance(150);
			void ctx.queue.enqueue("a", { x: 2, y: 0 }, st(2));
			ctx.calls[1]?.resolve(true);
			await ctx.flush();
			await ctx.advance(16000);
			expect(ctx.queue.isStaleEcho("a", st(1))).toBe(false);
		});
	});

	it("o intervalo mínimo limita as gravações de uma rajada de 3 s", async () => {
		const sent = vi.fn();
		let clock = 0;
		const timers: { at: number; fn: () => void }[] = [];
		const queue = createTokenWriteQueue({
			minIntervalMs: 120,
			now: () => clock,
			setTimer: (fn, ms) => {
				const timer = { at: clock + ms, fn };
				timers.push(timer);
				return timer;
			},
			send: async (tokenId, updates) => {
				sent(tokenId, updates);
				return true;
			},
		});
		for (let t = 0; t <= 3000; t += 45) {
			clock = t;
			for (const timer of timers.splice(0)) {
				if (timer.at <= clock) timer.fn();
				else timers.push(timer);
			}
			void queue.enqueue("a", { x: t, y: 0 });
			await Promise.resolve();
			await Promise.resolve();
		}
		clock += 1000;
		for (const timer of timers.splice(0)) timer.fn();
		await Promise.resolve();
		await Promise.resolve();
		// 3 s a cada 120 ms: ~25 gravações (antes: 67, uma por toque)
		expect(sent.mock.calls.length).toBeLessThanOrEqual(27);
		expect(sent.mock.calls.length).toBeGreaterThan(10);
		const last = sent.mock.calls[sent.mock.calls.length - 1];
		expect(last?.[1]).toEqual({ x: 2970, y: 0 });
	});
});
