import { Link } from "@tanstack/react-router";
import { Flag, MapPin, Sparkles, Users } from "lucide-react";
import type { Faction, FactionReputationStatus } from "@/lib/store/types";
import { useFactionReputationForActiveCampaign } from "@/lib/worldbuilding/hooks";

const STATUS_LABELS: Record<FactionReputationStatus, string> = {
	ally: "Aliado",
	neutral: "Neutro",
	hostile: "Hostil",
	unfriendly: "Antipático",
};

const STATUS_CLASSES: Record<FactionReputationStatus, string> = {
	ally: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
	neutral: "border-white/10 bg-muted/40 text-white/60",
	hostile: "border-rose-500/35 bg-rose-500/25 text-rose-300",
	unfriendly: "border-amber-500/30 bg-amber-500/20 text-amber-300",
};

interface FactionCardProps {
	faction?: Faction;
	isLoading?: boolean;
}

export function FactionCard({ faction, isLoading }: FactionCardProps) {
	const factionId = faction?.id ?? "";
	const reputation = useFactionReputationForActiveCampaign(factionId);
	const status = reputation?.status ?? "neutral";

	if (isLoading || !faction) {
		return (
			<div className="min-h-[280px] animate-pulse rounded-2xl border border-border/70 bg-card-elevated/40" />
		);
	}

	return (
		<Link
			to="/factions/$factionId"
			params={{ factionId: faction.id }}
			className="group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-black/40 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg"
		>
			<div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/10 to-transparent" />
			<div className="p-4.5 pt-5">
				<h3 className="font-display truncate text-xl font-bold text-white">
					{faction.name || "Facção sem nome"}
				</h3>
				<div className="mt-2 flex flex-wrap items-center gap-1.5">
					{faction.alignment && (
						<span className="rounded border border-primary/30 bg-background/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
							{faction.alignment}
						</span>
					)}
					<span
						className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_CLASSES[status]}`}
					>
						{STATUS_LABELS[status]} (mesa ativa)
					</span>
				</div>
			</div>
			<div className="space-y-3.5 p-4.5 pb-5">
				<div className="grid grid-cols-3 gap-1.5 text-xs">
					<div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/45 px-1.5 py-1">
						<Users className="h-3.5 w-3.5 text-white/50" />
						<div className="min-w-0">
							<div className="text-[7px] font-bold uppercase tracking-wider text-white/50">
								Líder
							</div>
							<div className="truncate text-[10px] font-bold text-white">
								{faction.leader || "—"}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/45 px-1.5 py-1">
						<Sparkles className="h-3.5 w-3.5 text-white/50" />
						<div className="min-w-0">
							<div className="text-[7px] font-bold uppercase tracking-wider text-white/50">
								Influência
							</div>
							<div className="truncate text-[10px] font-bold text-white">
								{faction.influence || "—"}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/45 px-1.5 py-1">
						<MapPin className="h-3.5 w-3.5 text-white/50" />
						<div className="min-w-0">
							<div className="text-[7px] font-bold uppercase tracking-wider text-white/50">
								Sede
							</div>
							<div className="truncate text-[10px] font-bold text-white">
								{faction.seat || "—"}
							</div>
						</div>
					</div>
				</div>
				<p className="line-clamp-2 border-t border-white/10 pt-3 text-xs italic text-white/60">
					{faction.description || faction.goals || "Sem descrição."}
				</p>
				<div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
					<Flag className="h-3 w-3" />
					Ver detalhes
				</div>
			</div>
		</Link>
	);
}
