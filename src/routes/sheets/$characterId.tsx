import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRightLeft,
	BookOpen,
	Camera,
	Download,
	Edit,
	Eye,
	FileText,
	Heart,
	LockKeyhole,
	Plus,
	Shield,
	Sparkles,
	User,
	X,
	Zap,
} from "lucide-react";
import {
	type ComponentType,
	type FormEvent,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useForm } from "react-hook-form";
import { CharacterExportDialog } from "@/components/character-export-dialog";
import {
	buildCharacterFormDefaults,
	type CharacterFormValues,
	CharacterModuleFields,
	sanitizeCharacterFormValues,
} from "@/components/character-sheet-fields";
import { CharacterTransferDialog } from "@/components/character-transfer-dialog";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	isCharacterImageHidden,
	resolveCharacterImageUrl,
} from "@/lib/character-images";
import {
	createCustomSheetModule,
	normalizeSheetLayout,
	SHEET_MODULE_LABELS,
} from "@/lib/sheet-modules";
import {
	abilityModifier,
	type Character,
	formatModifier,
	type SheetLayoutConfig,
	type SheetModuleConfig,
	type SheetModuleKind,
	systemLabel,
	useRPGStore,
} from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sheets/$characterId")({
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
	const character = useRPGStore((state) =>
		state.characters.find((item) => item.id === characterId),
	);
	const isLoading = useRPGStore((state) => state.isLoadingRemote);
	const updateCharacter = useRPGStore((state) => state.updateCharacter);
	const imageAssets = useRPGStore((state) => state.imageAssets);
	const activeCampaignRole = useRPGStore(
		(state) =>
			state.campaigns.find((campaign) => campaign.id === state.activeCampaignId)
				?.myRole,
	);
	const [isEditingLayout, setIsEditingLayout] = useState(false);
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
				<Link to="/sheets">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para Fichas
					</Button>
				</Link>
			</div>
		);
	}

	const currentCharacter = character;
	const characterImageUrl = resolveCharacterImageUrl(
		currentCharacter,
		imageAssets,
		activeCampaignRole,
	);
	const isImageHidden = isCharacterImageHidden(
		currentCharacter,
		imageAssets,
		activeCampaignRole,
	);
	const config =
		SYSTEM_CONFIG[currentCharacter.system] ?? SYSTEM_CONFIG.generic;
	const layout = normalizeSheetLayout(currentCharacter);
	const modules = (
		isEditingLayout
			? layout.modules
			: layout.modules.filter((module) => module.enabled)
	).sort((a, b) => a.order - b.order);
	const mainModules = modules.filter((module) => module.column !== "side");
	const sideModules = modules.filter((module) => module.column === "side");

	function updateLayout(nextLayout: SheetLayoutConfig) {
		updateCharacter(currentCharacter.id, { sheetLayout: nextLayout });
	}

	function handleAddCustomModule(kind: "customText" | "customStats") {
		const nextModule = createCustomSheetModule(
			kind,
			layout.modules.length * 10 + 100,
		);
		updateLayout({
			...layout,
			modules: [...layout.modules, nextModule],
		});
		setEditingModule(nextModule);
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0">
						<Link
							to="/sheets"
							className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Voltar para fichas
						</Link>
						<div className="mt-4 flex items-start gap-4">
							<div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-fuchsia-500/10 to-transparent ring-1 ring-border/70">
								{characterImageUrl ? (
									<img
										src={characterImageUrl}
										alt={currentCharacter.characterName}
										className="h-full w-full object-cover"
									/>
								) : isImageHidden ? (
									<LockKeyhole
										className="h-7 w-7 text-primary/40"
										strokeWidth={1.4}
									/>
								) : (
									<User className="h-7 w-7 text-primary/40" strokeWidth={1.4} />
								)}
								<button
									type="button"
									onClick={() => setIsImageDialogOpen(true)}
									className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/50 hover:opacity-100 focus:bg-black/50 focus:opacity-100 focus:outline-none"
									aria-label="Editar imagem da ficha"
								>
									<Camera className="h-5 w-5" />
								</button>
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<FileText className="h-3.5 w-3.5" />
									{systemLabel(currentCharacter.system)}
								</div>
								<div className="mt-3 flex min-w-0 items-center gap-2">
									<h1 className="font-display min-w-0 truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
										{currentCharacter.characterName || "Ficha sem nome"}
									</h1>
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
								</div>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{[
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
						{isEditingLayout && (
							<>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleAddCustomModule("customText")}
									className="gap-2"
								>
									<Plus className="h-4 w-4" />
									Texto
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleAddCustomModule("customStats")}
									className="gap-2"
								>
									<Plus className="h-4 w-4" />
									Stats
								</Button>
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
						<Button
							type="button"
							onClick={() => setIsEditingLayout((current) => !current)}
							className="gap-2"
						>
							<Edit className="h-4 w-4" />
							{isEditingLayout ? "Concluir edição" : "Editar ficha"}
						</Button>
					</div>
				</div>

				<div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<QuickStat
						label="PV"
						value={`${currentCharacter.health}/${currentCharacter.healthMax}`}
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

			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<main className="grid gap-5">
					{mainModules.map((module) => (
						<SheetModuleCard
							key={module.id}
							module={module}
							character={currentCharacter}
							config={config}
							isEditingLayout={isEditingLayout}
							onEdit={() => setEditingModule(module)}
						/>
					))}
				</main>

				<aside className="grid content-start gap-5">
					{sideModules.map((module) => (
						<SheetModuleCard
							key={module.id}
							module={module}
							character={currentCharacter}
							config={config}
							isEditingLayout={isEditingLayout}
							onEdit={() => setEditingModule(module)}
						/>
					))}
				</aside>
			</div>

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
			<CharacterImageDialog
				character={currentCharacter}
				open={isImageDialogOpen}
				onOpenChange={setIsImageDialogOpen}
				onChange={(patch) => updateCharacter(currentCharacter.id, patch)}
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
			<CharacterExportDialog
				character={{ ...currentCharacter, imageUrl: characterImageUrl }}
				open={isExportDialogOpen}
				onOpenChange={setIsExportDialogOpen}
			/>
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

function CharacterImageDialog({
	character,
	open,
	onOpenChange,
	onChange,
}: {
	character: Character;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChange: (patch: Partial<Character>) => void;
}) {
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const imageAssets = useRPGStore((s) => s.imageAssets);
	const loadImageAssets = useRPGStore((s) => s.loadImageAssets);
	const activeCampaignRole = useRPGStore(
		(s) =>
			s.campaigns.find((campaign) => campaign.id === s.activeCampaignId)
				?.myRole,
	);
	const isMaster = activeCampaignRole === "owner";
	const visibleAssets = useMemo(
		() =>
			imageAssets.filter(
				(asset) =>
					asset.campaignId === activeCampaignId &&
					(isMaster || !asset.isPrivate),
			),
		[activeCampaignId, imageAssets, isMaster],
	);

	useEffect(() => {
		if (!open || !activeCampaignId) return;
		void loadImageAssets();
	}, [activeCampaignId, loadImageAssets, open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-3xl! overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">
						Editar imagem da ficha
					</DialogTitle>
					<DialogDescription>
						Troque ou remova o avatar usado no cabeçalho, nos cards e na
						exportação em PDF.
					</DialogDescription>
				</DialogHeader>

				<ImageUploader
					value={character.imageUrl ?? ""}
					onChange={(imageUrl) => onChange({ imageUrl, imageAssetId: "" })}
					label="Upload direto"
					folder="characters"
					campaignId={activeCampaignId ?? undefined}
					libraryName={character.characterName}
					size="lg"
				/>

				<div className="space-y-3">
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
							Biblioteca
						</p>
						<p className="mt-1 text-[12px] text-muted-foreground">
							Escolha uma imagem já enviada para a campanha.
						</p>
					</div>
					<div className="grid max-h-72 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
						{visibleAssets.map((asset) => {
							const isSelected = character.imageAssetId === asset.id;
							return (
								<button
									key={asset.id}
									type="button"
									onClick={() =>
										onChange({ imageUrl: "", imageAssetId: asset.id })
									}
									className={cn(
										"group relative overflow-hidden rounded-2xl border bg-card-elevated text-left shadow-sm shadow-black/5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/35",
										isSelected
											? "border-primary/50 ring-2 ring-primary/20"
											: "border-border/70",
									)}
								>
									<div className="relative aspect-[4/3] overflow-hidden bg-muted">
										<img
											src={asset.url}
											alt={asset.name}
											loading="lazy"
											decoding="async"
											className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
										{asset.isPrivate && (
											<span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-400/15 text-amber-200 backdrop-blur">
												<LockKeyhole className="h-3.5 w-3.5" />
											</span>
										)}
									</div>
									<div className="p-3">
										<p className="truncate text-[12px] font-bold text-foreground">
											{asset.name}
										</p>
										<p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
											{isSelected ? "Selecionada" : "Usar imagem"}
										</p>
									</div>
								</button>
							);
						})}
						{visibleAssets.length === 0 && (
							<div className="rounded-2xl border border-dashed border-border/70 bg-background/45 p-4 text-[12px] text-muted-foreground sm:col-span-3">
								Nenhuma imagem disponível.
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={() => onChange({ imageUrl: "", imageAssetId: "" })}
					>
						<X className="h-4 w-4" />
						Remover imagem
					</Button>
					<Button type="button" onClick={() => onOpenChange(false)}>
						Concluir
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function SheetModuleCard({
	module,
	character,
	config,
	isEditingLayout,
	onEdit,
}: {
	module: SheetModuleConfig;
	character: Character;
	config: (typeof SYSTEM_CONFIG)[keyof typeof SYSTEM_CONFIG];
	isEditingLayout: boolean;
	onEdit: () => void;
}) {
	return (
		<section
			className={`rounded-2xl border bg-card/80 p-5 shadow-sm shadow-black/5 transition-all ${
				module.enabled
					? "border-border/70"
					: "border-dashed border-border/60 opacity-60"
			}`}
		>
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
						{SHEET_MODULE_LABELS[module.kind]}
					</p>
					<h2 className="font-display mt-1 text-xl font-bold text-foreground">
						{module.title}
					</h2>
				</div>
				{isEditingLayout && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onEdit}
						className="gap-2"
					>
						<Edit className="h-3.5 w-3.5" />
						Editar
					</Button>
				)}
			</div>
			<ModuleContent module={module} character={character} config={config} />
		</section>
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
	const customFields = config.customFields?.filter((f) => f.section === module.kind) || [];

	if (module.kind === "custom_template_fields") {
		return <CustomSheetRenderer templateId={character.customTemplateId || character.system} register={() => ({}) as any} viewMode character={character} />;
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
				<TextBlock title="Aparência" value={character.appearance || "Não informada"} />
			</div>
		);
	}

	if (module.kind === "abilities") {
		const isStandardKey = (key: string) => [
			"strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "power", "size", "education"
		].includes(key);

		const abilities = (config.attributes || []).map((attr) => {
			const val = isStandardKey(attr.key) 
				? Number((character as any)[attr.key]) || 10
				: Number(character.systemAttributes?.[attr.key]) || 10;
			return { label: attr.label, value: val };
		});

		return (
			<div className={`grid gap-3 ${abilities.length >= 8 ? 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-8' : abilities.length === 9 ? 'grid-cols-3 sm:grid-cols-3 xl:grid-cols-9' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'}`}>
				{abilities.map((ability) => (
					<div
						key={ability.label}
						className="rounded-2xl border border-border/70 bg-background/45 p-3 text-center"
					>
						<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							{ability.label}
						</p>
						<p className="font-display mt-2 text-3xl font-bold text-foreground">
							{ability.value}
						</p>
						<p className="font-mono text-[12px] font-bold text-primary">
							{formatModifier(abilityModifier(ability.value))}
						</p>
					</div>
				))}
			</div>
		);
	}

	if (module.kind === "combat") {
		const hpPercent = character.healthMax
			? Math.min(
					100,
					Math.round((character.health / character.healthMax) * 100),
				)
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
									/{character.healthMax}
								</span>
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
						<Metric key={field.key} Icon={Sparkles} label={field.label} value={character.systemFields?.[field.key] || "-"} />
					))}
				</div>
			</div>
		);
	}

	if (module.kind === "sanity") {
		return (
			<div className="grid gap-3 sm:grid-cols-3">
				{customFields.map((field) => (
					<Metric key={field.key} Icon={Sparkles} label={field.label} value={character.systemFields?.[field.key] || "-"} />
				))}
				<Metric Icon={Eye} label="Sanidade" value={character.sanity} />
				<Metric Icon={Eye} label="Sanidade Máx." value={character.sanityMax} />
				<Metric Icon={Sparkles} label="Poder" value={character.power} />
			</div>
		);
	}

	if (module.kind === "magic") {
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
					<TextBlock key={field.key} title={field.label} value={character.systemFields?.[field.key]} />
				))}
				<TextBlock title="Magias" value={character.spells} />
				<TextBlock title="Espaços" value={character.spellSlots} />
			</div>
		);
	}

	if (module.kind === "inventory") {
		return (
			<div className="grid gap-3">
				{customFields.map((field) => (
					<TextBlock key={field.key} title={field.label} value={character.systemFields?.[field.key]} />
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
					<TextBlock key={field.key} title={field.label} value={character.systemFields?.[field.key]} />
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
			<div className="grid gap-3">
				{customFields.map((field) => (
					<TextBlock key={field.key} title={field.label} value={character.systemFields?.[field.key]} />
				))}
				<TextBlock title="Anotações" value={character.notes} />
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
	const { register, control, setValue, handleSubmit, reset } = form;
	const [draft, setDraft] = useState<Partial<SheetModuleConfig>>({});
	const config = SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.generic;

	useEffect(() => {
		if (!module || !open) return;
		reset(buildCharacterFormDefaults(character));
		setDraft({
			title: module.title,
			content: module.content ?? "",
			enabled: module.enabled,
			column: module.column ?? "main",
		});
	}, [character, module, open, reset]);

	if (!module) return null;

	function submit(values: CharacterFormValues) {
		onSave(draft, {
			...values,
			sheetLayout: layout,
		});
	}

	const isCustom =
		module.kind === "customText" || module.kind === "customStats";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl! max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit(submit)} className="space-y-5">
					<DialogHeader>
						<DialogTitle className="font-display text-xl">
							Editar módulo
						</DialogTitle>
						<DialogDescription>
							Altere o conteúdo e a configuração deste bloco da ficha.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3 sm:grid-cols-[1fr_160px_140px]">
						<Field label="Título do módulo">
							<Input
								value={draft.title ?? ""}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										title: event.target.value,
									}))
								}
							/>
						</Field>
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
							kind={module.kind as SheetModuleKind}
							register={register}
							control={control}
							setValue={setValue}
							config={config}
						/>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit">Salvar módulo</Button>
					</DialogFooter>
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
