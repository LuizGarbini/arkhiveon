import { cn } from "@/lib/utils";
import { type PingKind, pingKindInfo } from "@/lib/vtt/ping-kinds";
import {
	PICKER_GAP_PX,
	PICKER_ITEM_PX,
	PICKER_WIDTH_PX,
} from "@/lib/vtt/ping-picker";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { PING_KIND_ICON, PING_KIND_TEXT_CLASS } from "./ping-kind-ui";

const NO_KINDS: readonly PingKind[] = [];

/**
 * Lista de tipos de ping que abre ao SEGURAR o botão de ping da barra: no celular é
 * o jeito de trocar o tipo. Arraste o dedo até uma opção e solte para escolher. É só
 * o desenho: o gesto e a escolha são da barra de ferramentas.
 */
export function VTTPingPicker() {
	const open = useVTTStore((s) => s.pingPicker != null);
	const left = useVTTStore((s) => s.pingPicker?.left ?? 0);
	const top = useVTTStore((s) => s.pingPicker?.top ?? 0);
	const kinds = useVTTStore((s) => s.pingPicker?.kinds ?? NO_KINDS);
	const current = useVTTStore((s) => s.pingKind);
	if (!open) return null;
	const hover = useVTTStore.getState().pingPicker?.hover ?? null;

	return (
		<div
			aria-hidden
			data-ping-picker
			className="pointer-events-none fixed z-[70] flex select-none flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-150"
			style={{
				left,
				top,
				width: PICKER_WIDTH_PX,
				gap: PICKER_GAP_PX,
			}}
		>
			{kinds.map((id) => {
				const info = pingKindInfo(id);
				const Icon = PING_KIND_ICON[id];
				const active = hover === id;
				return (
					<span
						key={id}
						data-ping-kind={id}
						data-active={active ? "true" : "false"}
						className={cn(
							"flex items-center gap-3 rounded-2xl border border-border/70 bg-card/95 px-3 text-sm font-medium shadow-lg backdrop-blur-md select-none",
							"motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-150 motion-safe:ease-out",
							"data-[active=true]:scale-[1.03] data-[active=true]:border-primary data-[active=true]:bg-primary/15 data-[active=true]:ring-2 data-[active=true]:ring-primary",
						)}
						style={{ height: PICKER_ITEM_PX }}
					>
						<span
							className={cn(
								"pointer-events-none flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80",
								PING_KIND_TEXT_CLASS[id],
							)}
						>
							<Icon className="size-4" />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm leading-tight text-foreground">
								{info.label}
							</span>
							<span className="block truncate text-[11px] font-normal leading-tight text-muted-foreground">
								{info.hint}
							</span>
						</span>
						{current === id ? (
							<span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
								atual
							</span>
						) : null}
					</span>
				);
			})}
		</div>
	);
}
