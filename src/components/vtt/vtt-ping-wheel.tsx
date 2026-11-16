import { cn } from "@/lib/utils";
import type { PingKind } from "@/lib/vtt/ping-kinds";
import { noteWheelRender } from "@/lib/vtt/ping-latency";
import { chipOffset, WHEEL_RADIUS_PX } from "@/lib/vtt/ping-wheel";
import { wheelHoverLabel } from "@/lib/vtt/ping-wheel-dom";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { PING_KIND_ICON, PING_KIND_TEXT_CLASS } from "./ping-kind-ui";

const NO_KINDS: readonly PingKind[] = [];

/**
 * Roda de pings que abre em volta do ponto onde você aperta o botão com Ctrl no mapa
 * vazio (como no LoL): um tipo por opção, a escolhida acende, e soltar o botão manda o
 * ping. Aparece um instante depois do aperto (ou ao arrastar), para o Ctrl+clique
 * rápido não piscar a roda. É só
 * o desenho: quem segue o mouse e escolhe é o canvas. Decorativa para leitor de
 * tela (o mesmo se escolhe na ferramenta Ping).
 */
export function VTTPingWheel() {
	noteWheelRender();
	const open = useVTTStore((s) => s.pingWheel != null);
	const x = useVTTStore((s) => s.pingWheel?.x ?? 0);
	const y = useVTTStore((s) => s.pingWheel?.y ?? 0);
	const visible = useVTTStore((s) => s.pingWheel?.visible ?? false);
	const kinds = useVTTStore((s) => s.pingWheel?.kinds ?? NO_KINDS);
	// Escondida, não entra no DOM: um Ctrl+clique rápido não pode piscar a roda.
	if (!open || !visible) return null;
	// O destaque ao vivo não assina o hover: o canvas troca o atributo no DOM.
	const hover = useVTTStore.getState().pingWheel?.hover ?? null;

	return (
		<div
			aria-hidden
			data-ping-wheel
			data-revealed={visible ? "true" : "false"}
			hidden={!visible}
			className="pointer-events-none fixed z-[70] select-none"
			style={{
				left: x,
				top: y,
				visibility: visible ? "visible" : "hidden",
			}}
		>
			<div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-150">
				<span
					className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-card/75 shadow-lg backdrop-blur-md"
					style={{
						width: WHEEL_RADIUS_PX * 2 + 72,
						height: WHEEL_RADIUS_PX * 2 + 72,
					}}
				/>
				<span className="pointer-events-none absolute top-0 left-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-card shadow-md" />
				{kinds.map((id, index) => {
					const offset = chipOffset(index, kinds.length);
					const Icon = PING_KIND_ICON[id];
					const active = hover === id;
					return (
						<span
							key={id}
							data-ping-kind={id}
							data-active={active ? "true" : "false"}
							className={cn(
								"absolute flex size-12 min-h-11 min-w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 shadow-md backdrop-blur-md select-none",
								"motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-150 motion-safe:ease-out",
								"data-[active=true]:scale-110 data-[active=true]:border-primary data-[active=true]:bg-primary/20 data-[active=true]:ring-2 data-[active=true]:ring-primary",
								PING_KIND_TEXT_CLASS[id],
							)}
							style={{
								left: offset.x,
								top: offset.y,
								translate: "-50% -50%",
							}}
						>
							<Icon className="pointer-events-none size-5" />
						</span>
					);
				})}
				<span
					data-ping-wheel-label
					className="absolute left-0 w-max max-w-[240px] -translate-x-1/2 truncate rounded-full border border-border/70 bg-card/95 px-3 py-1 text-center text-xs font-semibold text-foreground shadow-lg backdrop-blur-md"
					style={{ top: WHEEL_RADIUS_PX + 52 }}
				>
					{wheelHoverLabel(hover)}
				</span>
			</div>
		</div>
	);
}
