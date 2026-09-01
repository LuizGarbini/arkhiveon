import { ArrowUpRight } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { isLitePerformanceMode } from "@/lib/performance-mode";

const LazyDiscordDitherShader = lazy(() =>
	import("@/components/discord-dither-shader").then((m) => ({
		default: m.DiscordDitherShader,
	})),
);

function DiscordFallbackGradient() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
			style={{
				background: `
					radial-gradient(ellipse 70% 60% at 85% 50%, rgba(88, 101, 242, 0.25) 0%, transparent 60%),
					radial-gradient(ellipse 60% 80% at 15% 30%, rgba(139, 92, 246, 0.2) 0%, transparent 55%),
					linear-gradient(135deg, #0b0417 0%, #130728 50%, #0d041c 100%)
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

export function DiscordDitherBanner() {
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
		<aside
			aria-label="Comunidade Discord"
			className="group relative overflow-hidden rounded-2xl border border-[#5865F2]/40 bg-[#0e051c] p-4 sm:p-5 shadow-lg shadow-black/20 transition-all duration-150 ease-out hover:border-[#5865F2]/70"
		>
			{/* Dithering Shader with Fallback */}
			{enableShader ? (
				<Suspense fallback={<DiscordFallbackGradient />}>
					<LazyDiscordDitherShader />
				</Suspense>
			) : (
				<DiscordFallbackGradient />
			)}

			{/* Soft vignette */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/40 via-transparent to-black/30"
			/>

			{/* Content */}
			<div className="relative z-[2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div className="flex items-center gap-3.5 min-w-0">
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/20 text-[#5865F2] shadow-inner backdrop-blur-md group-hover:scale-105 transition-transform">
						<DiscordIcon className="h-5 w-5 fill-current text-[#7289DA] group-hover:text-white transition-colors" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h3 className="font-display text-sm font-bold text-white tracking-tight">
								Comunidade Arkhiveon
							</h3>
							<span className="rounded-full border border-[#5865F2]/40 bg-[#5865F2]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-200 backdrop-blur-md">
								Discord Oficial
							</span>
						</div>
						<p className="text-xs text-white/75 mt-0.5 max-w-xl truncate sm:whitespace-normal">
							Conecte-se com mestres e jogadores, compartilhe fichas, mapas e
							tire dúvidas da mesa.
						</p>
					</div>
				</div>

				<a
					href="https://discord.gg/64jBCNfzvd"
					target="_blank"
					rel="noopener noreferrer"
					className="group/btn t-hover-lift w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#5865F2]/30 select-none shrink-0"
				>
					<span>Entrar no Discord</span>
					<ArrowUpRight className="t-arrow-reveal h-3.5 w-3.5" />
				</a>
			</div>
		</aside>
	);
}

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 127.14 96.36"
			role="img"
			aria-label="Discord Logo"
			{...props}
		>
			<path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.8,6.83,77.19,77.19,0,0,0,49.5,0,105.15,105.15,0,0,0,19.06,8.07C3.58,31.21-1.92,53.7,1,75.87a107.94,107.94,0,0,0,32,16.15,86.23,86.23,0,0,0,6.72-11A72.82,72.82,0,0,1,25,74.55c.9-.66,1.8-1.34,2.66-2a74.75,74.75,0,0,0,79,0c.87.69,1.76,1.37,2.66,2a72.82,72.82,0,0,1-14.73,6.51,86.23,86.23,0,0,0,6.72,11,107.94,107.94,0,0,0,32-16.15C129.8,49.12,123.63,26.83,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.35,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
		</svg>
	);
}
