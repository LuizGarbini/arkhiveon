import { describe, expect, it, vi } from "vitest";
import {
	isRepeatedCreate,
	newSceneId,
	PG_UNIQUE_VIOLATION,
	singleFlight,
} from "./scene-create";

describe("isRepeatedCreate", () => {
	it("recognises the primary-key conflict of a repeated create", () => {
		expect(isRepeatedCreate({ code: PG_UNIQUE_VIOLATION })).toBe(true);
		expect(isRepeatedCreate({ code: "23505" })).toBe(true);
	});

	it("does not hide other failures", () => {
		expect(isRepeatedCreate(null)).toBe(false);
		expect(isRepeatedCreate(undefined)).toBe(false);
		expect(isRepeatedCreate({ code: "42501" })).toBe(false);
		expect(isRepeatedCreate({})).toBe(false);
	});
});

describe("newSceneId", () => {
	it("returns a distinct uuid per draft", () => {
		const a = newSceneId();
		const b = newSceneId();
		expect(a).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(a).not.toBe(b);
	});
});

describe("singleFlight", () => {
	it("shares the pending task with calls made while it runs", async () => {
		const flight = singleFlight<string>();
		let finish: (value: string) => void = () => {};
		const run = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					finish = resolve;
				}),
		);
		const first = flight(run);
		const second = flight(run);
		expect(second).toBe(first);
		expect(run).toHaveBeenCalledTimes(1);
		finish("cena");
		await expect(first).resolves.toBe("cena");
	});

	it("runs again once the previous task settled", async () => {
		const flight = singleFlight<number>();
		const run = vi.fn(async () => run.mock.calls.length);
		await expect(flight(run)).resolves.toBe(1);
		await expect(flight(run)).resolves.toBe(2);
		expect(run).toHaveBeenCalledTimes(2);
	});

	it("frees the lock after a failure so the user can retry", async () => {
		const flight = singleFlight<void>();
		await expect(
			flight(async () => {
				throw new Error("rede");
			}),
		).rejects.toThrow("rede");
		const retry = vi.fn(async () => {});
		await flight(retry);
		expect(retry).toHaveBeenCalledTimes(1);
	});
});
