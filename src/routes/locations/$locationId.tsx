import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Camera,
	CloudSun,
	Compass,
	Eye,
	Map as MapIcon,
	MapPin,
	Mountain,
	Pencil,
	ShieldAlert,
	Users,
} from "lucide-react";
import { useState } from "react";
import {
	DetailInfo,
	DetailQuickStat,
	DetailSection,
	DetailSkeleton,
	DetailText,
} from "@/components/entity-detail";
import { EntityImageDialog } from "@/components/entity-image-dialog";
import { EntityLinkChips } from "@/components/entity-links";
import { EntityImageViewer } from "@/components/images/entity-image-viewer";
import { LocationEditButton } from "@/components/location-form";
import { Button } from "@/components/ui/button";
import {
	useActiveCampaignId,
	useActiveCampaignRole,
	useIsWorldStaff,
	useRPGStore,
} from "@/lib/store";
import { useActiveCampaignContext } from "@/lib/worldbuilding/hooks";
import { canViewScopedContent } from "@/lib/worldbuilding/visibility";

export const Route = createFileRoute("/locations/$locationId")({
	validateSearch: (search: Record<string, unknown>) => ({
		edit: search.edit === true || search.edit === "true",
	}),
	component: LocationDetailPage,
});

function LocationDetailPage() {
	const { locationId } = Route.useParams();
	const { edit } = Route.useSearch();
	const navigate = useNavigate();
	const location = useRPGStore((state) =>
		state.locations.find((entry) => entry.id === locationId),
	);
	const isLoading = useRPGStore((state) => state.isLoadingRemote);
	const updateLocation = useRPGStore((state) => state.updateLocation);
	const role = useActiveCampaignRole();
	const isStaff = useIsWorldStaff();
	const activeCampaign = useActiveCampaignContext();
	const activeCampaignId = useActiveCampaignId();
	const campaigns = useRPGStore((state) => state.campaigns);
	const [isEditing, setIsEditing] = useState(edit || false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

	const canView =
		!!location &&
		canViewScopedContent(location, activeCampaign, role, campaigns);

	if (isLoading) return <DetailSkeleton />;

	if (!location || !canView) {
		return (
			<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<MapIcon className="h-16 w-16 text-muted-foreground/30" />
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Local nao encontrado
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Esse registro pode ter sido removido ou ainda nao sincronizou.
					</p>
				</div>
				<Link to="/locations">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para locais
					</Button>
				</Link>
			</div>
		);
	}

	const currentLocation = location;
	const subtitle = [currentLocation.type, currentLocation.region]
		.filter(Boolean)
		.join(" · ");

	function handleDialogOpenChange(open: boolean) {
		setDialogOpen(open);
		if (!open && edit) {
			void navigate({
				to: "/locations/$locationId",
				params: { locationId: currentLocation.id },
				search: { edit: false },
				replace: true,
			});
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0">
						<Link
							to="/locations"
							className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Voltar para locais
						</Link>
						<div className="mt-4 flex items-start gap-4">
							<div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20">
								{currentLocation.imageUrl ? (
									<img
										src={currentLocation.imageUrl}
										alt={currentLocation.name}
										className="h-full w-full object-cover"
									/>
								) : (
									<Compass className="h-7 w-7" strokeWidth={1.5} />
								)}
								{currentLocation.imageUrl ? (
									<EntityImageViewer
										src={currentLocation.imageUrl}
										name={currentLocation.name}
										canEdit={isStaff}
										onEdit={() => setIsImageDialogOpen(true)}
									/>
								) : (
									isStaff && (
										<button
											type="button"
											onClick={() => setIsImageDialogOpen(true)}
											className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/50 hover:opacity-100 focus:bg-black/50 focus:opacity-100 focus:outline-none"
											aria-label="Editar imagem do local"
										>
											<Camera className="h-5 w-5" />
										</button>
									)
								)}
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<MapIcon className="h-3.5 w-3.5" />
									Local
								</div>
								<h1 className="font-display mt-3 truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
									{currentLocation.name || "Local sem nome"}
								</h1>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{subtitle || "Cartografia da campanha"}
								</p>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{currentLocation.mapUrl && (
							<a href={currentLocation.mapUrl} target="_blank" rel="noreferrer">
								<Button type="button" variant="outline" className="gap-2">
									<MapIcon className="h-4 w-4" />
									Abrir mapa
								</Button>
							</a>
						)}
						{isStaff && (
							<>
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
									onClick={() => setIsEditing((current) => !current)}
									className="gap-2"
								>
									<Pencil className="h-4 w-4" />
									{isEditing ? "Concluir edição" : "Editar"}
								</Button>
							</>
						)}
					</div>
				</div>

				<div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<DetailQuickStat
						Icon={ShieldAlert}
						label="Perigo"
						value={currentLocation.dangerLevel || "-"}
						color="text-rose-300"
					/>
					<DetailQuickStat
						Icon={Eye}
						label="Visitado"
						value={currentLocation.visited ? "Sim" : "Nao"}
						color={
							currentLocation.visited ? "text-primary" : "text-muted-foreground"
						}
					/>
					<DetailQuickStat
						Icon={CloudSun}
						label="Clima"
						value={currentLocation.climate || "-"}
						color="text-amber-300"
					/>
					<DetailQuickStat
						Icon={Users}
						label="Populacao"
						value={currentLocation.population || "-"}
						color="text-emerald-300"
					/>
				</div>
			</header>

			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<main className="grid content-start gap-5">
					<DetailSection
						eyebrow="Resumo"
						title="Identificacao"
						onEdit={
							isEditing
								? () => {
										setActiveTab("basic");
										setDialogOpen(true);
									}
								: undefined
						}
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<DetailInfo label="Tipo" value={currentLocation.type} />
							<DetailInfo label="Regiao" value={currentLocation.region} />
							<DetailInfo
								label="Local pai"
								value={currentLocation.parentLocation}
							/>
							<DetailInfo
								Icon={Mountain}
								label="Terreno"
								value={currentLocation.terrain}
							/>
						</div>
					</DetailSection>

					<DetailSection
						eyebrow="Descricao"
						title="Primeira vista"
						onEdit={
							isEditing
								? () => {
										setActiveTab("basic");
										setDialogOpen(true);
									}
								: undefined
						}
					>
						<DetailText value={currentLocation.description} />
					</DetailSection>

					<DetailSection
						eyebrow="Sociedade"
						title="Politica & economia"
						onEdit={
							isEditing
								? () => {
										setActiveTab("society");
										setDialogOpen(true);
									}
								: undefined
						}
					>
						<div className="grid gap-3">
							<div className="grid gap-3 sm:grid-cols-2">
								<DetailInfo
									label="Governo"
									value={currentLocation.government}
								/>
								<DetailInfo label="Economia" value={currentLocation.economy} />
							</div>
							<DetailText
								title="Habitantes notaveis"
								value={currentLocation.notableInhabitants}
							/>
							<DetailText
								title="Pontos de interesse"
								value={currentLocation.keyFeatures}
							/>
							<DetailText title="Ganchos" value={currentLocation.hooks} />
						</div>
					</DetailSection>

					<DetailSection
						eyebrow="Historia"
						title="Passado do local"
						onEdit={
							isEditing
								? () => {
										setActiveTab("history");
										setDialogOpen(true);
									}
								: undefined
						}
					>
						<DetailText value={currentLocation.history} />
					</DetailSection>
				</main>

				<aside className="grid content-start gap-5">
					<DetailSection
						eyebrow="Mapa"
						title="Referencia"
						onEdit={
							isEditing
								? () => {
										setActiveTab("basic");
										setDialogOpen(true);
									}
								: undefined
						}
					>
						<div className="grid gap-3">
							<DetailInfo
								Icon={MapPin}
								label="URL do mapa"
								value={currentLocation.mapUrl}
							/>
							<DetailInfo
								label="Nivel de perigo"
								value={currentLocation.dangerLevel}
							/>
						</div>
					</DetailSection>

					<DetailSection eyebrow="Conexoes" title="Vinculos">
						<EntityLinkChips
							links={currentLocation.entityLinks}
							emptyText="Nenhuma conexao registrada."
						/>
					</DetailSection>
				</aside>
			</div>

			<LocationEditButton
				location={currentLocation}
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				defaultTab={activeTab}
				trigger={null}
			/>
			{isStaff && (
				<EntityImageDialog
					open={isImageDialogOpen}
					onOpenChange={setIsImageDialogOpen}
					title="Editar imagem do local"
					description="Escolha da biblioteca, envie uma nova imagem ou ajuste o recorte."
					value={{ imageUrl: currentLocation.imageUrl ?? "" }}
					onChange={(patch) =>
						updateLocation(currentLocation.id, {
							imageUrl: patch.imageUrl ?? "",
						})
					}
					folder="locations"
					campaignId={activeCampaignId ?? undefined}
					libraryName={currentLocation.name}
				/>
			)}
		</div>
	);
}
