export async function readImageDimensions(
	file: File,
): Promise<{ width?: number; height?: number }> {
	try {
		const source = await createImageBitmap(file);
		const dimensions = { width: source.width, height: source.height };
		source.close();
		return dimensions;
	} catch {
		return {};
	}
}

export function readableFileName(fileName: string): string {
	return fileName
		.replace(/\.[^/.]+$/, "")
		.replace(/[-_]+/g, " ")
		.trim();
}
