import { useEffect } from "react";

type NavigatorWithHints = Navigator & {
	deviceMemory?: number;
	connection?: {
		effectiveType?: string;
		saveData?: boolean;
	};
};

export type PerformanceModePreference = "auto" | "on" | "off";

const STORAGE_KEY = "arkhiveon-performance-mode";
const CHANGE_EVENT = "arkhiveon-performance-mode-change";

export function getPerformanceModePreference(): PerformanceModePreference {
	const value = localStorage.getItem(STORAGE_KEY);
	if (value === "on" || value === "off" || value === "auto") {
		return value;
	}
	return "auto";
}

export function setPerformanceModePreference(
	preference: PerformanceModePreference,
) {
	localStorage.setItem(STORAGE_KEY, preference);
	window.dispatchEvent(new Event(CHANGE_EVENT));
}

function shouldUseLiteMode() {
	const nav = navigator as NavigatorWithHints;
	const preference = getPerformanceModePreference();

	if (preference === "on") return true;
	if (preference === "off") return false;

	const prefersReducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const lowMemory =
		typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
	const lowCpu =
		typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
	const saveData = nav.connection?.saveData === true;
	const slowConnection =
		nav.connection?.effectiveType === "slow-2g" ||
		nav.connection?.effectiveType === "2g";
	const compactLowPower = window.innerWidth < 768 && (lowCpu || lowMemory);

	return (
		prefersReducedMotion ||
		lowMemory ||
		lowCpu ||
		saveData ||
		slowConnection ||
		compactLowPower
	);
}

export function usePerformanceMode() {
	useEffect(() => {
		const root = document.documentElement;
		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

		function updateMode() {
			root.classList.toggle("perf-lite", shouldUseLiteMode());
		}

		updateMode();
		motionQuery.addEventListener("change", updateMode);
		window.addEventListener(CHANGE_EVENT, updateMode);
		window.addEventListener("storage", updateMode);
		window.addEventListener("resize", updateMode);

		return () => {
			motionQuery.removeEventListener("change", updateMode);
			window.removeEventListener(CHANGE_EVENT, updateMode);
			window.removeEventListener("storage", updateMode);
			window.removeEventListener("resize", updateMode);
		};
	}, []);
}
