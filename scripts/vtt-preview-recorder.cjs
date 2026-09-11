const fs = require("node:fs/promises");

// Capture only the ready application. A separate page encodes real screenshots;
// it never changes the tested page or substitutes a mock UI for the application.
async function startPreviewRecorder(page, file, title) {
	const size = page.viewportSize();
	const encoder = await page.context().newPage();
	await encoder.setViewportSize(size);
	await encoder.evaluate(({ width, height }) => {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height + 40;
		window.captureCanvas = canvas;
		window.captureChunks = [];
		window.captureRecorder = new MediaRecorder(canvas.captureStream(12), {
			mimeType: "video/webm;codecs=vp8",
			videoBitsPerSecond: 8000000,
		});
		window.captureRecorder.ondataavailable = e => window.captureChunks.push(e.data);
	}, size);
	let label = title;
	let stopped = false;
	let failure;
	const frame = async () => {
		const frameLabel = label;
		const png = await page.screenshot({ type: "png" });
		await encoder.evaluate(async ({ data, label }) => {
			const image = new Image();
			image.src = `data:image/png;base64,${data}`;
			await image.decode();
			const c = window.captureCanvas;
			const ctx = c.getContext("2d");
			ctx.drawImage(image, 0, 0, image.width, image.height);
			// Editorial caption occupies the bottom strip, outside the app screenshot.
			ctx.fillStyle = "black";
			ctx.fillRect(0, c.height - 40, c.width, 40);
			ctx.fillStyle = "white";
			ctx.font = `${c.width < 500 ? 14 : 20}px sans-serif`;
			ctx.fillText(label, 16, c.height - 14, c.width - 32);
		}, { data: png.toString("base64"), label: frameLabel });
	};
	await frame();
	await encoder.evaluate(() => window.captureRecorder.start());
	const capture = (async () => {
		while (!stopped) {
			await frame();
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	})().catch(error => { failure = error; });
	return {
		async chapter(text, ms = 2500) {
			label = text;
			await page.waitForTimeout(ms);
			if (failure) throw failure;
		},
		async stop() {
			stopped = true;
			await capture;
			if (failure) throw failure;
			const data = await encoder.evaluate(() => new Promise(resolve => {
				window.captureRecorder.onstop = async () => {
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result.split(",")[1]);
					reader.readAsDataURL(new Blob(window.captureChunks, { type: "video/webm" }));
				};
				window.captureRecorder.stop();
			}));
			await fs.writeFile(file, Buffer.from(data, "base64"));
			await encoder.close();
		},
	};
}

module.exports = { startPreviewRecorder };
