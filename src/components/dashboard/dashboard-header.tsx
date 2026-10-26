import { Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Crown,
	Package,
	Plus,
	Scroll,
	ScrollText,
	Shield,
	Sparkles,
	Swords,
	User,
} from "lucide-react";
import type { CSSProperties } from "react";
import { DashboardHeroBackground } from "@/components/dashboard-hero-background";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { systemLabel } from "@/lib/store/helpers";
import type { Campaign, MembershipRole } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { DashboardCount, type DashboardCountStatus } from "./dashboard-count";
import { DashboardHeroStatusBand } from "./dashboard-load-error";
import { DashboardSkeletonGroup, SkeletonLine } from "./dashboard-skeleton";

/** Mesma caixa dos selos reais (borda, ícone e texto) para a quebra não mudar. */
const SEAL_BOX =
	"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs";

const SYSTEM_SEAL_FALLBACK = systemLabel("dnd5e");
const ROLE_SEAL_FALLBACK = "Mestre da Mesa";

function roleSealLabel(role: MembershipRole | undefined): string {
	if (role === "owner") return "Mestre da Mesa";
	if (role === "editor") return "Co-Mestre";
	return "Jogador (Visualizador)";
}

function SealSizer({
	label,
	textClassName,
}: {
	label: string;
	textClassName: string;
}) {
	return (
		<span
			aria-hidden="true"
			data-seal-label={label}
			// O texto fica só no ::before: reserva a largura do selo real sem
			// entrar na árvore de acessibilidade nem no texto visível.
			style={
				{
					"--seal-label": `"${label.replace(/["\\]/g, "")}"`,
				} as CSSProperties
			}
			className={cn(
				SEAL_BOX,
				"invisible border-transparent before:content-[var(--seal-label)]",
				textClassName,
			)}
		>
			<span className="h-3.5 w-3.5 shrink-0" />
		</span>
	);
}

function SealSkeleton({
	label,
	textClassName,
	seal,
	statusLabel,
}: {
	label: string;
	textClassName: string;
	seal: "system" | "role";
	statusLabel?: string;
}) {
	const bar = (
		<>
			<SealSizer label={label} textClassName={textClassName} />
			<Skeleton className="absolute inset-0 rounded-full bg-muted-foreground/20" />
		</>
	);
	if (statusLabel) {
		return (
			<output
				data-seal={seal}
				className="dashboard-skeleton relative inline-flex max-w-full"
				aria-label={statusLabel}
			>
				{bar}
			</output>
		);
	}
	return (
		<span
			data-seal={seal}
			className="dashboard-skeleton relative inline-flex max-w-full"
		>
			{bar}
		</span>
	);
}

/** Segura a altura do selo no erro, sem texto de papel e sem pulso de carga. */
function SealSpacer({
	label,
	textClassName,
	seal,
}: {
	label: string;
	textClassName: string;
	seal: "system" | "role";
}) {
	return (
		<span data-seal={seal} className="inline-flex max-w-full">
			<SealSizer label={label} textClassName={textClassName} />
		</span>
	);
}

const SESSION_BUTTON_CLASS =
	"h-[38px] gap-2 rounded-xl px-4.5 text-[13px] font-bold select-none";

interface DashboardHeaderProps {
	activeCampaign?: Campaign;
	campaignRole?: MembershipRole;
	isViewer: boolean;
	counts: {
		characters: number;
		npcs: number;
		sessions: number;
		quests: number;
		items: number;
		locations: number;
		lores: number;
	};
	countStatus?: DashboardCountStatus;
	/** Retrato da mesa já veio do servidor (o sistema do cache pode faltar). */
	hasCampaignSnapshot?: boolean;
	isBaseLoadSlow?: boolean;
	onRetryBaseLoad?: () => void;
}

