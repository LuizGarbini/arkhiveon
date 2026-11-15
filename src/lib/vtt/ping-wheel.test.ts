import { describe, expect, it } from "vitest";
import {
	chipOffset,
	kindAtOffset,
	WHEEL_DEAD_ZONE_PX,
	WHEEL_RADIUS_PX,
	wheelAngle,
} from "./ping-wheel";

const five = ["a", "b", "c", "d", "e"];
const six = ["a", "b", "c", "d", "e", "f"];

describe("wheelAngle", () => {
	it("0 para cima, crescendo no sentido horário", () => {
		expect(wheelAngle(0, -10)).toBeCloseTo(0, 6);
		expect(wheelAngle(10, 0)).toBeCloseTo(90, 6);
		expect(wheelAngle(0, 10)).toBeCloseTo(180, 6);
		expect(wheelAngle(-10, 0)).toBeCloseTo(270, 6);
	});

	it("sempre entre 0 e 360", () => {
		for (let a = 0; a < 360; a += 7) {
			const rad = (a * Math.PI) / 180;
			const angle = wheelAngle(Math.sin(rad) * 50, -Math.cos(rad) * 50);
			expect(angle).toBeGreaterThanOrEqual(0);
			expect(angle).toBeLessThan(360 + 1e-9);
		}
	});
});

describe("kindAtOffset: a fatia sob o cursor", () => {
	it("o miolo (zona morta) não tem fatia", () => {
		expect(kindAtOffset(0, 0, five)).toBeNull();
		expect(kindAtOffset(0, -(WHEEL_DEAD_ZONE_PX - 1), five)).toBeNull();
		expect(kindAtOffset(WHEEL_DEAD_ZONE_PX - 1, 0, six)).toBeNull();
	});

	it("logo fora da zona morta já escolhe uma fatia", () => {
		expect(kindAtOffset(0, -WHEEL_DEAD_ZONE_PX, five)).toBe("a");
	});

	it("com 5 opções, cada uma é escolhida na direção do seu centro", () => {
		for (let i = 0; i < five.length; i++) {
			const o = chipOffset(i, five.length);
			expect(kindAtOffset(o.x, o.y, five)).toBe(five[i]);
		}
	});

	it("com 6 opções (mestre), idem", () => {
		for (let i = 0; i < six.length; i++) {
			const o = chipOffset(i, six.length);
			expect(kindAtOffset(o.x, o.y, six)).toBe(six[i]);
		}
	});

	it("a primeira fatia fica no topo e a última não vaza para o outro lado", () => {
		expect(kindAtOffset(0, -80, six)).toBe("a");
		expect(kindAtOffset(-20, -80, six)).toBe("a"); // um pouco à esquerda do topo: ainda a
		expect(kindAtOffset(-60, -40, six)).toBe("f"); // à esquerda e acima: a última
	});

	it("muito longe do centro continua escolhendo pela direção", () => {
		expect(kindAtOffset(0, -900, five)).toBe("a");
		expect(kindAtOffset(900, 0, five)).toBe(kindAtOffset(90, 0, five));
	});

	it("o limite entre duas fatias muda de uma para a outra", () => {
		// 5 fatias de 72°: o limite entre a e b é 36°
		const justBefore = {
			x: Math.sin(35 * (Math.PI / 180)) * 80,
			y: -Math.cos(35 * (Math.PI / 180)) * 80,
		};
		const justAfter = {
			x: Math.sin(37 * (Math.PI / 180)) * 80,
			y: -Math.cos(37 * (Math.PI / 180)) * 80,
		};
		expect(kindAtOffset(justBefore.x, justBefore.y, five)).toBe("a");
		expect(kindAtOffset(justAfter.x, justAfter.y, five)).toBe("b");
	});

	it("sem opções: nada", () => {
		expect(kindAtOffset(50, 50, [])).toBeNull();
	});

	it("com uma única opção, qualquer direção fora do miolo a escolhe", () => {
		expect(kindAtOffset(50, 0, ["só"])).toBe("só");
		expect(kindAtOffset(0, 50, ["só"])).toBe("só");
	});
});

describe("chipOffset: onde fica cada opção", () => {
	it("a primeira fica em cima, à distância do raio", () => {
		const first = chipOffset(0, 5);
		expect(first.x).toBeCloseTo(0, 6);
		expect(first.y).toBeCloseTo(-WHEEL_RADIUS_PX, 6);
	});

	it("todas ficam à mesma distância do centro e não se sobrepõem", () => {
		for (const n of [5, 6]) {
			const offsets = Array.from({ length: n }, (_, i) => chipOffset(i, n));
			for (const o of offsets)
				expect(Math.hypot(o.x, o.y)).toBeCloseTo(WHEEL_RADIUS_PX, 6);
			for (let i = 0; i < n; i++) {
				for (let j = i + 1; j < n; j++) {
					const a = offsets[i] as { x: number; y: number };
					const b = offsets[j] as { x: number; y: number };
					expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(52); // chips de ~48 px
				}
			}
		}
	});

	it("a segunda de quatro fica à direita", () => {
		const second = chipOffset(1, 4);
		expect(second.x).toBeCloseTo(WHEEL_RADIUS_PX, 6);
		expect(second.y).toBeCloseTo(0, 6);
	});
});
