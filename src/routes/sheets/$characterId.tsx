import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRightLeft,
	BookOpen,
	Camera,
	ChevronDown,
	ChevronUp,
	Download,
	Edit,
	Eye,
	FileText,
	Heart,
	LockKeyhole,
	Shield,
	Sparkles,
	User,
	Zap,
} from "lucide-react";
import {
	type ComponentType,
	type FormEvent,
	lazy,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useForm } from "react-hook-form";

const CharacterExportDialog = lazy(() =>
	import("@/components/character-export-dialog").then((module) => ({
		default: module.CharacterExportDialog,
	})),
);

import { CharacterTrainingFields } from "@/components/character-training-fields";

import {
	buildCharacterFormDefaults,
	type CharacterFormValues,
	CharacterModuleFields,
	sanitizeCharacterFormValues,
	SkillsFields,
} from "@/components/character-sheet-fields";
import { CharacterTransferDialog } from "@/components/character-transfer-dialog";
import { CustomSheetRenderer } from "@/components/custom-sheet-renderer";
import { EntityImageDialog } from "@/components/entity-image-dialog";
import { FramedImage } from "@/components/framed-image";
import { CrisImportDialog } from "@/components/ordem/cris-import-dialog";
import { SaveSheetLayoutPanel } from "@/components/save-sheet-layout-panel";
import { SheetModuleEditor } from "@/components/sheet-module-editor";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FormTabs } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDocumentMetadata } from "@/hooks/use-document-metadata";
import {
	isCharacterImageHidden,
	resolveCharacterImageUrl,
} from "@/lib/character-images";
import {
	createCustomSheetModule,
	isCustomSheetModule,
	normalizeModuleOrders,
	normalizeSheetLayout,
	SHEET_MODULE_LABELS,
} from "@/lib/sheet-modules";
import {
	type Character,
	type Feat,
	formatModifier,
	getAttributeExtraInfo,
	getAttributeFullName,
	type SheetLayoutConfig,
	type SheetModuleConfig,
	type SheetModuleKind,
	type Spell,
	systemLabel,
	useActiveCampaignId,
	useActiveCampaignRole,
	useImageAssetLookup,
	useRPGStore,
} from "@/lib/store";
import { getFeatsLabel, SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sheets/$characterId")({
	validateSearch: (search: Record<string, unknown>): { edit?: boolean } => {
		return {
			edit: search.edit === true || search.edit === "true" || undefined,
		};
	},
	component: CharacterSheetPage,
});

const headerSkeletonKeys = ["stat-1", "stat-2", "stat-3", "stat-4"];
const moduleSkeletonKeys = [
	"module-1",
	"module-2",
	"module-3",
	"module-4",
	"module-5",
	"module-6",
];