export function DashboardHeader({
	activeCampaign,
	campaignRole,
	isViewer,
	counts,
	countStatus = "ready",
	hasCampaignSnapshot = true,
	isBaseLoadSlow = false,
	onRetryBaseLoad,
}: DashboardHeaderProps) {
	const systemName = activeCampaign?.system
		? activeCampaign.system === "ordem"
			? "Ordem Paranormal 👁️"
			: systemLabel(activeCampaign.system)
		: null;

	const roleLabel = roleSealLabel(campaignRole);
	// Sem papel no cache, reserva o selo do mestre (o caso que quebra em 2 linhas).
	const reservedRoleLabel = campaignRole ? roleLabel : ROLE_SEAL_FALLBACK;
	// Sem mesa ativa o retrato da lista ainda não diz o sistema. Reserva o
	// selo mesmo com as campanhas já no store (o caso "mesa sem sistema" segue
	// sem selo: a mesa existe e o campo veio vazio).
	const reserveUnknownSystem =
		countStatus !== "ready" &&
		!systemName &&
		(!hasCampaignSnapshot || !activeCampaign);
	const systemSealText =
		systemName ?? (reserveUnknownSystem ? SYSTEM_SEAL_FALLBACK : null);
	const showSessionButton = !(countStatus === "ready" && isViewer);

	return (
		<header
			data-dash-section="hero"
			className="relative overflow-hidden rounded-[1.85rem] border border-border/70 p-8 sm:p-11 lg:p-12 shadow-2xl shadow-black/10"
		>
			{/* Dynamic Shader Mesh Gradient with instant CSS fallback */}
			<DashboardHeroBackground />
			{/* Soft vignette for text contrast */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 z-[1] rounded-[1.85rem] bg-gradient-to-br from-black/45 via-black/15 to-black/35"
			/>

			<div className="relative z-[2] flex flex-col">
				<DashboardHeroStatusBand
					isError={countStatus === "error"}
					isSlow={isBaseLoadSlow}
					onRetry={onRetryBaseLoad}
				/>
				<div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-center">
					{/* Left Column: Campaign Hero Details & Primary Action */}
					<div className="max-w-3xl">
						<div className="flex flex-wrap items-center gap-2.5 select-none">
							<span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-200 backdrop-blur-md">
								<Sparkles className="h-3.5 w-3.5 text-purple-300" />
								Visão Geral
							</span>

							{countStatus === "loading" && systemSealText ? (
								<SealSkeleton
									seal="system"
									label={systemSealText}
									textClassName="font-semibold"
								/>
							) : systemName ? (
								<span
									className={cn(
										SEAL_BOX,
										"border-white/20 bg-black/40 font-semibold text-white backdrop-blur-md",
									)}
								>
									<Swords className="h-3.5 w-3.5 text-purple-300" />
									{systemName}
								</span>
							) : systemSealText ? (
								<SealSpacer
									seal="system"
									label={systemSealText}
									textClassName="font-semibold"
								/>
							) : null}

							{/* Papel só com o dado real: skeleton do mesmo tamanho na carga,
						    espaço invisível no erro (antes mostrava o cache ou "Jogador"). */}
							{countStatus === "loading" ? (
								<SealSkeleton
									seal="role"
									label={reservedRoleLabel}
									textClassName="font-medium"
									statusLabel="Carregando papel na mesa"
								/>
							) : countStatus === "ready" ? (
								<span
									className={cn(
										SEAL_BOX,
										"border-white/20 bg-black/40 font-medium text-white/90 backdrop-blur-md",
									)}
								>
									{campaignRole === "owner" ? (
										<Crown className="h-3.5 w-3.5 text-amber-400" />
									) : (
										<Shield className="h-3.5 w-3.5 text-purple-300" />
									)}
									{roleLabel}
								</span>
							) : (
								<SealSpacer
									seal="role"
									label={reservedRoleLabel}
									textClassName="font-medium"
								/>
							)}
						</div>

						<h1 className="font-display mt-4 min-h-[2lh] text-3xl font-bold leading-[1.08] tracking-tight text-white sm:min-h-0 sm:text-4xl lg:text-5xl drop-shadow-xs">
							{activeCampaign?.name ||
								(countStatus === "loading" ? (
									<DashboardSkeletonGroup>
										<SkeletonLine
											textClassName="text-3xl font-bold leading-[1.08] sm:text-4xl lg:text-5xl"
											className="w-3/5 bg-muted-foreground/20"
										/>
									</DashboardSkeletonGroup>
								) : (
									"Campanha em Foco"
								))}
						</h1>

						<p className="mt-3.5 max-w-2xl text-[14px] sm:text-base leading-relaxed text-white/85 font-normal">
							{activeCampaign?.description?.trim() ||
								"Acompanhe os registros principais, retome a última sessão e acesse as coleções que mantêm o mundo organizado."}
						</p>

						{/* Registrar Sessão ocupa o lugar desde o início. Só sai quando
					    o papel já é jogador — enquanto é desconhecido, fica desativado. */}
						{showSessionButton ? (
							<div className="mt-5 flex flex-wrap items-center gap-3">
								{countStatus === "ready" ? (
									<Link to="/sessions" className="inline-flex h-[38px]">
										<Button
											className={cn(
												SESSION_BUTTON_CLASS,
												"bg-purple-600 text-white shadow-md shadow-purple-950/50 transition-all duration-150 ease-out hover:bg-purple-500 active:scale-[0.98]",
											)}
										>
											<Plus className="h-3.5 w-3.5" />
											Registrar Sessão
										</Button>
									</Link>
								) : (
									<Button
										disabled
										className={cn(
											SESSION_BUTTON_CLASS,
											"cursor-not-allowed border border-white/10 bg-white/5 text-white/40 opacity-50 backdrop-blur-sm",
										)}
									>
										<Plus className="h-3.5 w-3.5" />
										Registrar Sessão
									</Button>
								)}
							</div>
						) : null}
					</div>

					{/* Right Column: 4 Translucent Metric Cards (Clickable) */}
					<div className="grid grid-cols-2 gap-3.5 sm:gap-4 select-none">
						{/* 1. Personagens */}
						<div className="group t-hover-lift relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4.5 sm:p-5 shadow-sm shadow-black/5 backdrop-blur-md hover:border-purple-400/50 hover:bg-white/15">
							<Link
								to="/characters"
								aria-label={"Abrir Personagens"}
								className="absolute inset-0 z-[1] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
							<div className="flex items-center justify-between gap-2 w-full">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-white/75 whitespace-nowrap">
									Personagens
								</p>
								<div className="t-icon-spring flex h-7.5 w-7.5 min-h-[30px] min-w-[30px] max-h-[30px] max-w-[30px] shrink-0 aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 group-hover:border-purple-500/40 group-hover:bg-purple-500/20 group-hover:text-purple-300">
									<User className="h-3.5 w-3.5 shrink-0" />
								</div>
							</div>
							<div className="mt-3">
								<p className="font-display text-3xl sm:text-4xl font-bold leading-none text-white tabular-nums">
									<DashboardCount
										value={counts.characters}
										status={countStatus}
										label="personagens"
									/>
								</p>
								<div className="mt-1.5 flex items-center justify-between text-xs text-white/80">
									<span>Fichas ativas</span>
									<ArrowUpRight className="t-arrow-reveal h-3.5 w-3.5 text-purple-300" />
								</div>
							</div>
						</div>

						{/* 2. Sessões */}
						<div className="group t-hover-lift relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4.5 sm:p-5 shadow-sm shadow-black/5 backdrop-blur-md hover:border-violet-400/50 hover:bg-white/15">
							<Link
								to="/sessions"
								aria-label={"Abrir Sessões"}
								className="absolute inset-0 z-[1] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
							<div className="flex items-center justify-between gap-2 w-full">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-white/75 whitespace-nowrap">
									Sessões
								</p>
								<div className="t-icon-spring flex h-7.5 w-7.5 min-h-[30px] min-w-[30px] max-h-[30px] max-w-[30px] shrink-0 aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 group-hover:border-violet-500/40 group-hover:bg-violet-500/20 group-hover:text-violet-300">
									<ScrollText className="h-3.5 w-3.5 shrink-0" />
								</div>
							</div>
							<div className="mt-3">
								<p className="font-display text-3xl sm:text-4xl font-bold leading-none text-white tabular-nums">
									<DashboardCount
										value={counts.sessions}
										status={countStatus}
										label="sessões"
									/>
								</p>
								<div className="mt-1.5 flex items-center justify-between text-xs text-white/80">
									<span>Crônicas</span>
									<ArrowUpRight className="t-arrow-reveal h-3.5 w-3.5 text-violet-300" />
								</div>
							</div>
						</div>

						{/* 3. Missões */}
						<div className="group t-hover-lift relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4.5 sm:p-5 shadow-sm shadow-black/5 backdrop-blur-md hover:border-amber-400/50 hover:bg-white/15">
							<Link
								to="/quests"
								aria-label={"Abrir Missões"}
								className="absolute inset-0 z-[1] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
							<div className="flex items-center justify-between gap-2 w-full">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-white/75 whitespace-nowrap">
									Missões
								</p>
								<div className="t-icon-spring flex h-7.5 w-7.5 min-h-[30px] min-w-[30px] max-h-[30px] max-w-[30px] shrink-0 aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 group-hover:border-amber-500/40 group-hover:bg-amber-500/20 group-hover:text-amber-300">
									<Scroll className="h-3.5 w-3.5 shrink-0" />
								</div>
							</div>
							<div className="mt-3">
								<p className="font-display text-3xl sm:text-4xl font-bold leading-none text-white tabular-nums">
									<DashboardCount
										value={counts.quests}
										status={countStatus}
										label="missões"
									/>
								</p>
								<div className="mt-1.5 flex items-center justify-between text-xs text-white/80">
									<span>Objetivos</span>
									<ArrowUpRight className="t-arrow-reveal h-3.5 w-3.5 text-amber-300" />
								</div>
							</div>
						</div>

						{/* 4. Itens & Tesouros */}
						<div className="group t-hover-lift relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4.5 sm:p-5 shadow-sm shadow-black/5 backdrop-blur-md hover:border-emerald-400/50 hover:bg-white/15">
							<Link
								to="/items"
								aria-label={"Abrir Itens"}
								className="absolute inset-0 z-[1] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
							<div className="flex items-center justify-between gap-2 w-full">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-white/75 whitespace-nowrap">
									Itens
								</p>
								<div className="t-icon-spring flex h-7.5 w-7.5 min-h-[30px] min-w-[30px] max-h-[30px] max-w-[30px] shrink-0 aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/20 group-hover:text-emerald-300">
									<Package className="h-3.5 w-3.5 shrink-0" />
								</div>
							</div>
							<div className="mt-3">
								<p className="font-display text-3xl sm:text-4xl font-bold leading-none text-white tabular-nums">
									<DashboardCount
										value={counts.items}
										status={countStatus}
										label="itens"
									/>
								</p>
								<div className="mt-1.5 flex items-center justify-end text-xs text-white/80">
									<ArrowUpRight className="t-arrow-reveal h-3.5 w-3.5 text-emerald-300" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
