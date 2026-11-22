import { describe, expect, it } from "vitest";
import { admitPing, emptyPingQueue } from "./ping-queue";
import { acceptIncomingPing } from "./ping-receive";

/**
 * Caminho inteiro de um ping entre duas telas, sem rede: quem manda aceita o
 * ping no próprio relógio e manda o ActivePing pelo broadcast (JSON); quem
 * recebe passa por acceptIncomingPing e admitPing, como o handler da sala em
 * vtt.tsx. Os relógios dos dois computadores não são iguais.
 */
function sendAndReceive(input: {
	kind: string;
	senderNow: number;
	receiverNow: number;
	receiverView?: Parameters<typeof acceptIncomingPing>[2];
}) {
	const sent = admitPing(
		emptyPingQueue(),
		{
			x: 300,
			y: 400,
			userId: "mestre",
			userName: "Mestre",
			color: "#fff",
			timestamp: input.senderNow,
			kind: input.kind as never,
		},
		input.senderNow,
	).ping;
	if (!sent) throw new Error("quem manda não aceitou o próprio ping");
	const wire = JSON.parse(JSON.stringify(sent));
	const received = acceptIncomingPing(
		wire,
		{ campaignOwnerId: "mestre" },
		input.receiverView ?? null,
		input.receiverNow,
	);
	if (!received) return { shown: null, pullTo: null };
	const shown = admitPing(
		emptyPingQueue(),
		received.ping,
		input.receiverNow,
	).ping;
	return { shown, pullTo: shown ? received.pullTo : null };
}

const SENDER = 1_700_000_000_000;

describe("ping entre computadores com relógios diferentes", () => {
	it("mesmo relógio: aparece (controle)", () => {
		const { shown } = sendAndReceive({
			kind: "attention",
			senderNow: SENDER,
			receiverNow: SENDER + 80,
		});
		expect(shown).not.toBeNull();
	});

	it("relógio de quem recebe 10 s à frente: o ping ainda aparece", () => {
		const { shown } = sendAndReceive({
			kind: "attention",
			senderNow: SENDER,
			receiverNow: SENDER + 10_000,
		});
		expect(shown).not.toBeNull();
		expect(shown?.x).toBe(300);
	});

	it("relógio 2 min à frente: 'Todos aqui' aparece e leva a câmera", () => {
		const { shown, pullTo } = sendAndReceive({
			kind: "focus",
			senderNow: SENDER,
			receiverNow: SENDER + 120_000,
		});
		expect(shown?.kind).toBe("focus");
		expect(pullTo).toEqual({ x: 300, y: 400 });
	});

	it("relógio de quem recebe atrás: a animação começa na chegada, não no futuro", () => {
		const { shown } = sendAndReceive({
			kind: "attention",
			senderNow: SENDER,
			receiverNow: SENDER - 60_000,
		});
		expect(shown?.timestamp).toBe(SENDER - 60_000);
	});

	it("o id de quem mandou fica: o mesmo ping duas vezes não duplica", () => {
		const { shown } = sendAndReceive({
			kind: "attention",
			senderNow: SENDER,
			receiverNow: SENDER + 10_000,
		});
		expect(shown?.id).toBeTruthy();
		const again = acceptIncomingPing(
			JSON.parse(JSON.stringify(shown)),
			{ campaignOwnerId: "mestre" },
			null,
			SENDER + 10_050,
		);
		if (!shown || !again) throw new Error("ping sumiu");
		const state = { ...emptyPingQueue(), pings: [shown] };
		expect(admitPing(state, again.ping, SENDER + 10_050).ping).toBeNull();
	});
});
