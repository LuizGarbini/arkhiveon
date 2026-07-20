import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useActiveCampaign, useIsWorldStaff, useRPGStore } from "@/lib/store";
import type { FactionReputationStatus } from "@/lib/store/types";
import {
	useFactionReputationForActiveCampaign,
	useWorldCampaigns,
} from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/factions/$factionId")({
	component: RouteComponent,
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

function RouteComponent() {
	const { factionId } = Route.useParams();
	const navigate = useNavigate();
	const faction = useRPGStore((s) =>
		s.factions.find((f) => f.id === factionId),
	)
	const reputations = useRPGStore((s) =>
		s.factionReputations.filter((r) => r.factionId === factionId),
	)
	const updateFactionReputation = useRPGStore((s) => s.updateFactionReputation);
	const updateFaction = useRPGStore((s) => s.updateFaction);
	const removeFaction = useRPGStore((s) => s.removeFaction);
	const isStaff = useIsWorldStaff();
	const activeCampaign = useActiveCampaign();
	const activeReputation = useFactionReputationForActiveCampaign(factionId);
	const worldCampaigns = useWorldCampaigns();

	const reputationByCampaign = useMemo(() => {
		const map = new Map(reputations.map((r) => [r.campaignId, r.status]));
		for (const campaign of worldCampaigns) {
			if (!map.has(campaign.id)) map.set(campaign.id, "neutral");
		}
		return map;
	}, [reputations, worldCampaigns]);

	if (!faction) {
		return (
			<div className="p-8 text-center text-muted-foreground">
				Facção não encontrada.
			</div>
		)
	}

	const viewerStatus = activeReputation?.status ?? "neutral";

	function handleDelete() {
		if (
			!window.confirm(
				`Excluir a facção "${faction?.name || "Sem nome"}"? Esta ação não pode ser desfeita.`,
			)
		) {
			return
		}
		removeFaction(factionId);
		void navigate({ to: "/factions" });
	}

	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-8 sm:px-8">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				<Link to="/factions">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="h-4 w-4" />
						Voltar
					</Button>
				</Link>
				{isStaff && (
					<Button variant="destructive" size="sm" onClick={handleDelete}>
						<Trash2 className="h-4 w-4" />
						Excluir facção
					</Button>
				)}
			</div>

			{faction.imageUrl ? (
				<img
					src={faction.imageUrl}
					alt={faction.name}
					className="mb-4 h-28 w-28 rounded-2xl border border-border/70 object-cover"
				/>
			) : null}

			<h1 className="font-display text-3xl font-bold">{faction.name}</h1>
			<p className="mt-2 text-muted-foreground">
				{faction.description || faction.goals || "Sem descrição."}
			</p>

			<div className="mt-6 grid gap-3 sm:grid-cols-2">
				<div className="rounded-xl border border-border/70 p-4">
					<div className="text-xs uppercase tracking-wider text-muted-foreground">
						Líder
					</div>
					<div className="mt-1 font-medium">{faction.leader || "—"}</div>
				</div>
				<div className="rounded-xl border border-border/70 p-4">
					<div className="text-xs uppercase tracking-wider text-muted-foreground">
						Sede
					</div>
					<div className="mt-1 font-medium">{faction.seat || "—"}</div>
				</div>
				<div className="rounded-xl border border-border/70 p-4">
					<div className="text-xs uppercase tracking-wider text-muted-foreground">
						Alinhamento
					</div>
					<div className="mt-1 font-medium">{faction.alignment || "—"}</div>
				</div>
				<div className="rounded-xl border border-border/70 p-4">
					<div className="text-xs uppercase tracking-wider text-muted-foreground">
						Influência
					</div>
					<div className="mt-1 font-medium">{faction.influence || "—"}</div>
				</div>
			</div>

			<section className="mt-8">
				<h2 className="font-display text-lg font-bold">
					{isStaff ? "Reputação por campanha" : "Reputação na mesa ativa"}
				</h2>
				<div className="mt-3 space-y-2">
					{isStaff ? (
						worldCampaigns.map((campaign) => {
							const status =
								reputationByCampaign.get(campaign.id) ?? ("neutral" as const);
							return (
								<div
									key={campaign.id}
									className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3"
								>
									<span className="font-medium">{campaign.name}</span>
									<Select
										value={status}
										onChange={(e) =>
											updateFactionReputation(
												factionId,
												campaign.id,
												e.target.value as FactionReputationStatus,
											)
										}
										className="w-[160px]"
									>
										{STATUSES.map((s) => (
											<option key={s} value={s}>
												{STATUS_LABELS[s]}
											</option>
										))}
									</Select>
								</div>
							)
						})
					) : (
						<div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
							<span className="font-medium">
								{activeCampaign?.name || "Mesa ativa"}
							</span>
							<span className="text-sm text-muted-foreground">
								{STATUS_LABELS[viewerStatus]}
							</span>
						</div>
					)}
				</div>
			</section>

			{isStaff && (
				<section className="mt-8 space-y-3">
					<h2 className="font-display text-lg font-bold">Editar facção</h2>
					<textarea
						className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
						defaultValue={faction.goals}
						placeholder="Objetivos"
						onBlur={(e) => updateFaction(factionId, { goals: e.target.value })}
					/>
					<textarea
						className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
						defaultValue={faction.description}
						placeholder="Descrição"
						onBlur={(e) =>
							updateFaction(factionId, { description: e.target.value })
						}
					/>
				</section>
			)}
		</div>
	)
}
