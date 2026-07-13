import { lazy, Suspense, useEffect, useState } from "react";
import { isLitePerformanceMode } from "@/lib/performance-mode";

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
					radial-gradient(ellipse 80% 70% at 20% 30%, #B34BD0 0%, transparent 55%),
					radial-gradient(ellipse 70% 80% at 80% 20%, #003FFF 0%, transparent 50%),
					radial-gradient(ellipse 60% 50% at 60% 80%, #3511A5 0%, transparent 55%),
					linear-gradient(135deg, #130437 0%, #210751 45%, #130437 100%)
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

			if (isLitePerformanceMode()) {
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
