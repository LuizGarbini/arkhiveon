import { afterEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("../supabase", () => ({
	getSupabase: () => ({
		functions: {
			invoke: (
				name: string,
				opts: { body: unknown },
			): Promise<{ data: unknown; error: unknown }> => invoke(name, opts),
		},
	}),
}));

afterEach(() => {
	invoke.mockReset();
});

describe("requestLibraryThumbReads", () => {
	it("não chama a função com lista vazia", async () => {
		const { requestLibraryThumbReads } = await import("./library-storage");
		await expect(requestLibraryThumbReads("camp-1", [])).resolves.toEqual({
			urls: {},
			expiresIn: 0,
		});
		expect(invoke).not.toHaveBeenCalled();
	});

	it("deduplica e parte em lotes de 60, em paralelo", async () => {
		const { requestLibraryThumbReads } = await import("./library-storage");
		const ids = Array.from({ length: 61 }, (_, i) => `file-${i}`);
		ids.push("file-0");
		invoke.mockImplementation(
			async (_name: string, opts: { body: { fileIds: string[] } }) => {
				const urls: Record<string, string> = {};
				for (const id of opts.body.fileIds) urls[id] = `https://thumb/${id}`;
				return { data: { urls, expiresIn: 600 }, error: null };
			},
		);
		const result = await requestLibraryThumbReads("camp-1", ids);
		expect(invoke).toHaveBeenCalledTimes(2);
		expect(invoke.mock.calls[0][0]).toBe("library-r2");
		const bodies = invoke.mock.calls.map(
			(call) =>
				call[1].body as {
					action: string;
					campaignId: string;
					fileIds: string[];
				},
		);
		expect(bodies.every((body) => body.action === "request-thumb-reads")).toBe(
			true,
		);
		expect(bodies.every((body) => body.campaignId === "camp-1")).toBe(true);
		expect(bodies[0].fileIds).toHaveLength(60);
		expect(bodies[1].fileIds).toEqual(["file-60"]);
		expect(Object.keys(result.urls)).toHaveLength(61);
		expect(result.urls["file-0"]).toBe("https://thumb/file-0");
		expect(result.expiresIn).toBe(600);
	});

	it("aproveita o lote que deu certo se o outro falhar", async () => {
		const { requestLibraryThumbReads } = await import("./library-storage");
		const ids = Array.from({ length: 61 }, (_, i) => `file-${i}`);
		invoke.mockImplementation(
			async (_name: string, opts: { body: { fileIds: string[] } }) => {
				if (opts.body.fileIds.length === 1) {
					return { data: null, error: { context: { status: 403 } } };
				}
				const urls: Record<string, string> = {};
				for (const id of opts.body.fileIds) urls[id] = `https://thumb/${id}`;
				return { data: { urls, expiresIn: 120 }, error: null };
			},
		);
		const result = await requestLibraryThumbReads("camp-1", ids);
		expect(Object.keys(result.urls)).toHaveLength(60);
		expect(result.urls["file-60"]).toBeUndefined();
		expect(result.expiresIn).toBe(120);
	});

	it("lança se todos os lotes falharem", async () => {
		const { requestLibraryThumbReads } = await import("./library-storage");
		invoke.mockResolvedValue({
			data: null,
			error: { context: { status: 403 } },
		});
		await expect(
			requestLibraryThumbReads("camp-1", ["file-1"]),
		).rejects.toThrow(/permissão|Biblioteca|sessão/i);
	});
});