function CharacterSheetPage() {
	const { characterId } = Route.useParams();
	const { edit } = Route.useSearch();
	const character = useRPGStore((state) =>
		state.characters.find((item) => item.id === characterId),
	);

	useDocumentMetadata(
		character ? `${character.characterName} - Arkhiveon` : "Ficha - Arkhiveon",
		"",
		false,
	);
	const isLoading = useRPGStore((state) => state.isLoadingRemote);
	const updateCharacter = useRPGStore((state) => state.updateCharacter);
	const imageAssetLookup = useImageAssetLookup();
	const activeCampaignRole = useActiveCampaignRole();
	const activeCampaignId = useActiveCampaignId();
	const isViewer = activeCampaignRole === "viewer";
	const [isEditingLayout, setIsEditingLayout] = useState(edit || false);
	const [editingModule, setEditingModule] = useState<SheetModuleConfig | null>(
		null,
	);
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
	const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
	const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
	const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

	if (isLoading) {
		return (
			<div className="w-full">
				<div className="border-b border-white/5 bg-card/30 p-8 space-y-6">
					<div className="flex items-start gap-4">
						<Skeleton className="h-14 w-14 rounded-xl" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-6 w-48" />
							<div className="flex gap-2">
								<Skeleton className="h-4 w-20 rounded" />
								<Skeleton className="h-4 w-20 rounded" />
							</div>
						</div>
						<div className="flex gap-3">
							<Skeleton className="h-10 w-12 rounded-lg" />
							<Skeleton className="h-10 w-12 rounded-lg" />
						</div>
					</div>
					<div className="grid grid-cols-4 gap-2">
						{headerSkeletonKeys.map((key) => (
							<Skeleton key={key} className="h-12 w-full rounded-lg" />
						))}
					</div>
				</div>
				<div className="px-6 py-6 space-y-8">
					<div className="grid grid-cols-3 gap-2">
						{moduleSkeletonKeys.map((key) => (
							<Skeleton key={key} className="h-24 w-full rounded-lg" />
						))}
					</div>
					<div className="space-y-4">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-24 w-full rounded-lg" />
					</div>
				</div>
			</div>
		);
	}

	if (!character) {
		return (
			<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<User className="h-16 w-16 text-muted-foreground/30" />
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Personagem não encontrado
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Essa ficha pode ter sido removida ou ainda não sincronizou.
					</p>
				</div>
				<Link to="/characters">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para Personagens
					</Button>
				</Link>
			</div>
		);
	}

	const currentCharacter = character;
	const hasTough = currentCharacter.featsList?.some(
		(f) =>
			f.name.toLowerCase() === "robusto" || f.name.toLowerCase() === "tough",
	);
	const toughBonus =
		hasTough &&
		(currentCharacter.system === "dnd5e" ||
			currentCharacter.system === "dnd2024")
			? 2 * (currentCharacter.level || 1)
			: 0;
	const effectiveHealthMax = (currentCharacter.healthMax || 0) + toughBonus;

	const characterImageUrl = resolveCharacterImageUrl(
		currentCharacter,
		imageAssetLookup,
		activeCampaignRole,
	);
	const isImageHidden = isCharacterImageHidden(
		currentCharacter,
		imageAssetLookup,
		activeCampaignRole,
	);
	const config =
		SYSTEM_CONFIG[currentCharacter.system] ?? SYSTEM_CONFIG.generic;
	const layout = normalizeSheetLayout(currentCharacter);

	function updateLayout(nextLayout: SheetLayoutConfig) {
		updateCharacter(currentCharacter.id, { sheetLayout: nextLayout });
	}

	function handleAddCustomModule(kind: "customText" | "customStats") {
		const title = window.prompt(
			kind === "customText"
				? "Digite o título para o novo Bloco de Texto:"
				: "Digite o título para o novo Bloco de Stats:",
		);
		if (title === null) return; // User cancelled
		const trimmed = title.trim();
		if (!trimmed) {
			alert("O título não pode ser vazio.");
			return;
		}
		if (
			trimmed.toLowerCase() === "novo texto livre" ||
			trimmed.toLowerCase() === "novo bloco de stats"
		) {
			alert("Por favor, digite um título personalizado e diferente do padrão.");
			return;
		}

		const nextModule = {
			...createCustomSheetModule(kind, layout.modules.length * 10 + 100),
			title: trimmed,
		};
		updateLayout({
			...layout,
			modules: normalizeModuleOrders([...layout.modules, nextModule]),
		});
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0 lg:max-w-[65%]">
						<Link
							to="/characters"
							className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Voltar para personagens
						</Link>
						<div className="mt-4 flex items-start gap-4">
							<div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-fuchsia-500/10 to-transparent ring-1 ring-border/70">
								{characterImageUrl ? (
									<FramedImage
										src={characterImageUrl}
										alt={currentCharacter.characterName}
										framing={currentCharacter}
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
										onClick={() => setIsImageDialogOpen(true)}
										className={`absolute inset-0 flex items-center justify-center text-white transition focus:outline-none ${
											characterImageUrl
												? "bg-black/0 opacity-0 hover:bg-black/50 hover:opacity-100 focus:bg-black/50 focus:opacity-100"
												: "bg-black/20 opacity-100 hover:bg-black/40"
										}`}
										aria-label="Editar imagem da ficha"
									>
										<Camera className="h-5 w-5 drop-shadow" />
									</button>
								)}
							</div>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
										<FileText className="h-3.5 w-3.5" />
										{systemLabel(currentCharacter.system)}
									</div>
									{isEditingLayout && (
										<div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 animate-pulse">
											<span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
											Modo Layout Ativo (Arraste os blocos)
										</div>
									)}
								</div>
								<div className="mt-3 flex min-w-0 items-center gap-2">
									<h1 className="font-display min-w-0 truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
										{currentCharacter.characterName || "Ficha sem nome"}
									</h1>
									{isViewer ? (
										<div className="group/tooltip relative shrink-0">
											<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
												Sem permissão para renomear
											</div>
											<Button
												type="button"
												variant="outline"
												size="icon-sm"
												disabled
												className="cursor-not-allowed opacity-50 animate-none hover:bg-transparent"
											>
												<Edit className="h-4 w-4" />
											</Button>
										</div>
									) : (
										<Button
											type="button"
											variant="outline"
											size="icon-sm"
											title="Renomear personagem"
											aria-label="Renomear personagem"
											className="shrink-0"
											onClick={() => setIsNameDialogOpen(true)}
										>
											<Edit className="h-4 w-4" />
										</Button>
									)}
								</div>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{[
										currentCharacter.title,
										currentCharacter.nickname ? `"${currentCharacter.nickname}"` : undefined,
										currentCharacter.race,
										currentCharacter.class,
										currentCharacter.subclass,
									]
										.filter(Boolean)
										.join(" · ") || config.tagline}
								</p>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{currentCharacter.system === "ordem" && (
							<>
								<CrisImportDialog />
								<Link
									to="/arquivos-secretos"
									className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/65 px-3 py-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
								>
									<BookOpen className="h-4 w-4 text-primary" />
									Arquivos Secretos
								</Link>
							</>
						)}
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsImageDialogOpen(true)}
							className="gap-2"
						>
							<Camera className="h-4 w-4" />
							Imagem
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsTransferDialogOpen(true)}
							className="gap-2"
						>
							<ArrowRightLeft className="h-4 w-4" />
							Transferir
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsExportDialogOpen(true)}
							className="gap-2"
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
									className="gap-2 cursor-not-allowed opacity-50"
								>
									<Edit className="h-4 w-4" />
									Editar layout
								</Button>
							</div>
						) : (
							<Button
								type="button"
								onClick={() => setIsEditingLayout((current) => !current)}
								className="gap-2"
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
						value={`${currentCharacter.health}/${effectiveHealthMax}`}
						color="text-rose-400"
					/>
					<QuickStat
						label="CA"
						value={String(currentCharacter.armorClass)}
						color="text-blue-400"
					/>
					<QuickStat
						label="INIT"
						value={formatModifier(currentCharacter.initiative)}
						color="text-amber-400"
					/>
					<QuickStat
						label="MOV"
						value={`${currentCharacter.speed}${config.speedUnit}`}
						color="text-emerald-400"
					/>
				</div>
			</header>

			<SheetModuleEditor
				mode={isEditingLayout ? "layout" : "view"}
				modules={layout.modules}
				onChange={
					isEditingLayout
						? (nextModules) =>
								updateLayout({
									...layout,
									modules: normalizeModuleOrders(nextModules),
								})
						: undefined
				}
				onAddCustom={isEditingLayout ? handleAddCustomModule : undefined}
				renderBlockContent={(module) => (
					<ModuleContent
						module={module}
						character={currentCharacter}
						config={config}
					/>
				)}
				onEditBlock={(module) => setEditingModule(module)}
			/>

			{isEditingLayout ? (
				<SaveSheetLayoutPanel
					baseSystem={currentCharacter.system}
					modules={layout.modules}
				/>
			) : null}

			<ModuleEditorDialog
				character={currentCharacter}
				module={editingModule}
				layout={layout}
				open={!!editingModule}
				onOpenChange={(open) => {
					if (!open) setEditingModule(null);
				}}
				onSave={(patch, values) => {
					if (!editingModule) return;
					const nextModules = layout.modules.map((module) =>
						module.id === editingModule.id ? { ...module, ...patch } : module,
					);
					updateCharacter(currentCharacter.id, {
						...sanitizeCharacterFormValues(values),
						sheetLayout: {
							...layout,
							modules: nextModules,
						},
					});
					setEditingModule(null);
				}}
			/>
			<EntityImageDialog
				open={isImageDialogOpen}
				onOpenChange={setIsImageDialogOpen}
				title="Editar imagem da ficha"
				description="Troque ou remova o avatar usado no cabecalho, nos cards e na exportacao em PDF. Ajuste o recorte antes de salvar."
				value={{
					imageUrl: currentCharacter.imageUrl ?? "",
					imageAssetId: currentCharacter.imageAssetId,
					imageFocusX: currentCharacter.imageFocusX,
					imageFocusY: currentCharacter.imageFocusY,
					imageZoom: currentCharacter.imageZoom,
				}}
				onChange={(patch) => updateCharacter(currentCharacter.id, patch)}
				folder="characters"
				campaignId={activeCampaignId ?? undefined}
				libraryName={currentCharacter.characterName}
				previewShape="circle"
			/>
			<CharacterNameDialog
				character={currentCharacter}
				open={isNameDialogOpen}
				onOpenChange={setIsNameDialogOpen}
				onSave={(characterName) =>
					updateCharacter(currentCharacter.id, { characterName })
				}
			/>
			<CharacterTransferDialog
				character={currentCharacter}
				open={isTransferDialogOpen}
				onOpenChange={setIsTransferDialogOpen}
			/>
			{isExportDialogOpen && (
				<Suspense fallback={null}>
					<CharacterExportDialog
						character={{ ...currentCharacter, imageUrl: characterImageUrl }}
						open={isExportDialogOpen}
						onOpenChange={setIsExportDialogOpen}
					/>
				</Suspense>
			)}
		</div>
	);
}

