import { lazy, Suspense, useEffect, useState } from "react";
import { isLitePerformanceMode } from "@/lib/performance-mode";
import { DASHBOARD_FALLBACK_COLORS } from "./dashboard-mesh-gradient";

const LazyDashboardMeshGradient = lazy(() =>
	import("@/components/dashboard-mesh-gradient").then((m) => ({
		default: m.DashboardMeshGradient,
	})),
);

/**
 * Instant CSS stand-in so the hero paints before the WebGL chunk arrives.
 * Colors match DASHBOARD_MESH_COLORS in dashboard-mesh-gradient.tsx.
 */
function DashboardGradientFallback() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
			style={{
				background: `
					radial-gradient(ellipse 80% 70% at 20% 30%, ${DASHBOARD_FALLBACK_COLORS.topBlob} 0%, transparent 55%),
					radial-gradient(ellipse 70% 80% at 80% 20%, ${DASHBOARD_FALLBACK_COLORS.rightBlob} 0%, transparent 50%),
					radial-gradient(ellipse 60% 50% at 60% 80%, ${DASHBOARD_FALLBACK_COLORS.bottomBlob} 0%, transparent 55%),
					linear-gradient(135deg, ${DASHBOARD_FALLBACK_COLORS.bgStart} 0%, ${DASHBOARD_FALLBACK_COLORS.bgMid} 45%, ${DASHBOARD_FALLBACK_COLORS.bgStart} 100%)
				`,
			}}
		/>
	);
}

function scheduleIdle(callback: () => void) {
	if (typeof window.requestIdleCallback === "function") {
		const id = window.requestIdleCallback(callback, { timeout: 1200 });
		return () => window.cancelIdleCallback(id);
	}

	const id = window.setTimeout(callback, 200);
	return () => window.clearTimeout(id);
}

function isWebGLSupported(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const canvas = document.createElement("canvas");
		return !!(
			window.WebGLRenderingContext &&
			(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
		);
	} catch (_e) {
		return false;
	}
}

/**
 * Dashboard hero background: CSS paints immediately; WebGL loads idle when
 * the device is not in lite/performance mode.
 */
export function DashboardHeroBackground() {
	const [enableShader, setEnableShader] = useState(false);

	useEffect(() => {
		let cancelIdle: (() => void) | undefined;

		function sync() {
			cancelIdle?.();
			cancelIdle = undefined;

			if (isLitePerformanceMode() || !isWebGLSupported()) {
				setEnableShader(false);
				return;
			}

			cancelIdle = scheduleIdle(() => {
				setEnableShader(true);
			});
		}

		sync();

		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		motionQuery.addEventListener("change", sync);
		window.addEventListener("arkhiveon-performance-mode-change", sync);
		window.addEventListener("storage", sync);

		return () => {
			cancelIdle?.();
			motionQuery.removeEventListener("change", sync);
			window.removeEventListener("arkhiveon-performance-mode-change", sync);
			window.removeEventListener("storage", sync);
		};
	}, []);

	return (
		<>
			<DashboardGradientFallback />
			{enableShader ? (
				<Suspense fallback={null}>
					<LazyDashboardMeshGradient />
				</Suspense>
			) : null}
		</>
	);
}
