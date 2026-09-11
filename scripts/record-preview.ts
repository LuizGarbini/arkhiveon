import { spawn } from "node:child_process";
import { preview } from "vite";

async function main() {
	const server = await preview({
		configLoader: "runner",
		preview: { host: "127.0.0.1", port: 4173, strictPort: true },
	});
	try {
		await new Promise<void>((resolve, reject) => {
			const child = spawn(process.execPath, ["scripts/test-vtt.cjs"], {
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
					: reject(new Error("O preview da mesa falhou: " + code)),
			);
		});
		console.log(
			"Preview validado: docs/previews/latest-preview.png e latest-preview.webm",
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
