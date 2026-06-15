import type { Area } from "react-easy-crop";
import { resolveImageSourceForCrop } from "./r2-image-fetch";

function createImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener("load", () => resolve(image));
		image.addEventListener("error", (error) => reject(error));
		if (!url.startsWith("blob:") && !url.startsWith("data:")) {
			image.setAttribute("crossOrigin", "anonymous");
		}
		image.src = url;
	});
}

function getRadianAngle(degreeValue: number) {
	return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
	const rotRad = getRadianAngle(rotation);
	return {
		width:
			Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
		height:
			Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
	};
}

async function getCroppedImg(
	imageSrc: string,
	pixelCrop: Area,
	rotation = 0,
): Promise<string> {
	const image = await createImage(imageSrc);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	if (!ctx) {
		throw new Error("Canvas 2D context unavailable");
	}

	const rotRad = getRadianAngle(rotation);
	const { width: boxWidth, height: boxHeight } = rotateSize(
		image.width,
		image.height,
		rotation,
	);

	canvas.width = boxWidth;
	canvas.height = boxHeight;

	ctx.translate(boxWidth / 2, boxHeight / 2);
	ctx.rotate(rotRad);
	ctx.translate(-image.width / 2, -image.height / 2);
	ctx.drawImage(image, 0, 0);

	const croppedCanvas = document.createElement("canvas");
	const croppedCtx = croppedCanvas.getContext("2d");
	if (!croppedCtx) {
		throw new Error("Canvas 2D context unavailable");
	}

	croppedCanvas.width = pixelCrop.width;
	croppedCanvas.height = pixelCrop.height;

	croppedCtx.drawImage(
		canvas,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		pixelCrop.width,
		pixelCrop.height,
	);

	return new Promise((resolve, reject) => {
		croppedCanvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error("Falha ao gerar imagem recortada"));
					return;
				}
				resolve(URL.createObjectURL(blob));
			},
			"image/webp",
			0.92,
		);
	});
}

export async function croppedBlobFromUrl(
	imageSrc: string,
	pixelCrop: Area,
): Promise<Blob> {
	const { src: resolvedSrc, revokeWhenDone } =
		await resolveImageSourceForCrop(imageSrc);
	const objectUrl = await getCroppedImg(resolvedSrc, pixelCrop);
	try {
		const response = await fetch(objectUrl);
		return await response.blob();
	} finally {
		URL.revokeObjectURL(objectUrl);
		if (revokeWhenDone) {
			URL.revokeObjectURL(resolvedSrc);
		}
	}
}
