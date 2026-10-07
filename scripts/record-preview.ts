import { spawn } from "node:child_process";
import { preview } from "vite";

async function main() {
	const server = await preview({
		configLoader: "runner",
		preview: { host: "127.0.0.1", port: 4173, strictPort: true },
	});
	try {
		for (const script of [
			"scripts/test-vtt.cjs",
			"scripts/test-vtt-review.cjs",
		]) {
			await new Promise<void>((resolve, reject) => {
				const child = spawn(process.execPath, [script], {
					stdio: "inherit",
					windowsHide: true,
					env: {
						...process.env,
						VTT_BASE_URL: "http://127.0.0.1:4173",
						VTT_RECORD: "1",
					},
				});
				child.on("error", reject);
				child.on("exit", (code) =>
					code === 0
						? resolve()
						: reject(new Error(`O preview da mesa falhou (${script}): ${code}`)),
				);
			});
		}
		console.log(
			"Preview validado: docs/previews/latest-preview.png, latest-preview.webm, vtt-mobile-preview.webm, vtt-review-preview.webm e vtt-review-mobile.webm",
		);
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.httpServer.close((error) => (error ? reject(error) : resolve())),
		);
	}
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
