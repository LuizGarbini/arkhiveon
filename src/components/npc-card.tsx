import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, MapPin, Skull, User } from "lucide-react";
import type { Npc } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { EntityActions } from "./entity-actions";
import { cardInitials, EntityCardMedia } from "./entity-card-media";
import { EntityImageViewer } from "./images/entity-image-viewer";

interface NpcCardProps {
	npc?: Npc;
	isLoading?: boolean;
}

const dispositionStyles: Record<string, { label: string; tone: string }> = {
	hostile: {
		label: "Hostil",
		tone: "text-rose-300 bg-rose-500/20 border-rose-500/30",
	},
	unfriendly: {
		label: "Antipático",
		tone: "text-orange-300 bg-orange-500/20 border-orange-500/30",
	},
	neutral: {
		label: "Neutro",
		tone: "text-muted-foreground bg-muted/40 border-border/75",
	},
	friendly: {
		label: "Amigável",
		tone: "text-emerald-300 bg-emerald-500/20 border-emerald-500/30",
	},
	ally: {
		label: "Aliado",
		tone: "text-sky-300 bg-sky-500/20 border-sky-500/30",
	},
};

const importanceStyles: Record<string, string> = {
	minor: "text-muted-foreground",
	supporting: "text-foreground/80",
	major: "text-primary",
	boss: "text-rose-400",
	unknown: "text-muted-foreground",
};

export function NpcCard({ npc, isLoading }: NpcCardProps) {
	const removeNpc = useRPGStore((s) => s.removeNpc);
	const navigate = useNavigate();
	const linkedCharacterId = npc?.linkedCharacterId;
	const linkedCharacter = useRPGStore((s) =>
		linkedCharacterId
			? s.characters.find((character) => character.id === linkedCharacterId)
			: undefined,
	);

	if (isLoading || !npc) {
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

	const disposition =
		dispositionStyles[npc.disposition] ?? dispositionStyles.neutral;
	const isMonster = npc.kind === "monster";
	const kindLabel = isMonster ? "Monstro" : "NPC";
	const SubtitleIcon = isMonster ? Skull : User;

	return (
		<div className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-black/40 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0">
			<Link
				to="/npcs/$npcId"
				params={{ npcId: npc.id }}
				search={{ edit: false }}
				className="absolute inset-0 z-0 cursor-pointer"
				aria-label={`Abrir ficha de ${npc.name}`}
			/>

			<EntityCardMedia
				src={npc.imageUrl}
				alt={npc.name}
				icon={SubtitleIcon}
				accentClassName="from-fuchsia-500/15 text-fuchsia-300/40"
				initials={cardInitials(npc.name || kindLabel)}
			/>

			<div className="relative z-10 pointer-events-none flex h-full flex-col justify-between">
				<div className="pointer-events-auto">
					<EntityActions
						onEdit={() =>
							void navigate({
								to: "/npcs/$npcId",
								params: { npcId: npc.id },
								search: { edit: true },
							})
						}
						onDelete={() => removeNpc(npc.id)}
						entityName={npc.name || "Sem nome"}
						entityKindLabel={kindLabel}
						worldStaffOnly
						extraActions={
							<EntityImageViewer
								variant="corner"
								src={npc.imageUrl || undefined}
								name={npc.name || "Sem nome"}
							/>
						}
					/>
				</div>

				<div className="p-4.5 pt-5">
					<div className="flex items-center gap-2">
						<h3
							className={`font-display truncate text-xl font-bold tracking-tight drop-shadow-sm ${importanceStyles[npc.importance] || "text-white"}`}
						>
							{npc.name || "Sem nome"}
						</h3>
						{!npc.isAlive && (
							<Skull className="h-4 w-4 shrink-0 text-rose-400" />
						)}
					</div>
					<p className="mt-1 flex items-center gap-1.5 text-xs text-white/70 font-medium">
						<SubtitleIcon className="h-3.5 w-3.5 opacity-80" />{" "}
						{npc.race || kindLabel}
						{npc.role && <> · {npc.role}</>}
					</p>
					<div className="mt-2.5 flex flex-wrap items-center gap-1.5">
						<span className="rounded bg-background/50 border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70">
							{kindLabel}
						</span>
						<span
							className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${disposition.tone}`}
						>
							{disposition.label}
						</span>
						{npc.faction && (
							<span className="rounded bg-muted/40 border border-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/70">
								{npc.faction}
							</span>
						)}
						{npc.cr && (
							<span className="font-mono rounded bg-background/50 border border-white/10 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white/70">
								CR {npc.cr}
							</span>
						)}
					</div>
				</div>

				<div className="space-y-3.5 p-4.5 pb-5">
					{npc.location && (
						<div className="flex items-center gap-1.5 text-xs text-white/75">
							<MapPin className="h-3.5 w-3.5 text-amber-300" />
							<span className="truncate">{npc.location}</span>
						</div>
					)}

					{linkedCharacter && (
						<div className="pointer-events-auto inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/20 px-2 py-1 text-xs font-bold text-primary transition hover:bg-primary/25">
							<FileText className="h-3.5 w-3.5" />
							Ficha: {linkedCharacter.characterName || "Sem nome"}
						</div>
					)}

					{npc.description && (
						<p className="line-clamp-2 border-t border-white/10 pt-3 text-xs italic leading-relaxed text-white/60">
							“{npc.description}”
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
