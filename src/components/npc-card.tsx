import { Link, useNavigate } from "@tanstack/react-router";
import { useToast } from "@/components/ui/toast";
import type { Npc } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { Button } from "./ui/button";
import { EntityActions } from "./entity-actions";

interface NpcCardProps {
	npc?: Npc;
	isLoading?: boolean;
}

const dispositionStyles: Record<string, { label: string; tone: string }> = {
	hostile: {
		label: "Hostil",
		tone: "text-rose-200 bg-rose-500/25 border-rose-500/30",
	},
	unfriendly: {
		label: "Antipático",
		tone: "text-orange-200 bg-orange-500/25 border-orange-500/30",
	},
	neutral: {
		label: "Neutro",
		tone: "text-white/80 bg-white/10 border-white/20",
	},
	friendly: {
		label: "Amigável",
		tone: "text-emerald-200 bg-emerald-500/25 border-emerald-500/30",
	},
	ally: {
		label: "Aliado",
		tone: "text-sky-200 bg-sky-500/25 border-sky-500/30",
	},
};

const importanceLabels: Record<string, string> = {
	minor: "Menor",
	supporting: "Secundário",
	major: "Principal",
	boss: "Chefe",
	unknown: "—",
};

export function NpcCard({ npc, isLoading }: NpcCardProps) {
	const removeNpc = useRPGStore((s) => s.removeNpc);
	const navigate = useNavigate();
	const toast = useToast();
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
					<div className="h-4 w-1/4 rounded-md bg-white/5 mt-1" />
				</div>
				<div className="space-y-3 border-t border-white/5 pt-4">
					<div className="grid grid-cols-3 gap-2 text-center">
						<div className="space-y-1">
							<div className="h-4 w-8 mx-auto rounded bg-white/10" />
							<div className="h-2 w-10 mx-auto rounded bg-white/5" />
						</div>
						<div className="space-y-1">
							<div className="h-4 w-8 mx-auto rounded bg-white/10" />
							<div className="h-2 w-10 mx-auto rounded bg-white/5" />
						</div>
						<div className="space-y-1">
							<div className="h-4 w-12 mx-auto rounded bg-white/10" />
							<div className="h-2 w-10 mx-auto rounded bg-white/5" />
						</div>
					</div>
					<div className="h-8 w-full rounded-full bg-white/10" />
				</div>
			</div>
		);
	}

	const disposition =
		dispositionStyles[npc.disposition] ?? dispositionStyles.neutral;
	const isMonster = npc.kind === "monster";
	const kindLabel = isMonster ? "Monstro" : "NPC";
	const npcName = npc.name || "Sem nome";
	const linkCount = npc.entityLinks?.length ?? 0;
	const importanceLabel =
		importanceLabels[npc.importance] ?? importanceLabels.unknown;

	function handleDeleteNpc() {
		removeNpc(npc.id);
		toast.success({
			title: `${kindLabel} excluído com sucesso`,
			description: `${npcName} foi removido da campanha.`,
		});
	}

	return (
		<Link
			to="/npcs/$npcId"
			params={{ npcId: npc.id }}
			search={{ edit: false }}
			className="group relative flex min-h-[340px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card-elevated shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0"
		>
			<div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-fuchsia-500/10 via-transparent to-primary/5" />

			{/* Ações (Editar/Excluir) */}
			<div className="absolute right-2 top-2 z-20">
				<EntityActions
					onEdit={() =>
						void navigate({
							to: "/npcs/$npcId",
							params: { npcId: npc.id },
							search: { edit: true },
						})
					}
					onDelete={handleDeleteNpc}
					entityName={npcName}
					entityKindLabel={kindLabel}
				/>
			</div>

			{/* Cabeçalho do Card */}
			<div className="p-4 pt-5">
				<h3 className="font-display truncate text-xl font-bold tracking-tight text-foreground">
					{npcName}
				</h3>
				<div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
					<span className="truncate">{npc.race || kindLabel}</span>
					{npc.role && (
						<>
							<span className="opacity-50">·</span>
							<span className="truncate">{npc.role}</span>
						</>
					)}
				</div>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<span className="rounded bg-fuchsia-500/25 border border-fuchsia-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-200">
						{kindLabel}
					</span>
					<span
						className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${disposition.tone}`}
					>
						{disposition.label}
					</span>
					{!npc.isAlive && (
						<span className="rounded bg-rose-500/25 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-200">
							Morto
						</span>
					)}
				</div>
			</div>

			{/* Estatísticas e Botão na Base */}
			<div className="p-4 pb-5 space-y-4">
				<div className="flex flex-col gap-3 border-t border-border/60 pt-4">
					<div className="grid grid-cols-3 gap-2 text-center">
						<div className="flex flex-col">
							<span className="text-base font-bold text-foreground leading-none truncate">
								{npc.cr || importanceLabel}
							</span>
							<span className="text-[8px] text-muted-foreground uppercase tracking-wider mt-1.5">
								{npc.cr ? "CR" : "Importância"}
							</span>
						</div>
						<div className="flex flex-col">
							<span className="text-base font-bold text-foreground leading-none truncate">
								{npc.location || "—"}
							</span>
							<span className="text-[8px] text-muted-foreground uppercase tracking-wider mt-1.5">
								Local
							</span>
						</div>
						<div className="flex flex-col">
							<span className="text-base font-bold text-foreground leading-none">
								{linkedCharacter
									? "Ficha"
									: linkCount > 0
										? String(linkCount)
										: "—"}
							</span>
							<span className="text-[8px] text-muted-foreground uppercase tracking-wider mt-1.5">
								{linkedCharacter ? "Vinculado" : "Vínculos"}
							</span>
						</div>
					</div>

					<Button
						variant="secondary"
						className="w-full h-8 text-xs transition-all duration-200"
					>
						Abrir {kindLabel}
					</Button>
				</div>
			</div>
		</Link>
	);
}
