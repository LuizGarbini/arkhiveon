import type { CSSProperties } from "react";

export interface ImageFraming {
	imageFocusX?: number;
	imageFocusY?: number;
	imageZoom?: number;
}

export const DEFAULT_IMAGE_FOCUS = 50;
export const DEFAULT_IMAGE_FOCUS_Y = DEFAULT_IMAGE_FOCUS;
export const MIN_IMAGE_ZOOM = 1;
export const MAX_IMAGE_ZOOM = 3;

export function clampImageFocusX(value?: number) {
	if (value == null || Number.isNaN(value)) return DEFAULT_IMAGE_FOCUS;
	return Math.min(100, Math.max(0, value));
}

export function clampImageFocusY(value?: number) {
	return clampImageFocusX(value);
}

export function clampImageZoom(value?: number) {
	if (value == null || Number.isNaN(value)) return MIN_IMAGE_ZOOM;
	return Math.min(MAX_IMAGE_ZOOM, Math.max(MIN_IMAGE_ZOOM, value));
}

export function imageFramingStyle(framing?: ImageFraming): CSSProperties {
	const focusX = clampImageFocusX(framing?.imageFocusX);
	const focusY = clampImageFocusY(framing?.imageFocusY);
	const zoom = clampImageZoom(framing?.imageZoom);

	return {
		objectPosition: `${focusX}% ${focusY}%`,
		transform: zoom > MIN_IMAGE_ZOOM ? `scale(${zoom})` : undefined,
		transformOrigin: `${focusX}% ${focusY}%`,
	};
}

/** Quanto a posição pode mover (%) por arraste de uma largura/altura do container. */
export function imagePanSensitivity(zoom: number) {
	return Math.max(20, zoom * 22);
}
