import { cn } from "@/lib/utils";
import { pingKindInfo } from "@/lib/vtt/ping-kinds";
import { chipOffset, WHEEL_RADIUS_PX } from "@/lib/vtt/ping-wheel";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { PING_KIND_ICON, PING_KIND_TEXT_CLASS } from "./ping-kind-ui";

/**
 * Roda de pings que abre em volta do cursor com Ctrl + segurar no mapa (como no
 * LoL): um tipo por opção, a escolhida acende, e soltar o botão manda o ping. É só
 * o desenho: quem segue o mouse e escolhe é o canvas. Decorativa para leitor de
 * tela (o mesmo se escolhe na ferramenta Ping).
 */
export function VTTPingWheel() {
	const wheel = useVTTStore((s) => s.pingWheel);
	if (!wheel) return null;
	const hovered = wheel.hover ? pingKindInfo(wheel.hover) : null;

	return (
		<div
			aria-hidden
			data-ping-wheel
			className="pointer-events-none fixed z-[70] select-none"
			style={{ left: wheel.x, top: wheel.y }}
		>
			<div className="animate-in fade-in zoom-in-95 duration-150">
				<span className="absolute top-0 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card shadow-lg" />
				<span
					className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/50 bg-card/40 backdrop-blur-md"
					style={{
						width: WHEEL_RADIUS_PX * 2 + 56,
						height: WHEEL_RADIUS_PX * 2 + 56,
					}}
				/>
				{wheel.kinds.map((id, index) => {
					const offset = chipOffset(index, wheel.kinds.length);
					const Icon = PING_KIND_ICON[id];
					const active = wheel.hover === id;
					return (
						<span
							key={id}
							data-ping-kind={id}
							data-active={active ? "true" : "false"}
							className={cn(
								"absolute flex size-12 items-center justify-center rounded-full border bg-card/95 shadow-lg backdrop-blur-md transition-[transform,background-color,border-color] duration-100 ease-out",
								PING_KIND_TEXT_CLASS[id],
								active
									? "scale-110 border-primary bg-primary/20 ring-2 ring-primary"
									: "border-border/70",
							)}
							style={{
								left: offset.x,
								top: offset.y,
								translate: "-50% -50%",
							}}
						>
							<Icon className="size-5" />
						</span>
					);
				})}
				<span
					className="absolute left-0 w-max -translate-x-1/2 rounded-full border border-border/70 bg-card/95 px-3 py-1 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md"
					style={{ top: WHEEL_RADIUS_PX + 48 }}
				>
					{hovered ? hovered.label : "Solte no centro para o ping escolhido"}
				</span>
			</div>
		</div>
	);
}
