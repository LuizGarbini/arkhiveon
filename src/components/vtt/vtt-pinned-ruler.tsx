import { Ruler, X } from "lucide-react";
import { formatDistance } from "@/lib/vtt/ruler-path";
import { useVTTStore } from "@/lib/vtt/vtt-store";

/**
 * Aviso da régua fixada: ao trocar de ferramenta a medição continua no mapa (para
 * arrastar o token ao longo dela). Enquanto ela estiver lá e a ferramenta não for
 * a régua, este selo mostra a distância e deixa limpar com um toque. Medir de novo
 * com a régua também a substitui.
 */
export function VTTPinnedRuler() {
	const measurement = useVTTStore((s) => s.activeMeasurement);
	const activeTool = useVTTStore((s) => s.activeTool);
	const setActiveMeasurement = useVTTStore((s) => s.setActiveMeasurement);

	if (!measurement?.pinned || activeTool === "ruler") return null;

	return (
		<div className="pointer-events-none absolute bottom-[4.75rem] left-1/2 z-40 -translate-x-1/2 select-none">
			<div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-border/70 bg-card/95 py-1 pr-1 pl-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 duration-150">
				<Ruler aria-hidden className="size-4 shrink-0 text-primary" />
				<output
					aria-live="polite"
					className="flex items-baseline gap-1.5 whitespace-nowrap px-1"
				>
					<span className="text-[11px] font-medium text-muted-foreground">
						Régua fixada
					</span>
					<span className="text-sm font-semibold tabular-nums text-foreground">
						{formatDistance(measurement.distance, measurement.unit)}
					</span>
				</output>
				<button
					type="button"
					aria-label="Limpar régua fixada"
					title="Limpar régua fixada"
					onClick={() => setActiveMeasurement(null)}
					className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
				>
					<X aria-hidden className="size-4" />
				</button>
			</div>
		</div>
	);
}
