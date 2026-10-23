import { MeshGradient } from "@paper-design/shaders-react";
import { memo, useEffect, useRef, useState } from "react";

/** Matches ArkhiveonGradientBackground blob / base tones. */
export const DASHBOARD_MESH_COLORS: string[] = [
	"#10081f", // --dashboard-deep / bg-dashboard-deep
	"#140923",
	"#4b1f8a",
	"#7e4aff",
	"#b258ff",
];

export const DASHBOARD_FALLBACK_COLORS = {
	topBlob: DASHBOARD_MESH_COLORS[4],
	rightBlob: DASHBOARD_MESH_COLORS[3],
	bottomBlob: "#5626b4",
	bgStart: DASHBOARD_MESH_COLORS[0],
	bgMid: "#211045",
} as const;

const ANIMATION_SPEED = 0.35;

/** Cap GPU work: ~720p worth of fragments max. */
const MAX_PIXEL_COUNT = 1280 * 720;

/**
 * O MeshGradient cancela o próprio rAF ao desmontar, mas o contexto WebGL só
 * sai com o GC. Libera na hora para não acumular contextos a cada ida ao painel.
 */
function loseShaderContexts(root: HTMLElement) {
	for (const canvas of root.querySelectorAll("canvas")) {
		canvas
			.getContext("webgl2")
			?.getExtension("WEBGL_lose_context")
			?.loseContext();
	}
}

const WEBGL_CONTEXT: WebGLContextAttributes = {
	alpha: false,
	antialias: false,
	depth: false,
	stencil: false,
	powerPreference: "low-power",
	premultipliedAlpha: false,
	preserveDrawingBuffer: false,
};

/**
 * WebGL mesh gradient for the dashboard hero.
 * Keep this module isolated so it can be lazy-loaded separately from the route.
 */
function DashboardMeshGradientComponent() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState(true);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		let inView = true;
		let pageVisible = document.visibilityState === "visible";

		function sync() {
			setActive(inView && pageVisible);
		}

		if (typeof window.IntersectionObserver === "undefined") {
			inView = true;
			sync();

			function onVisibility() {
				pageVisible = document.visibilityState === "visible";
				sync();
			}

			document.addEventListener("visibilitychange", onVisibility);

			return () => {
				document.removeEventListener("visibilitychange", onVisibility);
				loseShaderContexts(el);
			};
		}

		const observer = new IntersectionObserver(
			(entries) => {
				inView = entries.some((entry) => entry.isIntersecting);
				sync();
			},
			{ threshold: 0.05 },
		);
		observer.observe(el);

		function onVisibility() {
			pageVisible = document.visibilityState === "visible";
			sync();
		}

		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			observer.disconnect();
			document.removeEventListener("visibilitychange", onVisibility);
			loseShaderContexts(el);
		};
	}, []);

	return (
		<div
			ref={containerRef}
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
		>
			<MeshGradient
				colors={DASHBOARD_MESH_COLORS}
				distortion={0.78}
				swirl={0.28}
				grainMixer={0}
				grainOverlay={0}
				speed={active ? ANIMATION_SPEED : 0}
				minPixelRatio={1}
				maxPixelCount={MAX_PIXEL_COUNT}
				webGlContextAttributes={WEBGL_CONTEXT}
				className="absolute inset-0 size-full"
			/>
		</div>
	);
}

export const DashboardMeshGradient = memo(DashboardMeshGradientComponent);
