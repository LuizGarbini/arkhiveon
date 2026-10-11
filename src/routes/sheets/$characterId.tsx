import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, User } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import {
	resolveSheetHealth,
	sanitizeCharacterFormValues,
} from "@/components/character-sheet/fields";
import {
	CharacterNameDialog,
	ModuleEditorDialog,
	SheetHeader,
	SheetModuleCard,
	SheetModuleContent,
} from "@/components/character-sheet/view";
import { CharacterTransferDialog } from "@/components/character-transfer-dialog";
import { EntityImageDialog } from "@/components/entity-image-dialog";
import { SaveSheetLayoutPanel } from "@/components/save-sheet-layout-panel";
import { SheetModuleEditor } from "@/components/sheet-module-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateEffectiveHealthMax } from "@/core/rules";
import { useDocumentMetadata } from "@/hooks/use-document-metadata";
import {
	isCharacterImageHidden,
	resolveCharacterImageUrl,
} from "@/lib/character-images";
import {
	createCustomSheetModule,
	normalizeModuleOrders,
	normalizeSheetLayout,
} from "@/lib/sheet-modules";
import {
	type SheetLayoutConfig,
	type SheetModuleConfig,
	useActiveCampaignId,
	useActiveCampaignRole,
	useImageAssetLookup,
	useRPGStore,
} from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";

const CharacterExportDialog = lazy(() =>
	import("@/components/character-export-dialog").then((m) => ({
		default: m.CharacterExportDialog,
	})),
);

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
		"Ficha de personagem no Arkhiveon",
	);

	const updateCharacter = useRPGStore((state) => state.updateCharacter);
	const activeCampaignId = useActiveCampaignId();
	const activeCampaignRole = useActiveCampaignRole();
	const imageAssetLookup = useImageAssetLookup();
	const isLoading = useRPGStore((state) => state.isLoadingRemote);

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
					<Button variant="outline" size="sm" className="min-h-[44px]">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para Personagens
					</Button>
				</Link>
			</div>
		);
	}

	const currentCharacter = character;
	const effectiveHealthMax = calculateEffectiveHealthMax({
		baseHealthMax: currentCharacter.healthMax,
		level: currentCharacter.level,
		featsList: currentCharacter.featsList,
		system: currentCharacter.system,
	});

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
		if (title === null) return;
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

	const isViewer = activeCampaignRole === "viewer";

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-8">
			<SheetHeader
				character={currentCharacter}
				config={config}
				characterImageUrl={characterImageUrl}
				isImageHidden={isImageHidden}
				isViewer={isViewer}
				isEditingLayout={isEditingLayout}
				effectiveHealthMax={effectiveHealthMax}
				onOpenImageDialog={() => setIsImageDialogOpen(true)}
				onOpenNameDialog={() => setIsNameDialogOpen(true)}
				onOpenTransferDialog={() => setIsTransferDialogOpen(true)}
				onOpenExportDialog={() => setIsExportDialogOpen(true)}
				onToggleEditLayout={() => setIsEditingLayout((current) => !current)}
			/>

			{isEditingLayout ? (
				<section className="space-y-6 rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
						<div>
							<h2 className="font-display text-lg font-bold text-foreground">
								Editor de Layout da Ficha
							</h2>
							<p className="text-xs text-muted-foreground">
								Arraste para reordenar, oculte blocos ou adicione módulos
								customizados.
							</p>
						</div>
						<Button
							type="button"
							size="sm"
							onClick={() => setIsEditingLayout(false)}
							className="min-h-[44px] cursor-pointer"
						>
							Concluir Edição
						</Button>
					</div>

					<SheetModuleEditor
						mode="layout"
						modules={layout.modules}
						onChange={(modules) => updateLayout({ ...layout, modules })}
						onEditBlock={(module) => setEditingModule(module)}
						onAddCustom={handleAddCustomModule}
					/>

					<SaveSheetLayoutPanel
						baseSystem={currentCharacter.system}
						modules={layout.modules}
					/>
				</section>
			) : (
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
					<div className="space-y-6 lg:col-span-8">
						{layout.modules
							.filter((m) => m.enabled !== false && m.column !== "side")
							.map((module) => (
								<SheetModuleCard
									key={module.id}
									module={module}
									canEdit={!isViewer}
									onEdit={() => setEditingModule(module)}
								>
									<SheetModuleContent
										module={module}
										character={currentCharacter}
										config={config}
									/>
								</SheetModuleCard>
							))}
					</div>

					<div className="space-y-6 lg:col-span-4">
						{layout.modules
							.filter((m) => m.enabled !== false && m.column === "side")
							.map((module) => (
								<SheetModuleCard
									key={module.id}
									module={module}
									canEdit={!isViewer}
									onEdit={() => setEditingModule(module)}
								>
									<SheetModuleContent
										module={module}
										character={currentCharacter}
										config={config}
									/>
								</SheetModuleCard>
							))}
					</div>
				</div>
			)}

			<ModuleEditorDialog
				character={currentCharacter}
				module={editingModule}
				layout={layout}
				open={Boolean(editingModule)}
				onOpenChange={(open) => {
					if (!open) setEditingModule(null);
				}}
				onSave={(_patch, values) => {
					const sanitized = sanitizeCharacterFormValues(values);
					updateCharacter(currentCharacter.id, {
						...sanitized,
						...resolveSheetHealth(values, currentCharacter),
					});
					setEditingModule(null);
				}}
			/>

			<CharacterNameDialog
				character={currentCharacter}
				open={isNameDialogOpen}
				onOpenChange={setIsNameDialogOpen}
				onSave={(characterName) => {
					updateCharacter(currentCharacter.id, { characterName });
				}}
			/>

			{activeCampaignId && (
				<CharacterTransferDialog
					character={currentCharacter}
					open={isTransferDialogOpen}
					onOpenChange={setIsTransferDialogOpen}
				/>
			)}

			<EntityImageDialog
				open={isImageDialogOpen}
				onOpenChange={setIsImageDialogOpen}
				title="Imagem do Personagem"
				description="Envie ou selecione uma imagem para o personagem."
				folder="characters"
				libraryName={currentCharacter.characterName}
				campaignId={activeCampaignId ?? undefined}
				value={{
					imageUrl: currentCharacter.imageUrl,
					imageAssetId: currentCharacter.imageAssetId,
					imageFocusX: currentCharacter.imageFocusX,
					imageFocusY: currentCharacter.imageFocusY,
					imageZoom: currentCharacter.imageZoom,
				}}
				onChange={(patch) => {
					updateCharacter(currentCharacter.id, patch);
				}}
			/>

			{isExportDialogOpen && (
				<Suspense fallback={null}>
					<CharacterExportDialog
						character={currentCharacter}
						open={isExportDialogOpen}
						onOpenChange={setIsExportDialogOpen}
					/>
				</Suspense>
			)}
		</div>
	);
}
