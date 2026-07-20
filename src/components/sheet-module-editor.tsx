import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	applyModuleDrag,
	isCustomSheetModule,
	normalizeModuleOrders,
	SHEET_MODULE_LABELS,
} from "@/lib/sheet-modules";
import {
	type SheetModuleConfig,
	type SheetModuleKind,
	useActiveCampaignRole,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const MODULE_HINTS: Partial<Record<SheetModuleKind, string>> = {
	identity: "Nome, raça, classe, aparência",
	abilities: "Atributos, perícias e salvaguardas",
	combat: "PV, CA, iniciativa e deslocamento",
	sanity: "Sanidade e recursos do sistema",
	magic: "Magias, slots e conjuração",
	inventory: "Equipamento e moedas",
	personality: "Traços, ideais, vínculos e defeitos",
	notes: "Anotações livres do jogador",
	customText: "Texto livre personalizado",
	customStats: "Bloco numérico personalizado",
	custom_template_fields: "Campos do template customizado",
};

type SheetModuleEditorProps = {
	modules: SheetModuleConfig[];
	mode?: "view" | "layout";
	onChange?: (modules: SheetModuleConfig[]) => void;
	onAddCustom?: (kind: "customText" | "customStats") => void;
	renderBlockContent?: (module: SheetModuleConfig) => ReactNode;
	onEditBlock?: (module: SheetModuleConfig) => void;
	className?: string;
};

export function SheetModuleEditor({
	modules,
	mode = "layout",
	onChange,
	onAddCustom,
	renderBlockContent,
	onEditBlock,
	className,
}: SheetModuleEditorProps) {
	const isLayoutMode = mode === "layout";
	const [activeId, setActiveId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 120, tolerance: 6 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const sortedModules = useMemo(
		() => normalizeModuleOrders(modules),
		[modules],
	);
	const visibleModules = isLayoutMode
		? sortedModules
		: sortedModules.filter((module) => module.enabled);
	const mainModules = visibleModules.filter(
		(module) => module.column !== "side",
	);
	const sideModules = visibleModules.filter(
		(module) => module.column === "side",
	);
	const activeModule =
		sortedModules.find((module) => module.id === activeId) ?? null;

	function patchModule(moduleId: string, patch: Partial<SheetModuleConfig>) {
		onChange?.(
			normalizeModuleOrders(
				modules.map((module) =>
					module.id === moduleId ? { ...module, ...patch } : module,
				),
			),
		);
	}

	function removeModule(moduleId: string) {
		onChange?.(
			normalizeModuleOrders(modules.filter((module) => module.id !== moduleId)),
		);
	}

	function handleDragStart(event: DragStartEvent) {
		setActiveId(String(event.active.id));
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveId(null);
		if (!over || active.id === over.id || !onChange) return;
		onChange(applyModuleDrag(modules, String(active.id), String(over.id)));
	}

	function handleDragCancel() {
		setActiveId(null);
	}

	const canvas = (
		<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
			<LayoutColumn
				droppableId="column-main"
				label="Coluna principal"
				modules={mainModules}
				isLayoutMode={isLayoutMode}
				onPatch={patchModule}
				onRemove={removeModule}
				renderBlockContent={renderBlockContent}
				onEditBlock={onEditBlock}
			/>
			<LayoutColumn
				droppableId="column-side"
				label="Coluna lateral"
				modules={sideModules}
				isLayoutMode={isLayoutMode}
				onPatch={patchModule}
				onRemove={removeModule}
				renderBlockContent={renderBlockContent}
				onEditBlock={onEditBlock}
			/>
		</div>
	);

	if (!isLayoutMode) {
		return <div className={className}>{canvas}</div>;
	}

	return (
		<div className={cn("space-y-5", className)}>
			<div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-[12px] font-bold text-foreground">
						Monte a ficha em blocos
					</p>
					<p className="mt-1 text-[11px] text-muted-foreground">
						Este é o layout real da ficha. Arraste os blocos, oculte o que não
						usar e adicione novos módulos.
					</p>
				</div>
				{onAddCustom ? (
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-2 bg-background/80"
							onClick={() => onAddCustom("customText")}
						>
							<Plus className="h-3.5 w-3.5" />
							Bloco de texto
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-2 bg-background/80"
							onClick={() => onAddCustom("customStats")}
						>
							<Plus className="h-3.5 w-3.5" />
							Bloco de stats
						</Button>
					</div>
				) : null}
			</div>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
			>
				{canvas}
				<DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
					{activeModule ? (
						<SheetBlock
							module={activeModule}
							isOverlay
							isLayoutMode
							renderBlockContent={renderBlockContent}
						/>
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
}

function LayoutColumn({
	droppableId,
	label,
	modules,
	isLayoutMode,
	onPatch,
	onRemove,
	renderBlockContent,
	onEditBlock,
}: {
	droppableId: "column-main" | "column-side";
	label: string;
	modules: SheetModuleConfig[];
	isLayoutMode: boolean;
	onPatch: (moduleId: string, patch: Partial<SheetModuleConfig>) => void;
	onRemove: (moduleId: string) => void;
	renderBlockContent?: (module: SheetModuleConfig) => ReactNode;
	onEditBlock?: (module: SheetModuleConfig) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: droppableId });
	const ColumnTag = droppableId === "column-main" ? "main" : "aside";

	return (
		<ColumnTag
			ref={setNodeRef}
			className={cn(
				"grid content-start gap-5 rounded-2xl transition-colors duration-150",
				isLayoutMode && "min-h-[280px] p-2",
				isLayoutMode &&
					(isOver
						? "bg-primary/5 ring-2 ring-primary/25 ring-inset"
						: "ring-1 ring-border/50 ring-inset"),
			)}
		>
			{isLayoutMode ? (
				<p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
					{label}
				</p>
			) : null}

			<SortableContext
				items={modules.map((module) => module.id)}
				strategy={verticalListSortingStrategy}
				disabled={!isLayoutMode}
			>
				{modules.length === 0 ? (
					<div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/30 px-4 text-center text-[11px] text-muted-foreground">
						{isLayoutMode
							? "Arraste blocos para cá"
							: "Nenhum bloco nesta coluna"}
					</div>
				) : (
					modules.map((module) => (
						<SortableSheetBlock
							key={module.id}
							module={module}
							isLayoutMode={isLayoutMode}
							onPatch={onPatch}
							onRemove={onRemove}
							renderBlockContent={renderBlockContent}
							onEditBlock={onEditBlock}
						/>
					))
				)}
			</SortableContext>
		</ColumnTag>
	);
}

function SortableSheetBlock({
	module,
	isLayoutMode,
	onPatch,
	onRemove,
	renderBlockContent,
	onEditBlock,
}: {
	module: SheetModuleConfig;
	isLayoutMode: boolean;
	onPatch: (moduleId: string, patch: Partial<SheetModuleConfig>) => void;
	onRemove: (moduleId: string) => void;
	renderBlockContent?: (module: SheetModuleConfig) => ReactNode;
	onEditBlock?: (module: SheetModuleConfig) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: module.id, disabled: !isLayoutMode });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(isDragging && "opacity-40")}
		>
			<SheetBlock
				module={module}
				isLayoutMode={isLayoutMode}
				dragHandleProps={{ ...attributes, ...listeners }}
				onPatch={onPatch}
				onRemove={onRemove}
				renderBlockContent={renderBlockContent}
				onEditBlock={onEditBlock}
			/>
		</div>
	);
}

function SheetBlock({
	module,
	isLayoutMode,
	dragHandleProps,
	onPatch,
	onRemove,
	renderBlockContent,
	onEditBlock,
	isOverlay = false,
}: {
	module: SheetModuleConfig;
	isLayoutMode: boolean;
	dragHandleProps?: Record<string, unknown>;
	onPatch?: (moduleId: string, patch: Partial<SheetModuleConfig>) => void;
	onRemove?: (moduleId: string) => void;
	renderBlockContent?: (module: SheetModuleConfig) => ReactNode;
	onEditBlock?: (module: SheetModuleConfig) => void;
	isOverlay?: boolean;
}) {
	const canRemove = isCustomSheetModule(module);
	const hint = MODULE_HINTS[module.kind];
	const activeCampaignRole = useActiveCampaignRole();
	const isViewer = activeCampaignRole === "viewer";

	return (
		<section
			className={cn(
				"group relative rounded-2xl border bg-card/80 p-5 shadow-sm shadow-black/5 transition-all",
				module.enabled
					? "border-border/70"
					: "border-dashed border-border/60 opacity-60",
				isLayoutMode && "ring-1 ring-primary/10 hover:ring-primary/25",
				isOverlay &&
					"rotate-1 scale-[1.02] border-primary/30 shadow-xl shadow-primary/10",
			)}
		>
			{isLayoutMode && !isViewer ? (
				<button
					type="button"
					className="absolute left-3 top-3 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-border/70 bg-background/90 text-muted-foreground opacity-0 transition-all hover:text-foreground active:cursor-grabbing group-hover:opacity-100 focus:opacity-100"
					aria-label={`Reordenar ${module.title}`}
					{...(dragHandleProps ?? {})}
				>
					<GripVertical className="h-4 w-4" />
				</button>
			) : null}

			<div
				className={cn(
					"mb-4 flex items-start justify-between gap-3",
					isLayoutMode && "pl-10",
				)}
			>
				<div className="min-w-0">
					<p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
						{SHEET_MODULE_LABELS[module.kind]}
					</p>
					<h2 className="font-display mt-1 text-xl font-bold text-foreground">
						{isCustomSheetModule(module)
							? module.title
							: SHEET_MODULE_LABELS[module.kind]}
					</h2>
					{isLayoutMode && hint ? (
						<p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
					) : null}
				</div>

				<div className="flex shrink-0 items-center gap-1">
					{isLayoutMode && onPatch && !isViewer ? (
						<>
							<button
								type="button"
								onClick={() => onPatch(module.id, { enabled: !module.enabled })}
								className={cn(
									"flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
									module.enabled
										? "border-primary/20 bg-primary/10 text-primary"
										: "border-border/70 text-muted-foreground hover:text-foreground",
								)}
								aria-label={module.enabled ? "Ocultar bloco" : "Exibir bloco"}
								title={module.enabled ? "Visível na ficha" : "Oculto na ficha"}
							>
								{module.enabled ? (
									<Eye className="h-3.5 w-3.5" />
								) : (
									<EyeOff className="h-3.5 w-3.5" />
								)}
							</button>
							{canRemove && onRemove ? (
								<button
									type="button"
									onClick={() => onRemove(module.id)}
									className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
									aria-label={`Remover ${module.title}`}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							) : null}
						</>
					) : null}
					{onEditBlock && module.enabled ? (
						isViewer ? (
							<div className="group/tooltip relative inline-block">
								<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
									Sem permissão para editar
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled
									className="gap-2 cursor-not-allowed opacity-50"
								>
									<Edit className="h-3.5 w-3.5" />
									Editar
								</Button>
							</div>
						) : (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => onEditBlock(module)}
								className="gap-2"
							>
								<Edit className="h-3.5 w-3.5" />
								Editar
							</Button>
						)
					) : null}
				</div>
			</div>

			{renderBlockContent ? (
				<div className={cn(!module.enabled && "pointer-events-none")}>
					{renderBlockContent(module)}
				</div>
			) : (
				<ModuleBlockPlaceholder module={module} />
			)}
		</section>
	);
}

