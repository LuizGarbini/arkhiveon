import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRightLeft,
	BookOpen,
	Camera,
	Download,
	Edit,
	LockKeyhole,
	User,
} from "lucide-react";
import { FramedImage } from "@/components/framed-image";
import { CrisImportDialog } from "@/components/ordem/cris-import-dialog";
import { Button } from "@/components/ui/button";
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
	return (
		<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5">
			<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
			<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="min-w-0 lg:max-w-[65%]">
					<Link
						to="/characters"
						className="inline-flex min-h-[44px] items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para personagens
					</Link>
					<div className="mt-2 flex items-start gap-4">
						<div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-fuchsia-500/10 to-transparent ring-1 ring-border/70">
							{characterImageUrl ? (
								<FramedImage
									src={characterImageUrl}
									alt={character.characterName}
									framing={character}
								/>
							) : isImageHidden ? (
								<LockKeyhole
									className="h-7 w-7 text-primary/40"
									strokeWidth={1.4}
								/>
							) : (
								<User className="h-7 w-7 text-primary/40" strokeWidth={1.4} />
							)}
							{isViewer ? (
								<div className="group/tooltip absolute inset-0">
									<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
										Sem permissão para alterar imagem
									</div>
									<button
										type="button"
										disabled
										className="absolute inset-0 flex cursor-not-allowed items-center justify-center text-white transition bg-black/0 opacity-0"
										aria-label="Editar imagem da ficha"
									>
										<Camera className="h-5 w-5 drop-shadow" />
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={onOpenImageDialog}
									className={`absolute inset-0 flex items-center justify-center text-white transition focus:outline-none cursor-pointer ${
										characterImageUrl
											? "bg-black/0 opacity-0 hover:bg-black/50 hover:opacity-100 focus:bg-black/50 focus:opacity-100"
											: "bg-black/20 opacity-100 hover:bg-black/40"
									}`}
									aria-label="Alterar imagem do personagem"
								>
									<Camera className="h-5 w-5 drop-shadow" />
								</button>
							)}
						</div>

						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
									{systemLabel(character.system)}
								</span>
								{character.playerName && (
									<span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
										Jogador: {character.playerName}
									</span>
								)}
							</div>
							<div className="mt-1 flex items-center gap-2">
								<h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl truncate">
									{character.characterName}
								</h1>
								{!isViewer && (
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										onClick={onOpenNameDialog}
										className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center"
										title="Renomear personagem"
									>
										<Edit className="h-4 w-4" />
									</Button>
								)}
							</div>
							<p className="mt-1 text-[13px] text-muted-foreground truncate">
								{[
									character.race,
									character.class,
									character.level ? `Nível ${character.level}` : null,
								]
									.filter(Boolean)
									.join(" · ") || config.tagline}
							</p>
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{character.system === "ordem" && (
						<>
							<CrisImportDialog />
							<Link
								to="/arquivos-secretos"
								className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border/80 bg-background/65 px-3 py-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
							>
								<BookOpen className="h-4 w-4 text-primary" />
								Arquivos Secretos
							</Link>
						</>
					)}
					<Button
						type="button"
						variant="outline"
						onClick={onOpenImageDialog}
						className="min-h-[44px] gap-2 cursor-pointer"
					>
						<Camera className="h-4 w-4" />
						Imagem
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onOpenTransferDialog}
						className="min-h-[44px] gap-2 cursor-pointer"
					>
						<ArrowRightLeft className="h-4 w-4" />
						Transferir
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onOpenExportDialog}
						className="min-h-[44px] gap-2 cursor-pointer"
					>
						<Download className="h-4 w-4" />
						Exportar PDF
					</Button>
					{isViewer ? (
						<div className="group/tooltip relative inline-block">
							<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
								Sem permissão para editar layout
							</div>
							<Button
								type="button"
								disabled
								className="min-h-[44px] gap-2 cursor-not-allowed opacity-50"
							>
								<Edit className="h-4 w-4" />
								Editar layout
							</Button>
						</div>
					) : (
						<Button
							type="button"
							onClick={onToggleEditLayout}
							className="min-h-[44px] gap-2 cursor-pointer"
						>
							<Edit className="h-4 w-4" />
							{isEditingLayout ? "Concluir layout" : "Editar layout"}
						</Button>
					)}
				</div>
			</div>

			<div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
			</div>

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