function CharacterNameDialog({
	character,
	open,
	onOpenChange,
	onSave,
}: {
	character: Character;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (characterName: string) => void;
}) {
	const [draftName, setDraftName] = useState(character.characterName ?? "");
	const canSave = draftName.trim().length > 0;

	useEffect(() => {
		if (open) setDraftName(character.characterName ?? "");
	}, [character.characterName, open]);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const characterName = draftName.trim();
		if (!characterName) return;
		onSave(characterName);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md!">
				<form onSubmit={handleSubmit} className="space-y-5">
					<DialogHeader>
						<DialogTitle className="font-display text-xl">
							Renomear personagem
						</DialogTitle>
						<DialogDescription>
							Atualize o nome exibido no cabeçalho, nos cards e na ficha.
						</DialogDescription>
					</DialogHeader>

					<Field label="Nome do personagem">
						<Input
							value={draftName}
							onChange={(event) => setDraftName(event.target.value)}
							placeholder="Ex: Lyra Cinzal"
							autoFocus
						/>
					</Field>

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={!canSave}>
							Salvar nome
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function SpellRow({ spell }: { spell: Spell }) {
	const [expanded, setExpanded] = useState(false);
	return (
		<div className="border border-border/40 rounded-lg bg-background/25 overflow-hidden transition-all">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between p-3 text-left hover:bg-background/40 transition-colors"
			>
				<div>
					<span className="font-semibold text-sm text-foreground">
						{spell.name}
					</span>
					{spell.is_homebrew && (
						<span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
							Homebrew
						</span>
					)}
					<span className="text-[11px] text-muted-foreground ml-2">
						{spell.school || "Geral"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
						{spell.casting_time || "1 ação"}
					</span>
					{expanded ? (
						<ChevronUp className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{expanded && (
				<div className="p-3 border-t border-border/40 bg-background/10 space-y-3 text-[12px] leading-relaxed">
					<div className="grid grid-cols-2 gap-2 text-muted-foreground border-b border-border/20 pb-2">
						<div>
							<span className="font-bold">Alcance: </span>
							{spell.range || "-"}
						</div>
						<div>
							<span className="font-bold">Duração: </span>
							{spell.duration || "-"}
						</div>
						<div className="col-span-2">
							<span className="font-bold">Componentes: </span>
							{spell.components || "-"}
						</div>
					</div>
					<p className="text-muted-foreground whitespace-pre-line">
						{spell.description}
					</p>
				</div>
			)}
		</div>
	);
}

function FeatRow({ feat }: { feat: Feat }) {
	const [expanded, setExpanded] = useState(false);
	return (
		<div className="border border-border/40 rounded-lg bg-background/25 overflow-hidden transition-all">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between p-3 text-left hover:bg-background/40 transition-colors"
			>
				<div>
					<span className="font-semibold text-sm text-foreground">
						{feat.name}
					</span>
					{feat.is_homebrew && (
						<span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
							Homebrew
						</span>
					)}
					<span className="text-[11px] text-muted-foreground ml-2">
						({feat.category || "Geral"})
					</span>
				</div>
				<div className="flex items-center gap-2">
					{feat.ability_increase && (
						<span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
							{feat.ability_increase}
						</span>
					)}
					{expanded ? (
						<ChevronUp className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{expanded && (
				<div className="p-3 border-t border-border/40 bg-background/10 space-y-3 text-[12px] leading-relaxed">
					<div className="grid grid-cols-2 gap-2 text-muted-foreground border-b border-border/20 pb-2">
						{feat.prerequisites && (
							<div className="col-span-2">
								<span className="font-bold">Pré-requisito: </span>
								{feat.prerequisites}
							</div>
						)}
						{feat.source && (
							<div>
								<span className="font-bold">Fonte: </span>
								{feat.source}
							</div>
						)}
					</div>
					<p className="text-muted-foreground whitespace-pre-line">
						{feat.description}
					</p>
				</div>
			)}
		</div>
	);
}

function ModuleContent({
	module,
	character,
	config,
}: {
	module: SheetModuleConfig;
	character: Character;
	config: (typeof SYSTEM_CONFIG)[keyof typeof SYSTEM_CONFIG];
}) {
	const customFields =
		config.customFields?.filter((f) => f.section === module.kind) || [];

	if (module.kind === "custom_template_fields") {
		return (
			<CustomSheetRenderer
				templateId={character.customTemplateId || character.system}
				register={() => ({}) as any}
				viewMode
				character={character}
			/>
		);
	}

	if (module.kind === "identity") {
		return (
			<div className="grid gap-3">
				<div className="grid grid-cols-2 gap-3">
					<InfoRow label="Nível" value={String(character.level || 1)} />
					<InfoRow label="XP" value={String(character.xp || 0)} />
				</div>
				<InfoRow
					label="Jogador"
					value={character.playerName || "Não informado"}
				/>
				<InfoRow label="Raça" value={character.race || "Não informada"} />
				<InfoRow label="Classe" value={character.class || "Não informada"} />
				<InfoRow
					label="Antecedente / Origem"
					value={character.background || "Não informado"}
				/>
				<InfoRow
					label="Alinhamento"
					value={character.alignment || "Não informado"}
				/>
				<TextBlock
					title="Aparência"
					value={character.appearance || "Não informada"}
				/>
			</div>
		);
	}

	if (module.kind === "abilities") {
		const isStandardKey = (key: string) =>
			[
				"strength",
				"dexterity",
				"constitution",
				"intelligence",
				"wisdom",
				"charisma",
				"power",
				"size",
				"education",
			].includes(key);

		const abilities = (config.attributes || []).map((attr) => {
			const val = isStandardKey(attr.key)
				? Number((character as any)[attr.key]) || 10
				: Number(character.systemAttributes?.[attr.key]) || 10;
			return { label: attr.label, value: val };
		});

		return (
			<div
				className={`grid gap-3 ${abilities.length >= 8 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}
			>
				{abilities.map((ability) => {
					const fullName = getAttributeFullName(ability.label);
					const extraInfo = getAttributeExtraInfo(
						ability.value,
						character.system,
					);
					return (
						<div
							key={ability.label}
							className="group/tooltip relative rounded-2xl border border-border/70 bg-background/45 py-4 px-1 text-center transition-all hover:border-primary/20 hover:bg-background/60 hover:translate-y-[-2px] hover:shadow-md hover:shadow-primary/5 cursor-default"
						>
							{/* Tooltip */}
							<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
								{fullName}
							</div>

							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								{ability.label}
							</p>
							<p className="font-display mt-1.5 text-2xl sm:text-3xl font-bold text-foreground leading-none">
								{ability.value}
							</p>
							{extraInfo && (
								<p className="font-mono text-[12px] font-bold text-primary mt-1">
									{extraInfo}
								</p>
							)}
						</div>
					);
				})}
			</div>
		);
	}

	if (module.kind === "skills") {
		return <SkillsFields character={character} config={config} />;
	}

	if (module.kind === "combat") {
		const hasTough = character.featsList?.some(
			(f) =>
				f.name.toLowerCase() === "robusto" || f.name.toLowerCase() === "tough",
		);
		const toughBonus =
			hasTough &&
			(character.system === "dnd5e" || character.system === "dnd2024")
				? 2 * (character.level || 1)
				: 0;
		const effectiveHealthMax = (character.healthMax || 0) + toughBonus;

		const hpPercent = effectiveHealthMax
			? Math.min(100, Math.round((character.health / effectiveHealthMax) * 100))
			: 0;
		return (
			<div className="grid gap-4">
				<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
					<div className="flex items-end justify-between gap-3">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Pontos de Vida
							</p>
							<p className="font-display mt-1 text-4xl font-bold text-rose-400">
								{character.health}
								<span className="text-lg text-muted-foreground">
									/{effectiveHealthMax}
								</span>
								{toughBonus > 0 && (
									<span className="text-[10px] font-bold uppercase tracking-wider text-primary ml-2 bg-primary/10 px-1.5 py-0.5 rounded">
										+{toughBonus} de Robusto
									</span>
								)}
							</p>
						</div>
						<Heart className="h-5 w-5 text-rose-400" />
					</div>
					<div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-rose-400 transition-all duration-500"
							style={{ width: `${hpPercent}%` }}
						/>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					<Metric Icon={Shield} label="CA" value={character.armorClass} />
					<Metric
						Icon={Zap}
						label="Iniciativa"
						value={formatModifier(character.initiative)}
					/>
					<Metric
						Icon={Sparkles}
						label="Deslocamento"
						value={`${character.speed}${config.speedUnit}`}
					/>
					{customFields.map((field) => (
						<Metric
							key={field.key}
							Icon={Sparkles}
							label={field.label}
							value={character.systemFields?.[field.key] || "-"}
						/>
					))}
				</div>
			</div>
		);
	}

	if (module.kind === "sanity") {
		return (
			<div className="grid gap-3 sm:grid-cols-3">
				{customFields.map((field) => (
					<Metric
						key={field.key}
						Icon={Sparkles}
						label={field.label}
						value={character.systemFields?.[field.key] || "-"}
					/>
				))}
				<Metric Icon={Eye} label="Sanidade" value={character.sanity} />
				<Metric Icon={Eye} label="Sanidade Máx." value={character.sanityMax} />
				<Metric Icon={Sparkles} label="Poder" value={character.power} />
			</div>
		);
	}

	if (module.kind === "magic") {
		const spellsList = character.spellsList || [];

		const groupedSpells: Record<number, Spell[]> = {};
		for (const spell of spellsList) {
			const lvl = spell.level;
			if (!groupedSpells[lvl]) groupedSpells[lvl] = [];
			groupedSpells[lvl].push(spell);
		}

		const formatLevelName = (lvl: number) => {
			if (lvl === 0) return "Truques";
			return `${lvl}º Círculo / Nível`;
		};

		return (
			<div className="grid gap-3">
				<div className="grid gap-3 sm:grid-cols-3">
					<Metric
						Icon={BookOpen}
						label="Classe"
						value={character.spellcastingClass || "-"}
					/>
					<Metric Icon={Shield} label="CD" value={character.spellSaveDc} />
					<Metric
						Icon={Sparkles}
						label="Ataque"
						value={formatModifier(character.spellAttackBonus)}
					/>
				</div>
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}

				<TextBlock title="Espaços" value={character.spellSlots} />

				{spellsList.length > 0 && (
					<div className="space-y-4 border-t border-border/30 pt-4 mt-2">
						<h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
							<BookOpen className="h-4 w-4 text-primary" />
							Grimório de Magias
						</h4>
						<div className="space-y-4">
							{Object.keys(groupedSpells)
								.map(Number)
								.sort((a, b) => a - b)
								.map((level) => (
									<div key={level} className="space-y-2">
										<h5 className="text-xs font-bold text-muted-foreground border-b border-border/20 pb-1">
											{formatLevelName(level)}
										</h5>
										<div className="grid gap-1.5">
											{groupedSpells[level].map((spell) => (
												<SpellRow key={spell.id} spell={spell} />
											))}
										</div>
									</div>
								))}
						</div>
					</div>
				)}

				{character.spells?.trim() && (
					<TextBlock
						title={spellsList.length > 0 ? "Magias (Legado)" : "Magias"}
						value={character.spells}
					/>
				)}
			</div>
		);
	}

	if (module.kind === "feats") {
		const featsList = character.featsList || [];
		const featsLabel = getFeatsLabel(character.system);

		return (
			<div className="grid gap-3">
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}

				{featsList.length > 0 ? (
					<div className="space-y-4">
						<h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border/20 pb-2">
							<Sparkles className="h-4 w-4 text-primary" />
							{featsLabel}
						</h4>
						<div className="grid gap-2">
							{featsList.map((feat) => (
								<FeatRow key={feat.id} feat={feat} />
							))}
						</div>
					</div>
				) : (
					<div className="rounded-xl border border-dashed border-border/60 bg-background/20 p-6 text-center text-xs text-muted-foreground">
						Nenhum(a) {featsLabel.toLowerCase()} adicionado(a) ainda.
					</div>
				)}
			</div>
		);
	}

	if (module.kind === "inventory") {
		return (
			<div className="grid gap-3">
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}
				<TextBlock title="Equipamento" value={character.equipment} />
				<TextBlock title="Moedas / Tesouro" value={character.currency} />
			</div>
		);
	}

	if (module.kind === "personality") {
		return (
			<div className="grid gap-3">
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}
				<TextBlock title="Traços" value={character.personalityTraits} />
				<TextBlock title="Ideais" value={character.ideals} />
				<TextBlock title="Vínculos" value={character.bonds} />
				<TextBlock title="Defeitos" value={character.flaws} />
			</div>
		);
	}

	if (module.kind === "notes") {
		return (
			<div className="grid gap-4">
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}
				<TextBlock title="Anotações" value={character.notes} />
				<CharacterTrainingFields
					character={character}
					onUpdateCharacter={(patch) => updateCharacter(character.id, patch)}
				/>
			</div>
		);
	}

	return (
		<TextBlock
			title={module.kind === "customStats" ? "Stats customizados" : "Conteúdo"}
			value={module.content}
		/>
	);
}

function ModuleEditorDialog({
	character,
	module,
	layout,
	open,
	onOpenChange,
	onSave,
}: {
	character: Character;
	module: SheetModuleConfig | null;
	layout: SheetLayoutConfig;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (
		patch: Partial<SheetModuleConfig>,
		values: CharacterFormValues,
	) => void;
}) {
	const form = useForm<CharacterFormValues>({
		defaultValues: buildCharacterFormDefaults(character),
	});
	const {
		register,
		control,
		setValue,
		handleSubmit,
		reset,
		formState: { errors },
	} = form;
	const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
	const [draft, setDraft] = useState<Partial<SheetModuleConfig>>({});
	const config = SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.generic;
	const [titleError, setTitleError] = useState<string | null>(null);
	const [prevIndex, setPrevIndex] = useState(-1);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);

	const validateTitle = (val: string) => {
		const trimmed = val.trim();
		if (!trimmed) {
			return "O título é obrigatório";
		}
		if (
			trimmed.toLowerCase() === "novo texto livre" ||
			trimmed.toLowerCase() === "novo bloco de stats"
		) {
			return "Por favor, digite um título personalizado e diferente do padrão";
		}
		return null;
	};

	useEffect(() => {
		if (module && open) {
			setActiveModuleId(module.id);
		}
	}, [module, open]);

	const activeModule = useMemo(() => {
		return layout.modules.find((m) => m.id === activeModuleId) || module;
	}, [layout.modules, activeModuleId, module]);

	const wasOpen = useRef(false);

	useEffect(() => {
		if (!activeModule) return;
		if (open && !wasOpen.current) {
			reset(buildCharacterFormDefaults(character));
			setDraft({
				title: activeModule.title,
				content: activeModule.content ?? "",
				enabled: activeModule.enabled,
				column: activeModule.column ?? "main",
			});
			setTitleError(null);
		}
		wasOpen.current = open;
	}, [open, character, activeModule, reset]);

	const tabs = useMemo(() => {
		return layout.modules.map((m) => ({
			id: m.id,
			label: m.title || SHEET_MODULE_LABELS[m.kind] || m.kind,
		}));
	}, [layout.modules]);

	useEffect(() => {
		if (activeModuleId) {
			const index = tabs.findIndex((t) => t.id === activeModuleId);
			if (index !== -1) {
				if (prevIndex !== -1 && index < prevIndex) {
					setSlideDirection("right");
				} else {
					setSlideDirection("left");
				}
				setPrevIndex(index);
			}
		}
	}, [activeModuleId, tabs, prevIndex]);

	if (!activeModule) return null;

	function submit(values: CharacterFormValues) {
		if (!activeModule) return;
		const err = validateTitle(draft.title ?? "");
		if (err) {
			setTitleError(err);
			return;
		}
		const nextModules = layout.modules.map((m) =>
			m.id === activeModule.id ? { ...m, ...draft } : m,
		);
		onSave(draft, {
			...values,
			sheetLayout: {
				...layout,
				modules: nextModules,
			},
		});
	}

	const isCustom = isCustomSheetModule(activeModule);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
				<form
					onSubmit={handleSubmit(submit)}
					className="flex h-full min-h-0 flex-col"
				>
					<DialogHeader className="border-b border-border px-6 pt-6 pb-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<DialogTitle className="font-display text-lg">
									Editar módulo
								</DialogTitle>
								<DialogDescription>
									Altere o conteúdo e a configuração deste bloco da ficha.
								</DialogDescription>
							</div>
						</div>
						<div className="mt-3">
							<FormTabs
								tabs={tabs}
								value={activeModuleId || ""}
								onChange={setActiveModuleId}
							/>
						</div>
					</DialogHeader>

					<div
						key={activeModuleId}
						className={cn(
							"flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6",
							slideDirection === "left"
								? "t-tab-slide-left"
								: "t-tab-slide-right",
						)}
					>
						<div
							className={cn(
								"grid gap-3",
								isCustom ? "sm:grid-cols-[1fr_160px_140px]" : "sm:grid-cols-2",
							)}
						>
							{isCustom && (
								<Field
									label="Título do módulo"
									error={titleError || undefined}
									required
								>
									<Input
										value={draft.title ?? ""}
										placeholder="Ex: História de fundo"
										onChange={(event) => {
											const val = event.target.value;
											setDraft((current) => ({
												...current,
												title: val,
											}));
											setTitleError(validateTitle(val));
										}}
									/>
								</Field>
							)}
							<Field label="Coluna">
								<Select
									value={draft.column ?? "main"}
									onChange={(event) =>
										setDraft((current) => ({
											...current,
											column: event.target.value as "main" | "side",
										}))
									}
								>
									<option value="main">Principal</option>
									<option value="side">Lateral</option>
								</Select>
							</Field>
							<Field label="Visibilidade">
								<Select
									value={draft.enabled === false ? "false" : "true"}
									onChange={(event) =>
										setDraft((current) => ({
											...current,
											enabled: event.target.value === "true",
										}))
									}
								>
									<option value="true">Ativo</option>
									<option value="false">Oculto</option>
								</Select>
							</Field>
						</div>

						{isCustom ? (
							<Field label="Conteúdo customizado">
								<Textarea
									rows={8}
									value={draft.content ?? ""}
									onChange={(event) =>
										setDraft((current) => ({
											...current,
											content: event.target.value,
										}))
									}
									placeholder="Escreva o conteúdo do módulo..."
								/>
							</Field>
						) : (
							<CharacterModuleFields
								kind={activeModule.kind as SheetModuleKind}
								register={register}
								control={control}
								setValue={setValue}
								config={config}
								errors={errors}
							/>
						)}
					</div>

					<div className="flex items-center justify-end gap-2 border-t border-border bg-card-elevated/40 px-6 py-3">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" size="sm">
							Salvar módulo
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function QuickStat({
	label,
	value,
	color,
}: {
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-center">
			<p className={`font-display text-xl font-bold ${color}`}>{value}</p>
			<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</p>
		</div>
	);
}

function Metric({
	Icon,
	label,
	value,
}: {
	Icon: ComponentType<{ className?: string }>;
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-3">
			<Icon className="h-4 w-4 text-primary" />
			<p className="font-display mt-2 text-xl font-bold text-foreground">
				{value}
			</p>
			<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</p>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-3">
			<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-[13px] font-semibold text-foreground">{value}</p>
		</div>
	);
}

function TextBlock({ title, value }: { title: string; value?: string }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
			<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{title}
			</p>
			<p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
				{value || "Nada registrado ainda."}
			</p>
		</div>
	);
}
