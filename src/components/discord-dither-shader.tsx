import { Dithering } from "@paper-design/shaders-react";

export function DiscordDitherShader() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
		>
			<Dithering
				colorBack="#0e051c"
				colorFront="#5865F2"
				shape="swirl"
				type="4x4"
				speed={0.4}
				scale={0.85}
				size={2}
				className="h-full w-full opacity-65"
			/>
		</div>
	);
}
