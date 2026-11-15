import { BrickWall, DoorOpen, Trash2 } from "lucide-react";
import {
	Kbd,
	segmentClass,
	VTTOptionsBar,
	VTTOptionsDivider,
	VTTSegmented,
} from "@/components/vtt/vtt-options-bar";
import { cn } from "@/lib/utils";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { deleteSelectedWalls, setWallsKind } from "@/lib/vtt/wall-sync";
import { isDoor, type WallKind } from "@/lib/vtt/walls";

const KINDS: { id: WallKind; label: string; hint: string }[] = [
	{
		id: "wall",
		label: "Parede",
		hint: "Bloqueia a visão e o movimento sempre",
	},
	{
		id: "door",
		label: "Porta",
		hint: "Nasce fechada; o jogador clica para abrir e ver o que há dentro",
	},
];

const actionClass =
	"flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground";

/**
 * Painel da ferramenta Parede (só mestre): escolhe se o próximo traço é parede
 * ou porta e, com paredes selecionadas, transforma-as em porta (ou volta) ou as
 * apaga. Fica na camada do mestre; as portas aparecem para todos.
 */
export function VTTWallControls() {
	const isGM = useVTTStore((s) => s.isGM);
	const activeTool = useVTTStore((s) => s.activeTool);
	const wallKind = useVTTStore((s) => s.wallKind);
	const setWallKind = useVTTStore((s) => s.setWallKind);
	const setActiveTool = useVTTStore((s) => s.setActiveTool);
	const walls = useVTTStore((s) => s.walls);
	const selectedIds = useVTTStore((s) => s.selectedWallIds);

	if (!isGM || activeTool !== "wall") return null;

	const selected = walls.filter((w) => selectedIds.includes(w.id));
	const hasPlain = selected.some((w) => !isDoor(w));
	const hasDoor = selected.some(isDoor);

	return (
		<VTTOptionsBar
			label="Paredes e portas"
			icon={BrickWall}
			closeLabel="Fechar ferramenta de paredes"
			onClose={() => setActiveTool("select")}
			wrapOnPhone
			footer={
				<p className="pointer-events-none flex flex-wrap items-center justify-center gap-x-3 gap-y-1 self-center rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
					<span>Clique marca um ponto</span>
					<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
						<Kbd>Duplo clique</Kbd> ou <Kbd>Enter</Kbd> termina
					</span>
					<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
						<Kbd>⌫</Kbd> volta um ponto
					</span>
					<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
						<Kbd>Delete</Kbd> apaga a seleção
					</span>
				</p>
			}
		>
			<VTTSegmented legend="O que desenhar" className="max-sm:w-full">
				{KINDS.map((kind) => (
					<button
						type="button"
						key={kind.id}
						title={kind.hint}
						aria-pressed={wallKind === kind.id}
						onClick={() => setWallKind(kind.id)}
						className={cn(segmentClass(wallKind === kind.id), "max-sm:flex-1")}
					>
						{kind.label}
					</button>
				))}
			</VTTSegmented>
			{selected.length > 0 ? (
				<>
					<VTTOptionsDivider className="max-sm:hidden" />
					<output
						aria-live="polite"
						className="shrink-0 px-1.5 text-xs tabular-nums text-foreground"
					>
						{selected.length === 1
							? "1 selecionada"
							: `${selected.length} selecionadas`}
					</output>
					{hasPlain ? (
						<button
							type="button"
							className={actionClass}
							onClick={() => void setWallsKind(selectedIds, "door")}
						>
							<DoorOpen aria-hidden className="size-4" />
							Virar porta
						</button>
					) : null}
					{hasDoor ? (
						<button
							type="button"
							className={actionClass}
							onClick={() => void setWallsKind(selectedIds, "wall")}
						>
							<BrickWall aria-hidden className="size-4" />
							Virar parede
						</button>
					) : null}
					<button
						type="button"
						aria-label="Apagar selecionadas"
						title="Apagar selecionadas"
						className={actionClass}
						onClick={deleteSelectedWalls}
					>
						<Trash2 aria-hidden className="size-4" />
						Apagar
					</button>
				</>
			) : null}
		</VTTOptionsBar>
	);
}
