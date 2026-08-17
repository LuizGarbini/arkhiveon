import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Camera,
	Flag,
	MapPin,
	Pencil,
	Sparkles,
	Trash2,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	DetailInfo,
	DetailQuickStat,
	DetailSection,
	DetailText,
} from "@/components/entity-detail";
import { EntityImageDialog } from "@/components/entity-image-dialog";
import { FactionEditButton } from "@/components/faction-form";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
	useActiveCampaign,
	useActiveCampaignId,
	useIsWorldStaff,
	useRPGStore,
} from "@/lib/store";
import type { FactionReputationStatus } from "@/lib/store/types";
import {
	useFactionReputationForActiveCampaign,
	useWorldCampaigns,
} from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/factions/$factionId")({
	validateSearch: (search: Record<string, unknown>) => ({
		edit: search.edit === true || search.edit === "true",
	}),
	component: FactionDetailPage,
});

const STATUS_LABELS: Record<FactionReputationStatus, string> = {
	ally: "Aliado",
	neutral: "Neutro",
	hostile: "Hostil",
	unfriendly: "Antipático",
};

const STATUSES: FactionReputationStatus[] = [
	"ally",
	"neutral",
	"hostile",
	"unfriendly",
];

function FactionDetailPage() {
	const { factionId } = Route.useParams();
	const { edit } = Route.useSearch();
	const navigate = useNavigate();
	const faction = useRPGStore((s) =>
		s.factions.find((f) => f.id === factionId),
	);
	const factionReputations = useRPGStore((s) => s.factionReputations);
	const reputations = useMemo(
		() => factionReputations.filter((r) => r.factionId === factionId),
		[factionReputations, factionId],
	);
	const updateFactionReputation = useRPGStore((s) => s.updateFactionReputation);
	const updateFaction = useRPGStore((s) => s.updateFaction);
	const removeFaction = useRPGStore((s) => s.removeFaction);
	const isStaff = useIsWorldStaff();
	const activeCampaign = useActiveCampaign();
	const activeCampaignId = useActiveCampaignId();
	const activeReputation = useFactionReputationForActiveCampaign(factionId);
	const worldCampaigns = useWorldCampaigns();

	const [isEditing, setIsEditing] = useState(edit || false);
	const [dialogOpen, setDialogOpen] = useState(Boolean(edit));
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const reputationByCampaign = useMemo(() => {
		const map = new Map(reputations.map((r) => [r.campaignId, r.status]));
		for (const campaign of worldCampaigns) {
			if (!map.has(campaign.id)) map.set(campaign.id, "neutral");
		}
		return map;
	}, [reputations, worldCampaigns]);

	if (!faction) {
		return (
			<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<Flag className="h-16 w-16 text-muted-foreground/30" />
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Facção não encontrada
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Esse registro pode ter sido removido ou ainda não sincronizou.
					</p>
				</div>
				<Link to="/factions">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para facções
					</Button>
				</Link>
			</div>
		);
	}

	const viewerStatus = activeReputation?.status ?? "neutral";
	const subtitle = [faction.alignment, faction.influence]
		.filter(Boolean)
		.join(" · ");

	function handleDialogOpenChange(open: boolean) {
		setDialogOpen(open);
		if (!open && edit) {
			void navigate({
				to: "/factions/$factionId",
				params: { factionId },
				search: { edit: false },
				replace: true,
			});
		}
	}

	function handleDelete() {
		removeFaction(factionId);
		void navigate({ to: "/factions" });
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0">
						<Link
							to="/factions"
							className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Voltar para facções
						</Link>
						<div className="mt-4 flex items-start gap-4">
							<div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
								{faction.imageUrl ? (
									<img
										src={faction.imageUrl}
										alt={faction.name}
										className="h-full w-full object-cover"
									/>
								) : (
									<Flag className="h-7 w-7" strokeWidth={1.5} />
								)}
								{isStaff && (
									<button
										type="button"
										onClick={() => setIsImageDialogOpen(true)}
										className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/50 hover:opacity-100 focus:bg-black/50 focus:opacity-100 focus:outline-none"
										aria-label="Editar imagem da facção"
									>
										<Camera className="h-5 w-5" />
									</button>
								)}
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<Flag className="h-3.5 w-3.5" />
									Facção
								</div>
								<h1 className="font-display mt-3 truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
									{faction.name || "Facção sem nome"}
								</h1>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{subtitle || "Organização do Mundo"}
								</p>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
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
								<Button
									type="button"
									variant="destructive"
									onClick={() => setConfirmDelete(true)}
									className="gap-2"
								>
									<Trash2 className="h-4 w-4" />
									Excluir
								</Button>
							</>
						)}
					</div>
				</div>

				<div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<DetailQuickStat
						Icon={Users}
						label="Líder"
						value={faction.leader || "—"}
						color="text-sky-300"
					/>
					<DetailQuickStat
						Icon={MapPin}
						label="Sede"
						value={faction.seat || "—"}
						color="text-amber-300"
					/>
					<DetailQuickStat
						Icon={Sparkles}
						label="Influência"
						value={faction.influence || "—"}
						color="text-fuchsia-300"
					/>
					<DetailQuickStat
						Icon={Flag}
						label="Mesa ativa"
						value={STATUS_LABELS[viewerStatus]}
						color="text-primary"
					/>
				</div>
			</header>

			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<main className="grid content-start gap-5">
					<DetailSection
						eyebrow="Resumo"
						title="Identidade"
						onEdit={
							isEditing
								? () => {
										setDialogOpen(true);
									}
								: undefined
						}
					>
						<div className="grid gap-3 sm:grid-cols-2">
							{faction.kind && (
								<DetailInfo
									label="Categoria"
									value={
										faction.kind === "patron"
											? `👑 Patrono de Grupo (${faction.patronType || "D&D"})`
											: faction.kind === "legendary_family"
												? `⚜️ Família Lendária (${faction.patronType || "Linhagem Mítica"})`
												: faction.kind === "noble_house"
													? "🏰 Família Nobre / Casa Real"
													: faction.kind === "guild_order"
														? "⚔️ Ordem / Guilda de Aventureiros"
														: faction.kind === "cult_society"
															? "👁️ Culto / Seita Secreta"
															: "🚩 Facção Política"
									}
								/>
							)}
							<DetailInfo label="Alinhamento" value={faction.alignment} />
							<DetailInfo label="Influência" value={faction.influence} />
							<DetailInfo label="Líder / Matriarca" value={faction.leader} />
							<DetailInfo label="Sede / Solar" value={faction.seat} />
							{faction.contacts && (
								<DetailInfo label="🗝️ Contatos Principais" value={faction.contacts} />
							)}
						</div>
					</DetailSection>

					{faction.perks && (
						<DetailSection
							eyebrow="Benefícios"
							title="🎁 Recursos & Favores Concedidos"
							onEdit={isEditing ? () => setDialogOpen(true) : undefined}
						>
							<DetailText value={faction.perks} />
						</DetailSection>
					)}

					{faction.duties && (
						<DetailSection
							eyebrow="Código"
							title="📜 Deveres, Código & Exigências"
							onEdit={isEditing ? () => setDialogOpen(true) : undefined}
						>
							<DetailText value={faction.duties} />
						</DetailSection>
					)}

					<DetailSection
						eyebrow="Agenda"
						title="Objetivos"
						onEdit={isEditing ? () => setDialogOpen(true) : undefined}
					>
						<DetailText value={faction.goals} />
					</DetailSection>

					<DetailSection
						eyebrow="Narrativa"
						title="Descrição & História"
						onEdit={isEditing ? () => setDialogOpen(true) : undefined}
					>
						<DetailText value={faction.description} />
					</DetailSection>
				</main>

				<aside className="grid content-start gap-5">
					<DetailSection
						eyebrow="Relação"
						title={
							isStaff ? "Reputação por campanha" : "Reputação na mesa ativa"
						}
					>
						<div className="space-y-2">
							{isStaff ? (
								worldCampaigns.map((campaign) => {
									const status =
										reputationByCampaign.get(campaign.id) ??
										("neutral" as const);
									return (
										<div
											key={campaign.id}
											className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2.5"
										>
											<span className="min-w-0 truncate text-sm font-medium">
												{campaign.name}
											</span>
											<Select
												value={status}
												onChange={(e) =>
													updateFactionReputation(
														factionId,
														campaign.id,
														e.target.value as FactionReputationStatus,
													)
												}
												className="w-[140px] shrink-0"
											>
												{STATUSES.map((s) => (
													<option key={s} value={s}>
														{STATUS_LABELS[s]}
													</option>
												))}
											</Select>
										</div>
									);
								})
							) : (
								<div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
									<span className="text-sm font-medium">
										{activeCampaign?.name || "Mesa ativa"}
									</span>
									<span className="text-sm text-muted-foreground">
										{STATUS_LABELS[viewerStatus]}
									</span>
								</div>
							)}
						</div>
					</DetailSection>
				</aside>
			</div>

			{isStaff && (
				<>
					<FactionEditButton
						faction={faction}
						open={dialogOpen}
						onOpenChange={handleDialogOpenChange}
						trigger={null}
					/>
					<EntityImageDialog
						open={isImageDialogOpen}
						onOpenChange={setIsImageDialogOpen}
						title="Editar imagem da facção"
						description="Envie um brasão ou escolha uma imagem da biblioteca."
						value={{ imageUrl: faction.imageUrl ?? "" }}
						onChange={(patch) =>
							updateFaction(faction.id, {
								imageUrl: patch.imageUrl ?? "",
							})
						}
						folder="factions"
						campaignId={activeCampaignId ?? undefined}
						libraryName={faction.name}
					/>
					{confirmDelete ? (
						<div
							className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
							role="presentation"
							onClick={() => setConfirmDelete(false)}
							onKeyDown={(e) => {
								if (e.key === "Escape") setConfirmDelete(false);
							}}
						>
							<div
								role="dialog"
								aria-modal="true"
								aria-labelledby="faction-delete-title"
								className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							>
								<h3
									id="faction-delete-title"
									className="font-display text-lg font-bold"
								>
									Excluir facção?
								</h3>
								<p className="mt-2 text-sm text-muted-foreground">
									Tem certeza que deseja excluir{" "}
									<span className="font-semibold text-foreground">
										{faction.name || "Sem nome"}
									</span>
									? Esta ação não pode ser desfeita.
								</p>
								<div className="mt-5 flex justify-end gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setConfirmDelete(false)}
									>
										Cancelar
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={handleDelete}
									>
										<Trash2 className="h-3.5 w-3.5" />
										Excluir
									</Button>
								</div>
							</div>
						</div>
					) : null}
				</>
			)}
		</div>
	);
}
