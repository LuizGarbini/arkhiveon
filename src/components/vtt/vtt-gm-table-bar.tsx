import { Eraser, Eye, ScanEye } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { templateIdsToClear } from "@/lib/vtt/template-permissions";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const buttonClass =
	"flex min-h-9 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(pointer:coarse)]:min-h-11";

/**
 * Barra do mestre, sempre à vista no canto da mesa: limpar os moldes de magia
 * que estão em campo (inclusive os dos jogadores) e ajustar o que ele vê da
 * exploração do grupo. Antes isso só existia dentro de painéis que ficam
 * fechados, e a mesa podia ficar cheia sem o mestre achar como limpar.
 */
export function VTTGMTableBar({
	scene,
	onClearTemplates,
}: {
	scene: VTTScene | null;
	/** Avisa os outros que os moldes saíram (broadcast). */
	onClearTemplates: (ids: string[]) => void;
}) {
	const isGM = useVTTStore((s) => s.isGM);
	const isCoGM = useVTTStore((s) => s.isCoGM);
	const placedTemplates = useVTTStore((s) => s.placedTemplates);
	const remoteTemplates = useVTTStore((s) => s.remoteTemplates);
	const removeTemplatesByIds = useVTTStore((s) => s.removeTemplatesByIds);
	const showPlayerExploration = useVTTStore((s) => s.showPlayerExploration);
	const setShowPlayerExploration = useVTTStore(
		(s) => s.setShowPlayerExploration,
	);
	const showAllVisionCones = useVTTStore((s) => s.showAllVisionCones);
	const setShowAllVisionCones = useVTTStore((s) => s.setShowAllVisionCones);

	const clearIds = useMemo(
		() =>
			templateIdsToClear(
				{ isGM, isCoGM },
				placedTemplates,
				Object.keys(remoteTemplates),
			),
		[isGM, isCoGM, placedTemplates, remoteTemplates],
	);

	const staff = isGM || isCoGM;
	const canClear = staff && clearIds.length > 0;
	const showExploration =
		isGM && Boolean(scene?.fogEnabled) && Boolean(scene?.fogExploration);
	if (!canClear && !showExploration) return null;

	return (
		<div
			role="toolbar"
			aria-label="Ferramentas do mestre na mesa"
			className="absolute bottom-4 left-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-0.5 rounded-2xl border border-border/70 bg-card/90 p-1 shadow-lg backdrop-blur-md sm:left-20"
		>
			{canClear ? (
				<button
					type="button"
					aria-label={`Limpar magias da mesa (${clearIds.length})`}
					title="Tira da mesa todos os moldes de magia, os seus e os dos jogadores"
					onClick={() => {
						onClearTemplates(clearIds);
						removeTemplatesByIds(clearIds);
					}}
					className={cn(
						buttonClass,
						"text-foreground [@media(hover:hover)]:hover:bg-accent",
					)}
				>
					<Eraser aria-hidden className="size-4" />
					Limpar magias
					<span className="tabular-nums text-muted-foreground">
						({clearIds.length})
					</span>
				</button>
			) : null}
			{canClear && showExploration ? (
				<span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-border" />
			) : null}
			{showExploration ? (
				<>
					<button
						type="button"
						aria-pressed={showPlayerExploration}
						title="Realça no mapa o que os jogadores já exploraram. Só o mestre vê."
						onClick={() => setShowPlayerExploration(!showPlayerExploration)}
						className={cn(
							buttonClass,
							showPlayerExploration
								? "bg-primary/15 text-foreground ring-1 ring-primary/40"
								: "text-muted-foreground [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
						)}
					>
						<Eye aria-hidden className="size-4" />
						Explorado
					</button>
					<button
						type="button"
						aria-pressed={showAllVisionCones}
						disabled={!showPlayerExploration}
						title="Mostra o cone de visão de todos os personagens. Desligado, aparece só o do token selecionado."
						onClick={() => setShowAllVisionCones(!showAllVisionCones)}
						className={cn(
							buttonClass,
							"disabled:pointer-events-none disabled:opacity-40",
							showAllVisionCones && showPlayerExploration
								? "bg-primary/15 text-foreground ring-1 ring-primary/40"
								: "text-muted-foreground [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
						)}
					>
						<ScanEye aria-hidden className="size-4" />
						Cones de todos
					</button>
				</>
			) : null}
		</div>
	);
}
