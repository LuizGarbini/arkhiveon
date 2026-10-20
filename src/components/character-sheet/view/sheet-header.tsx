import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRightLeft,
	BookOpen,
	Camera,
	Download,
	Edit,
	LockKeyhole,
	MoreHorizontal,
	Pencil,
	User,
} from "lucide-react";
import { FramedImage } from "@/components/framed-image";
import { EntityImageViewer } from "@/components/images/entity-image-viewer";
import { CrisImportDialog } from "@/components/ordem/cris-import-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatModifier } from "@/core/rules";
import type { Character } from "@/lib/store";
import { systemLabel } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import type { TableResources } from "@/lib/table-resources";
import { useCombatStats } from "../use-linked-items";
import { TableResourcesStrip } from "./table-resources-strip";
import { QuickStat } from "./ui-primitives";

export interface SheetHeaderProps {
	character: Character;
	config: SystemConfig;
	characterImageUrl?: string;
	isImageHidden?: boolean;
	isViewer?: boolean;
	isEditingLayout?: boolean;
	effectiveHealthMax: number;
	onOpenImageDialog: () => void;
	onOpenNameDialog: () => void;
	onOpenTransferDialog: () => void;
	onOpenExportDialog: () => void;
	onToggleEditLayout: () => void;
	onUpdateTableResources?: (next: TableResources) => void;
}

/**
 * Cabeçalho da ficha (F1): voltar → identidade (retrato, sistema, nome,
 * resumo, jogador) → ação primária + menu "⋯" → faixa de status.
 * Uma só hierarquia: o nome é o maior texto da página.
 */
export function SheetHeader({
	character,
	config,
	characterImageUrl,
	isImageHidden,
	isViewer,
	isEditingLayout,
	effectiveHealthMax,
	onOpenImageDialog,
	onOpenNameDialog,
	onOpenTransferDialog,
	onOpenExportDialog,
	onToggleEditLayout,
	onUpdateTableResources,
}: SheetHeaderProps) {
	// Mesmo valor efetivo do MetricCard (itens vinculados No Corpo).
	const combat = useCombatStats(character);
	const summary =
		[
			character.race,
			character.class,
			character.level ? `Nível ${character.level}` : null,
		]
			.filter(Boolean)
			.join(" · ") || config.tagline;

	return (
		<header
			data-slot="sheet-header"
			className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-xl shadow-black/5 sm:p-6"
		>
			<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

			<Link
				to="/characters"
				className="relative -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
			>
				<ArrowLeft className="h-3.5 w-3.5" />
				Personagens
			</Link>

			<div className="relative mt-2 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex min-w-0 items-center gap-4 sm:gap-5">
					<div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-border/70 sm:h-24 sm:w-24">
						{characterImageUrl ? (
							<FramedImage
								src={characterImageUrl}
								alt={character.characterName}
								framing={character}
							/>
						) : isImageHidden ? (
							<LockKeyhole
								className="h-8 w-8 text-primary/40"
								strokeWidth={1.4}
							/>
						) : (
							<User className="h-8 w-8 text-primary/40" strokeWidth={1.4} />
						)}
						{characterImageUrl ? (
							<EntityImageViewer
								src={characterImageUrl}
								name={character.characterName}
								canEdit={!isViewer}
								onEdit={onOpenImageDialog}
							/>
						) : (
							!isViewer && (
								<button
									type="button"
									onClick={onOpenImageDialog}
									className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/20 text-white opacity-100 transition hover:bg-black/40 focus:outline-none"
									aria-label="Alterar imagem do personagem"
								>
									<Camera className="h-5 w-5 drop-shadow" />
								</button>
							)
						)}
					</div>

					<div className="min-w-0 flex-1">
						<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
							{systemLabel(character.system)}
						</p>
						<div className="flex min-w-0 items-center gap-1">
							<h1 className="truncate font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
								{character.characterName}
							</h1>
							{!isViewer && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={onOpenNameDialog}
									className="min-h-[44px] min-w-[44px] shrink-0 text-muted-foreground hover:text-foreground"
									aria-label="Renomear personagem"
									title="Renomear personagem"
								>
									<Pencil className="h-4 w-4" />
								</Button>
							)}
						</div>
						<p className="truncate text-sm text-muted-foreground">{summary}</p>
						{character.playerName && (
							<p className="mt-0.5 truncate text-xs text-muted-foreground">
								Jogador:{" "}
								<span className="font-medium text-foreground/90">
									{character.playerName}
								</span>
							</p>
						)}
					</div>
				</div>

				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{character.system === "ordem" && (
						<>
							<CrisImportDialog />
							<Link
								to="/arquivos-secretos"
								className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border/80 bg-background/65 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-primary/10 hover:text-primary"
							>
								<BookOpen className="h-4 w-4 text-primary" />
								Arquivos Secretos
							</Link>
						</>
					)}
					{isViewer ? (
						<Button
							type="button"
							disabled
							title="Sem permissão para editar layout"
							className="min-h-[44px] flex-1 gap-2 sm:flex-none"
						>
							<Edit className="h-4 w-4" />
							Editar layout
						</Button>
					) : (
						<Button
							type="button"
							onClick={onToggleEditLayout}
							className="min-h-[44px] flex-1 gap-2 sm:flex-none"
						>
							<Edit className="h-4 w-4" />
							{isEditingLayout ? "Concluir layout" : "Editar layout"}
						</Button>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="min-h-[44px] min-w-[44px]"
									aria-label="Mais ações da ficha"
								/>
							}
						>
							<MoreHorizontal className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							{!isViewer && (
								<DropdownMenuItem
									onClick={onOpenImageDialog}
									className="min-h-[44px] md:min-h-9"
								>
									<Camera />
									Alterar imagem
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								onClick={onOpenTransferDialog}
								className="min-h-[44px] md:min-h-9"
							>
								<ArrowRightLeft />
								Transferir
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={onOpenExportDialog}
								className="min-h-[44px] md:min-h-9"
							>
								<Download />
								Exportar PDF
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<dl className="relative mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 sm:grid-cols-4">
				<QuickStat
					label="PV"
					value={`${character.health}/${effectiveHealthMax}`}
					color="text-rose-400"
				/>
				<QuickStat
					label="CA"
					value={String(combat.ac.total)}
					color="text-blue-400"
				/>
				<QuickStat
					label="INIT"
					value={formatModifier(combat.initiative.total)}
					color="text-amber-400"
				/>
				<QuickStat
					label="MOV"
					value={`${character.speed}${config.speedUnit}`}
					color="text-emerald-400"
				/>
			</dl>

			{onUpdateTableResources && (
				<TableResourcesStrip
					value={character.tableResources}
					readOnly={isViewer}
					onChange={onUpdateTableResources}
				/>
			)}
		</header>
	);
}
