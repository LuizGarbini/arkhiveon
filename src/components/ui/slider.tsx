"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

/**
 * Slider do design system (padrão shadcn sobre Base UI). Um único valor
 * numérico; só tokens existentes (primary, muted, background, ring).
 * Alvo de toque de 44 px (h-11) no Control; o thumb tem 20 px.
 */
function Slider({
	className,
	thumbLabel,
	...props
}: SliderPrimitive.Root.Props<number> & { thumbLabel?: string }) {
	return (
		<SliderPrimitive.Root
			data-slot="slider"
			className={cn(
				"relative w-full touch-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Control
				data-slot="slider-control"
				className="relative flex h-11 w-full cursor-pointer items-center data-disabled:cursor-not-allowed"
			>
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-range"
						className="h-full bg-primary"
					/>
				</SliderPrimitive.Track>
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					aria-label={thumbLabel}
					className="block size-5 rounded-full border-2 border-primary bg-background shadow-xs outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 data-dragging:ring-[3px] data-dragging:ring-ring/30"
				/>
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
