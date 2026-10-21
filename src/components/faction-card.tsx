import { Link, useNavigate } from "@tanstack/react-router";
import { Flag, MapPin, Sparkles, Users } from "lucide-react";
import { useRPGStore } from "@/lib/store";
import type { Faction, FactionReputationStatus } from "@/lib/store/types";
import { useFactionReputationForActiveCampaign } from "@/lib/worldbuilding/hooks";
import { EntityActions } from "./entity-actions";
import { cardInitials, EntityCardMedia } from "./entity-card-media";
import { EntityImageViewer } from "./images/entity-image-viewer";

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

const KIND_CONFIG: Record<
	string,
	{ label: string; icon: string; badge: string }
> = {
	patron: {
		label: "Patrono de Grupo",
		icon: "👑",
		badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
	},
	legendary_family: {
		label: "Família Lendária",
		icon: "⚜️",
		badge:
			"border-yellow-400/40 bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/20",
	},
	noble_house: {
		label: "Casa Nobre",
		icon: "🏰",
		badge: "border-sky-500/40 bg-sky-500/15 text-sky-300",
	},
	guild_order: {
		label: "Ordem / Guilda",
		icon: "⚔️",
		badge: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
	},
	cult_society: {
		label: "Culto / Seita",
		icon: "👁️",
		badge: "border-purple-500/40 bg-purple-500/15 text-purple-300",
	},
	faction: {
		label: "Facção",
		icon: "🚩",
		badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
	},
};

interface FactionCardProps {
	faction?: Faction;
	isLoading?: boolean;
}

export function FactionCard({ faction, isLoading }: FactionCardProps) {
	const navigate = useNavigate();
	const removeFaction = useRPGStore((s) => s.removeFaction);
	const factionId = faction?.id ?? "";
	const reputation = useFactionReputationForActiveCampaign(factionId);
	const status = reputation?.status ?? "neutral";

	if (isLoading || !faction) {
		return (
			<div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card-elevated p-5 shadow-sm animate-pulse">
				<div className="space-y-2.5 pt-1">
					<div className="h-5 w-1/2 rounded-md bg-white/10" />
					<div className="h-3 w-1/3 rounded-md bg-white/5" />
				</div>
				<div className="space-y-3 border-t border-white/5 pt-4">
					<div className="h-4 w-1/4 rounded bg-white/10" />
					<div className="h-8 w-full rounded-full bg-white/10" />
				</div>
			</div>
		);
	}

	return (
		<div className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-black/40 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0">
			<Link
				to="/factions/$factionId"
				params={{ factionId: faction.id }}
				search={{ edit: false }}
				className="absolute inset-0 z-0 cursor-pointer"
				aria-label={`Abrir facção ${faction.name || "sem nome"}`}
			/>
			<EntityCardMedia
				src={faction.imageUrl}
				alt={faction.name}
				icon={Flag}
				accentClassName="from-primary/15 text-primary/35"
				initials={cardInitials(faction.name || "F")}
			/>
			<div className="relative z-10 pointer-events-none flex h-full flex-col justify-between">
				<div className="pointer-events-auto">
					<EntityActions
						onEdit={() =>
							void navigate({
								to: "/factions/$factionId",
								params: { factionId: faction.id },
								search: { edit: true },
							})
						}
						onDelete={() => removeFaction(faction.id)}
						entityName={faction.name || "Sem nome"}
						entityKindLabel={
							faction.kind === "patron"
								? "patrono"
								: faction.kind === "legendary_family" ||
										faction.kind === "noble_house"
									? "família"
									: "organização"
						}
						extraActions={
							<EntityImageViewer
								variant="corner"
								src={faction.imageUrl || undefined}
								name={faction.name || "Sem nome"}
							/>
						}
					/>
				</div>
				<div className="p-4.5 pt-5">
					<h3 className="pr-28 font-display truncate text-xl font-bold text-white">
						{faction.name || "Facção sem nome"}
					</h3>
					<div className="mt-2 flex flex-wrap items-center gap-1.5">
						{faction.kind && KIND_CONFIG[faction.kind] && (
							<span
								className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${KIND_CONFIG[faction.kind].badge}`}
							>
								{KIND_CONFIG[faction.kind].icon}{" "}
								{KIND_CONFIG[faction.kind].label}
							</span>
						)}
						{faction.patronType && (
							<span className="rounded border border-amber-500/30 bg-amber-950/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
								{faction.patronType}
							</span>
						)}
						{faction.alignment && (
							<span className="rounded border border-primary/30 bg-background/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
								{faction.alignment}
							</span>
						)}
						<span
							className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_CLASSES[status]}`}
						>
							{STATUS_LABELS[status]}
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
				</div>
			</div>
		</div>
	);
}