function ModuleBlockPlaceholder({ module }: { module: SheetModuleConfig }) {
	const hint = MODULE_HINTS[module.kind] ?? "Conteúdo deste bloco";

	if (module.kind === "customText" || module.kind === "customStats") {
		return (
			<div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-6 text-[12px] leading-relaxed text-muted-foreground">
				{module.content?.trim() ||
					"Bloco vazio — preencha depois de criar a ficha."}
			</div>
		);
	}

	if (module.kind === "abilities") {
		return (
			<div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
				{["FOR", "DES", "CON", "INT", "SAB", "CAR"].map((label) => (
					<div
						key={label}
						className="rounded-xl border border-border/60 bg-background/40 px-2 py-3 text-center"
					>
						<p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
							{label}
						</p>
						<p className="font-display mt-1 text-2xl font-bold text-foreground/30">
							—
						</p>
					</div>
				))}
			</div>
		);
	}

	if (module.kind === "combat") {
		return (
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{["PV", "CA", "Init", "Desloc."].map((label) => (
					<div
						key={label}
						className="rounded-xl border border-border/60 bg-background/40 px-3 py-2"
					>
						<p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
							{label}
						</p>
						<p className="mt-1 text-[13px] font-bold text-foreground/30">—</p>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-[12px] text-muted-foreground">
			{hint}
		</div>
	);
}
