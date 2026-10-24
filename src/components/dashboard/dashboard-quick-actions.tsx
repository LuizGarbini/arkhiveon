import { Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Compass,
	Package,
	Sparkles,
	UserPlus,
	Users,
} from "lucide-react";
import { PartyLootDialog } from "@/components/party-loot-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Campaign, MembershipRole } from "@/lib/store/types";
import { DashboardSectionUnavailable } from "./dashboard-load-error";

interface DashboardQuickActionsProps {
	activeCampaign?: Campaign;
	campaignRole?: MembershipRole;
	isViewer: boolean;
	onInviteClick: () => void;
	unclaimedLootCount: number;
	isLoading?: boolean;
	/** Falha global da carga: estado neutro, sem vazio, CTA ou contagem. */
	isUnavailable?: boolean;
}

export function DashboardQuickActions({
	activeCampaign,
	isViewer,
	onInviteClick,
	unclaimedLootCount,
	isLoading,
	isUnavailable,
}: DashboardQuickActionsProps) {
	if (isUnavailable) {
		return (
			<DashboardSectionUnavailable
				title="Ações da Mesa"
				icon={<Sparkles className="h-4 w-4" />}
			/>
		);
	}

	if (isLoading) {
		return (
			<div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
				<Skeleton className="h-5 w-36 mb-4" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-14 w-full rounded-xl" />
					<Skeleton className="h-14 w-full rounded-xl" />
					<Skeleton className="h-14 w-full rounded-xl" />
					<Skeleton className="h-14 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
			<div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
				<div className="flex items-center gap-2 select-none">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
						<Sparkles className="h-3.5 w-3.5" />
					</div>
					<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
						Ações da Mesa
					</h3>
				</div>
				<span className="text-[10px] font-semibold text-muted-foreground select-none">
					Ferramentas
				</span>
			</div>

			<div className="flex flex-col gap-2">
				{/* 1. Mesa Virtual VTT */}
				{activeCampaign && (
					<Link
						to="/campaigns/$campaignId/vtt"
						params={{ campaignId: activeCampaign.id }}
						className="group t-hover-lift flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-2.5 sm:p-3 hover:border-purple-500/40 hover:bg-background/80 select-none"
					>
						<div className="flex items-center gap-3 min-w-0">
							<div className="t-icon-spring flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400 group-hover:border-purple-500/40 group-hover:bg-purple-500/20 group-hover:text-purple-300">
								<Compass className="h-4 w-4" />
							</div>
							<div className="min-w-0">
								<span className="text-xs font-semibold text-foreground group-hover:text-purple-300 transition-colors block truncate">
									Mesa Virtual (VTT)
								</span>
								<span className="text-[11px] text-muted-foreground block truncate">
									Grid tático, mapas & combate
								</span>
							</div>
						</div>
						<span className="inline-flex items-center gap-0.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300 group-hover:bg-purple-500/20 transition-colors shrink-0 ml-2">
							<span>Abrir</span>
							<ArrowUpRight className="h-3 w-3" />
						</span>
					</Link>
				)}

				{/* 2. Mochila do Grupo */}
				<PartyLootDialog
					trigger={
						<button
							type="button"
							className="group t-hover-lift flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 p-2.5 sm:p-3 text-left hover:border-amber-500/40 hover:bg-background/80 cursor-pointer select-none"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="t-icon-spring flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 group-hover:border-amber-500/40 group-hover:bg-amber-500/20 group-hover:text-amber-300">
									<Package className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<span className="text-xs font-semibold text-foreground group-hover:text-amber-300 transition-colors block truncate">
										Mochila do Grupo
									</span>
									<span className="text-[11px] text-muted-foreground block truncate">
										Tesouros e saques compartilhados
									</span>
								</div>
							</div>
							<span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 tabular-nums shrink-0 ml-2 group-hover:bg-amber-500/20 transition-colors">
								{unclaimedLootCount}{" "}
								{unclaimedLootCount === 1 ? "item" : "itens"}
							</span>
						</button>
					}
				/>

				{/* 3. Criar Ficha */}
				{!isViewer ? (
					<Link
						to="/sheets/new"
						className="group t-hover-lift flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-2.5 sm:p-3 hover:border-violet-500/40 hover:bg-background/80 select-none"
					>
						<div className="flex items-center gap-3 min-w-0">
							<div className="t-icon-spring flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-400 group-hover:border-violet-500/40 group-hover:bg-violet-500/20 group-hover:text-violet-300">
								<UserPlus className="h-4 w-4" />
							</div>
							<div className="min-w-0">
								<span className="text-xs font-semibold text-foreground group-hover:text-violet-300 transition-colors block truncate">
									Nova Ficha de Jogador
								</span>
								<span className="text-[11px] text-muted-foreground block truncate">
									Criar novo aventureiro na campanha
								</span>
							</div>
						</div>
						<span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-300 group-hover:bg-violet-500/20 transition-colors shrink-0 ml-2">
							+ Criar
						</span>
					</Link>
				) : (
					<div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/20 p-2.5 sm:p-3 opacity-50 cursor-not-allowed select-none">
						<div className="flex items-center gap-3 min-w-0">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/20 text-muted-foreground">
								<UserPlus className="h-4 w-4" />
							</div>
							<div className="min-w-0">
								<span className="text-xs font-semibold text-muted-foreground truncate block">
									Nova Ficha
								</span>
								<span className="text-[11px] text-muted-foreground truncate block">
									Permissão apenas para leitura
								</span>
							</div>
						</div>
					</div>
				)}

				{/* 4. Convidar Jogadores */}
				{activeCampaign && activeCampaign.myRole === "owner" ? (
					<button
						type="button"
						onClick={onInviteClick}
						className="group t-hover-lift flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-2.5 sm:p-3 text-left hover:border-emerald-500/40 hover:bg-background/80 cursor-pointer select-none"
					>
						<div className="flex items-center gap-3 min-w-0">
							<div className="t-icon-spring flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/20 group-hover:text-emerald-300">
								<Users className="h-4 w-4" />
							</div>
							<div className="min-w-0">
								<span className="text-xs font-semibold text-foreground group-hover:text-emerald-300 transition-colors block truncate">
									Convidar Jogadores
								</span>
								<span className="text-[11px] text-muted-foreground block truncate">
									Gerenciar membros e permissões
								</span>
							</div>
						</div>
						<span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0 ml-2">
							Membros
						</span>
					</button>
				) : (
					<Link
						to="/sessions"
						className="group flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-2.5 sm:p-3 transition-all duration-150 ease-out hover:border-primary/40 hover:bg-background/80 active:scale-[0.985] select-none"
					>
						<div className="flex items-center gap-3 min-w-0">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary group-hover:border-primary/40 group-hover:bg-primary/20 transition-colors">
								<Users className="h-4 w-4" />
							</div>
							<div className="min-w-0">
								<span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block truncate">
									Crônicas & Sessões
								</span>
								<span className="text-[11px] text-muted-foreground block truncate">
									Acessar histórico de partidas
								</span>
							</div>
						</div>
						<span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary group-hover:bg-primary/20 transition-colors shrink-0 ml-2">
							Ver
						</span>
					</Link>
				)}
			</div>
		</div>
	);
}
