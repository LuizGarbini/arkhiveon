import { MeshGradient } from "@paper-design/shaders-react";
import { memo, useEffect, useRef, useState } from "react";

export const DASHBOARD_MESH_COLORS: string[] = [
	"#130437", // --dashboard-deep / bg-dashboard-deep
	"#210751",
	"#3511A5",
	"#B34BD0",
	"#003FFF",
];

const ANIMATION_SPEED = 0.35;

/** Cap GPU work: ~720p worth of fragments max. */
const MAX_PIXEL_COUNT = 1280 * 720;

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
				distortion={0.85}
				swirl={0.35}
				grainMixer={0.15}
				grainOverlay={0.12}
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
