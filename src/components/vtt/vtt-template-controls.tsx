import {
	Circle,
	Eraser,
	Hexagon,
	Square,
	Trash2,
	Triangle,
	Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import { useId, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	segmentClass,
	VTTOptionsBar,
	VTTOptionsDivider,
	VTTSegmented,
} from "@/components/vtt/vtt-options-bar";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/vtt/ruler-path";
import {
	listedSpellTemplates,
	spellTemplateOwnerName,
	spellTemplateTitle,
	type VTTSpellTemplate,
	type VTTTemplateKind,
} from "@/lib/vtt/template-math";
import {
	canRemoveSpellTemplate,
	templateIdsToClear,
} from "@/lib/vtt/template-permissions";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const KINDS: {
	id: VTTTemplateKind;
	label: string;
	hint: string;
	icon: ComponentType<{ className?: string }>;
	iconClass?: string;
}[] = [
	{
		id: "cone15",
		label: "Cone 15°",
		hint: "Sopro estreito",
		icon: Triangle,
		iconClass: "scale-x-50",
	},
	{ id: "cone60", label: "Cone 60°", hint: "Cone clássico", icon: Triangle },
	{ id: "sphere", label: "Esfera", hint: "Raio esférico", icon: Circle },
	{
		id: "line",
		label: "Linha",
		hint: "Relâmpago, 1 casa de largura",
		icon: Zap,
	},
	{ id: "cube", label: "Cubo", hint: "Área quadrada", icon: Square },
];

/** Alcances comuns em casas (1,5 m: 3 · 4,5 · 6 · 9 · 18 m). */
const SIZE_CELLS = [2, 3, 4, 6, 12];

export function VTTTemplateControls({
	onClearTemplates,
	onRemoveTemplates,
}: {
	onClearTemplates: (ids: string[]) => void;
	onRemoveTemplates?: (ids: string[]) => void;
}) {
	const { user } = useAuth();
	const spellNameId = useId();
	const activeTool = useVTTStore((s) => s.activeTool);
	const showTemplateControls = useVTTStore((s) => s.showTemplateControls);
	const setShowTemplateControls = useVTTStore((s) => s.setShowTemplateControls);
	const setActiveTool = useVTTStore((s) => s.setActiveTool);
	const activeTemplateKind = useVTTStore((s) => s.activeTemplateKind);
	const setActiveTemplateKind = useVTTStore((s) => s.setActiveTemplateKind);
	const templateSizeCells = useVTTStore((s) => s.templateSizeCells);
	const setTemplateSizeCells = useVTTStore((s) => s.setTemplateSizeCells);
	const templateSpellName = useVTTStore((s) => s.templateSpellName);
	const setTemplateSpellName = useVTTStore((s) => s.setTemplateSpellName);
	const clearPlacedTemplates = useVTTStore((s) => s.clearPlacedTemplates);
	const removeTemplatesByIds = useVTTStore((s) => s.removeTemplatesByIds);
	const placedTemplates = useVTTStore((s) => s.placedTemplates);
	const remoteTemplates = useVTTStore((s) => s.remoteTemplates);
	const selectedTemplateId = useVTTStore((s) => s.selectedTemplateId);
	const setSelectedTemplateId = useVTTStore((s) => s.setSelectedTemplateId);
	const isGM = useVTTStore((s) => s.isGM);
	const isCoGM = useVTTStore((s) => s.isCoGM);
	const scenes = useVTTStore((s) => s.scenes);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const scene = scenes.find((s) => s.id === activeSceneId);
	const listed = useMemo(
		() => listedSpellTemplates(placedTemplates, remoteTemplates),
		[placedTemplates, remoteTemplates],
	);
	const placedIds = useMemo(
		() => new Set(placedTemplates.map((template) => template.id)),
		[placedTemplates],
	);
	const clearIds = useMemo(
		() =>
			templateIdsToClear(
				{ isGM, isCoGM },
				placedTemplates,
				Object.keys(remoteTemplates),
			),
		[isGM, isCoGM, placedTemplates, remoteTemplates],
	);

	if (!showTemplateControls) return null;

	const scale = scene?.gridScaleDistance ?? 1.5;
	const unit = scene?.gridScaleUnit ?? "m";
	const actor = { userId: user?.id, isGM, isCoGM };
	const handleClose = () => {
		setShowTemplateControls(false);
		if (activeTool === "template") setActiveTool("select");
	};
	const removeOne = (template: VTTSpellTemplate) => {
		if (
			!canRemoveSpellTemplate(actor, template, {
				unownedBelongsTo: placedIds.has(template.id) ? actor.userId : null,
			})
		)
			return;
		onRemoveTemplates?.([template.id]);
		removeTemplatesByIds([template.id]);
	};

	return (
		<VTTOptionsBar
			label="Moldes"
			icon={Hexagon}
			closeLabel="Fechar moldes de magia"
			onClose={handleClose}
			footer={
				<div className="flex w-full min-w-0 max-w-xl flex-col gap-1.5 sm:w-[32rem]">
					<form
						className="pointer-events-auto flex min-w-0 items-center gap-1 rounded-2xl border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur-md"
						onSubmit={(event) => {
							event.preventDefault();
							setActiveTool("template");
						}}
					>
						<label
							htmlFor={spellNameId}
							className="shrink-0 cursor-text px-2.5 text-xs font-medium text-muted-foreground"
						>
							Magia
						</label>
						<input
							id={spellNameId}
							type="text"
							value={templateSpellName}
							onChange={(event) => setTemplateSpellName(event.target.value)}
							placeholder="Nome da magia"
							spellCheck={false}
							autoComplete="off"
							aria-label="Nome da magia"
							className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
						/>
					</form>
					<div className="pointer-events-auto flex min-w-0 items-center gap-1 rounded-2xl border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur-md">
						<div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
							<span className="shrink-0 px-2.5 text-xs font-medium text-muted-foreground">
								Alcance
							</span>
							<VTTSegmented legend="Alcance do molde">
								<button
									type="button"
									aria-pressed={templateSizeCells === null}
									title="O arrasto define o alcance"
									onClick={() => setTemplateSizeCells(null)}
									className={segmentClass(templateSizeCells === null)}
								>
									Arrastar
								</button>
								{SIZE_CELLS.map((cells) => (
									<button
										type="button"
										key={cells}
										aria-pressed={templateSizeCells === cells}
										onClick={() => {
											setTemplateSizeCells(cells);
											setActiveTool("template");
										}}
										className={cn(
											segmentClass(templateSizeCells === cells),
											"tabular-nums",
										)}
									>
										{formatDistance(cells * scale, unit)}
									</button>
								))}
							</VTTSegmented>
						</div>
						<VTTOptionsDivider />
						<button
							type="button"
							aria-label={`Limpar moldes (${clearIds.length})`}
							onClick={() => {
								onClearTemplates(clearIds);
								if (isGM || isCoGM) removeTemplatesByIds(clearIds);
								else clearPlacedTemplates();
							}}
							disabled={clearIds.length === 0}
							className="ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
						>
							<Eraser className="size-4" />
							Limpar
							<span className="tabular-nums">({clearIds.length})</span>
						</button>
					</div>
					{listed.length > 0 ? (
						<ul
							aria-label="Moldes na mesa"
							className="pointer-events-auto flex max-h-48 w-full min-w-0 flex-col gap-1 overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur-md"
						>
							{listed.map((template) => {
								const title = spellTemplateTitle(template);
								const owner = spellTemplateOwnerName(template, user?.id);
								const allowed = canRemoveSpellTemplate(actor, template, {
									unownedBelongsTo: placedIds.has(template.id)
										? actor.userId
										: null,
								});
								const selected = selectedTemplateId === template.id;
								return (
									<li
										key={template.id}
										className="flex min-w-0 items-center gap-1"
									>
										<button
											type="button"
											aria-pressed={selected}
											onClick={() => setSelectedTemplateId(template.id)}
											className={cn(
												"flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-xl px-2.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99]",
												selected
													? "bg-primary/15 text-foreground"
													: "text-foreground [@media(hover:hover)]:hover:bg-accent",
											)}
										>
											<span className="w-full truncate text-sm font-medium">
												{title}
											</span>
											<span className="w-full truncate text-xs text-muted-foreground">
												{owner}
											</span>
										</button>
										<Button
											type="button"
											variant="ghost"
											size="icon-lg"
											aria-label={`Excluir ${title} de ${owner}`}
											title={
												allowed
													? `Excluir ${title}`
													: "Só quem colocou, o mestre ou o co-mestre pode excluir"
											}
											disabled={!allowed}
											onClick={() => removeOne(template)}
											className={cn(
												"size-11 min-h-11 min-w-11 shrink-0",
												allowed && "text-destructive",
											)}
										>
											<Trash2 />
										</Button>
									</li>
								);
							})}
						</ul>
					) : null}
				</div>
			}
		>
			<VTTSegmented legend="Forma do molde">
				{KINDS.map((kind) => {
					const Icon = kind.icon;
					const isActive = activeTemplateKind === kind.id;
					return (
						<button
							type="button"
							key={kind.id}
							title={kind.hint}
							aria-pressed={isActive}
							onClick={() => {
								setActiveTemplateKind(kind.id);
								setActiveTool("template");
							}}
							className={segmentClass(isActive)}
						>
							<Icon
								className={cn(
									"size-4",
									isActive ? "text-primary" : "",
									kind.iconClass,
								)}
							/>
							{kind.label}
						</button>
					);
				})}
			</VTTSegmented>
		</VTTOptionsBar>
	);
}
