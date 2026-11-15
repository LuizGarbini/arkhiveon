import { cn } from "@/lib/utils";
import { pingKindInfo } from "@/lib/vtt/ping-kinds";
import {
	PICKER_GAP_PX,
	PICKER_ITEM_PX,
	PICKER_WIDTH_PX,
} from "@/lib/vtt/ping-picker";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { PING_KIND_ICON, PING_KIND_TEXT_CLASS } from "./ping-kind-ui";

/**
 * Lista de tipos de ping que abre ao SEGURAR o botão de ping da barra: no celular é
 * o jeito de trocar o tipo. Arraste o dedo até uma opção e solte para escolher. É só
 * o desenho: o gesto e a escolha são da barra de ferramentas.
 */
export function VTTPingPicker() {
	const picker = useVTTStore((s) => s.pingPicker);
	const current = useVTTStore((s) => s.pingKind);
	if (!picker) return null;

	return (
		<div
			aria-hidden
			data-ping-picker
			className="pointer-events-none fixed z-[70] flex select-none flex-col animate-in fade-in zoom-in-95 duration-150"
			style={{
				left: picker.left,
				top: picker.top,
				width: PICKER_WIDTH_PX,
				gap: PICKER_GAP_PX,
			}}
		>
			{picker.kinds.map((id) => {
				const info = pingKindInfo(id);
				const Icon = PING_KIND_ICON[id];
				const active = picker.hover === id;
				return (
					<span
						key={id}
						data-ping-kind={id}
						data-active={active ? "true" : "false"}
						className={cn(
							"flex items-center gap-3 rounded-2xl border bg-card/95 px-3 text-sm font-medium shadow-lg backdrop-blur-md transition-[transform,background-color,border-color] duration-100 ease-out",
							active
								? "scale-[1.03] border-primary bg-primary/20 ring-2 ring-primary"
								: "border-border/70",
						)}
						style={{ height: PICKER_ITEM_PX }}
					>
						<Icon className={cn("size-5 shrink-0", PING_KIND_TEXT_CLASS[id])} />
						<span className="truncate text-foreground">{info.label}</span>
						{current === id ? (
							<span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
								atual
							</span>
						) : null}
					</span>
				);
			})}
		</div>
	);
}
