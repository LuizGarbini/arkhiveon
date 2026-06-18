export function cropShapeFromPreview(
	previewShape: "rounded" | "circle",
): "rect" | "round" {
	return previewShape === "circle" ? "round" : "rect";
}

export function cropAspectFromPreview(_previewShape: "rounded" | "circle") {
	return 1;
}
