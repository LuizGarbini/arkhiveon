import { useEffect, useState } from "react";

const SHORTCUT_VIEWPORT_QUERY = "(min-width: 768px)";

export function useShortcutViewport() {
	const [supportsShortcuts, setSupportsShortcuts] = useState(() =>
		typeof window === "undefined"
			? true
			: window.matchMedia(SHORTCUT_VIEWPORT_QUERY).matches,
	);

	useEffect(() => {
		const mediaQuery = window.matchMedia(SHORTCUT_VIEWPORT_QUERY);
		const updateSupportsShortcuts = () =>
			setSupportsShortcuts(mediaQuery.matches);

		updateSupportsShortcuts();
		mediaQuery.addEventListener("change", updateSupportsShortcuts);
		return () =>
			mediaQuery.removeEventListener("change", updateSupportsShortcuts);
	}, []);

	return supportsShortcuts;
}
