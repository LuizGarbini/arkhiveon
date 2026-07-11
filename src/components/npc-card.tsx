import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, MapPin, Skull, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Npc } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { EntityActions } from "./entity-actions";

interface NpcCardProps {
	npc?: Npc;
	isLoading?: boolean;
}

const dispositionStyles: Record<string, { label: string; tone: string }> = {
	hostile: {
		label: "Hostil",
		tone: "text-rose-300 bg-rose-500/10 ring-rose-500/20",
	},
	unfriendly: {
		label: "Antipático",
		tone: "text-orange-300 bg-orange-500/10 ring-orange-500/20",
	},
	neutral: {
		label: "Neutro",
		tone: "text-muted-foreground bg-muted/40 ring-border",
	},
	friendly: {
		label: "Amigável",
		tone: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20",
	},
	ally: {
		label: "Aliado",
		tone: "text-sky-300 bg-sky-500/10 ring-sky-500/20",
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
			<div className="flex flex-col rounded-xl border border-border bg-card-elevated p-4 space-y-4">
				<div className="flex items-start gap-3">
					<Skeleton className="h-14 w-14 rounded-lg shrink-0" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
						<div className="flex gap-1">
							<Skeleton className="h-4 w-12 rounded" />
							<Skeleton className="h-4 w-12 rounded" />
						</div>
					</div>
				</div>
				<div className="space-y-2">
					<Skeleton className="h-3 w-1/3" />
					<div className="border-t border-border/60 pt-2.5">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-5/6 mt-1" />
					</div>
				</div>
			</div>
		);
	}

	const initials = npc.name
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	const disposition =
		dispositionStyles[npc.disposition] ?? dispositionStyles.neutral;
	const isMonster = npc.kind === "monster";
	const kindLabel = isMonster ? "Monstro" : "NPC";
	const SubtitleIcon = isMonster ? Skull : User;

	return (
		<Link
			to="/npcs/$npcId"
			params={{ npcId: npc.id }}
			search={{ edit: false }}
			className="group relative flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card-elevated p-4 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none"
		>
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
			/>

			<div className="flex items-start gap-3">
				<div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-fuchsia-500/10 ring-1 ring-fuchsia-500/20">
					{npc.imageUrl ? (
						<img
							src={npc.imageUrl}
							alt={npc.name}
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-[14px] font-bold text-fuchsia-300">
							{initials || "?"}
						</div>
					)}
					{!npc.isAlive && (
						<Skull className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-card p-0.5 text-rose-400 ring-1 ring-border" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<h3
						className={`font-display truncate text-[15px] font-bold ${importanceStyles[npc.importance]}`}
					>
						{npc.name || "Sem nome"}
					</h3>
					<p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<SubtitleIcon className="h-2.5 w-2.5" /> {npc.race || kindLabel}{" "}
						{npc.role && <>· {npc.role}</>}
					</p>
					<div className="mt-1.5 flex flex-wrap items-center gap-1">
						<span className="rounded bg-background/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border">
							{kindLabel}
						</span>
						<span
							className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ring-1 ${disposition.tone}`}
						>
							{disposition.label}
						</span>
						{npc.faction && (
							<span className="rounded bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground ring-1 ring-border">
								{npc.faction}
							</span>
						)}
						{npc.cr && (
							<span className="font-mono rounded bg-background/40 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-muted-foreground ring-1 ring-border">
								CR {npc.cr}
							</span>
						)}
					</div>
				</div>
			</div>

			{npc.location && (
				<div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
					<MapPin className="h-3 w-3 text-amber-300" />
					<span className="truncate">{npc.location}</span>
				</div>
			)}

			{linkedCharacter && (
				<div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary/15 active:scale-[0.98]">
					<FileText className="h-3 w-3" />
					Ficha: {linkedCharacter.characterName || "Sem nome"}
				</div>
			)}

			{npc.entityLinks?.length > 0 && (
				<div className="mt-3 border-t border-border/60 pt-3">
					<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
						{npc.entityLinks.length} conexao
						{npc.entityLinks.length === 1 ? "" : "es"}
					</span>
				</div>
			)}

			{npc.description && (
				<p className="mt-3 line-clamp-3 border-t border-border/60 pt-2.5 text-[11px] italic text-muted-foreground">
					“{npc.description}”
				</p>
			)}
		</Link>
	);
}
