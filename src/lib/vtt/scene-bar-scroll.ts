/**
 * Horizontal offset that brings an item of a scroll container fully into
 * view with "nearest" semantics: no change when it is already visible, the
 * smallest scroll otherwise, and the item's start wins when it is wider than
 * the container. Used to keep the in-play scene visible in the scene bar
 * without `scrollIntoView` (which may also scroll ancestors and the page).
 */
export interface ScrollBox {
	scrollLeft: number;
	clientWidth: number;
	scrollWidth: number;
}

/** Item span in the container's content coordinates (scroll offset included). */
export interface ItemSpan {
	left: number;
	width: number;
}

export function nearestScrollLeft(box: ScrollBox, item: ItemSpan): number {
	const max = Math.max(0, box.scrollWidth - box.clientWidth);
	const clamp = (value: number) => Math.min(Math.max(value, 0), max);
	const start = item.left;
	const end = item.left + item.width;
	const viewStart = box.scrollLeft;
	const viewEnd = box.scrollLeft + box.clientWidth;
	if (start >= viewStart && end <= viewEnd) return clamp(box.scrollLeft);
	if (start < viewStart || item.width > box.clientWidth) return clamp(start);
	return clamp(end - box.clientWidth);
}
