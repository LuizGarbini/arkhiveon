import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	BookOpen,
	CalendarDays,
	Clock3,
	type LucideIcon,
	MapIcon,
	Package,
	ScrollText,
	User,
	UserPlus,
	Users,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { CampaignForm } from "@/components/campaign-form";
import { DashboardHeroBackground } from "@/components/dashboard-hero-background";
import { InviteBanner } from "@/components/invite-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useActiveCampaignRole, useRPGStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
	component: Dashboard,
});

const sections = [
	{
		to: "/characters",
		title: "Personagens",
		description: "Visão narrativa",
		Icon: User,
		accent: "text-violet-300",
		key: "characters" as const,
	},
	{
		to: "/npcs",
		title: "NPCs",
		description: "Aliados, inimigos e mistérios",
		Icon: Users,
		accent: "text-fuchsia-300",
		key: "npcs" as const,
	},
	{
		to: "/sessions",
		title: "Sessões",
		description: "Crônicas das aventuras",
		Icon: ScrollText,
		accent: "text-amber-300",
		key: "sessions" as const,
	},
	{
		to: "/items",
		title: "Itens",
		description: "Tesouros e relíquias",
		Icon: Package,
		accent: "text-emerald-300",
		key: "items" as const,
	},
	{
		to: "/locations",
		title: "Locais",
		description: "Reinos e fronteiras",
		Icon: MapIcon,
		accent: "text-rose-300",
		key: "locations" as const,
	},
	{
		to: "/lore",
		title: "Lore",
		description: "História e conhecimento",
		Icon: BookOpen,
		accent: "text-indigo-300",
		key: "lores" as const,
	},
];

function Dashboard() {
	const onboardingNameId = useId();
	const onboardingDescId = useId();
	const characters = useRPGStore((s) => s.characters);
	const npcs = useRPGStore((s) => s.npcs);
	const sessions = useRPGStore((s) => s.sessions);
	const items = useRPGStore((s) => s.items);
	const locations = useRPGStore((s) => s.locations);
	const lores = useRPGStore((s) => s.lores);
	const activityLog = useRPGStore((s) => s.activityLog);
	const isLoading = useRPGStore((s) => s.isLoadingRemote);
	const loadInvites = useRPGStore((s) => s.loadInvites);

	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const activeCampaign = useMemo(
		() => campaigns.find((c) => c.id === activeCampaignId),
		[campaigns, activeCampaignId],
	);
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const activeCampaignRole = useActiveCampaignRole();
	const isViewer = activeCampaignRole === "viewer";

	const [firstCampaignName, setFirstCampaignName] = useState("");
	const [firstCampaignDesc, setFirstCampaignDesc] = useState("");
	const [isCreatingFirst, setIsCreatingFirst] = useState(false);
	const createCampaign = useRPGStore((s) => s.createCampaign);
	const switchCampaign = useRPGStore((s) => s.switchCampaign);
	const loadRemoteData = useRPGStore((s) => s.loadRemoteData);

	async function handleCreateFirstCampaign(e: React.FormEvent) {
		e.preventDefault();
		if (!firstCampaignName.trim() || isCreatingFirst) return;

		setIsCreatingFirst(true);
		try {
			const created = await createCampaign(
				firstCampaignName.trim(),
				firstCampaignDesc.trim(),
			);
			await switchCampaign(created.id);
			await loadRemoteData();
		} catch (err) {
			console.error("Erro ao criar primeira campanha:", err);
		} finally {
			setIsCreatingFirst(false);
		}
	}

	useEffect(() => {
		void loadInvites();
	}, [loadInvites]);

	const counts = useMemo(
		() => ({
			characters: characters.length,
			npcs: npcs.length,
			sessions: sessions.length,
			items: items.length,
			locations: locations.length,
			lores: lores.length,
		}),
		[
			characters.length,
			items.length,
			locations.length,
			lores.length,
			npcs.length,
			sessions.length,
		],
	);

	const totalEntries = Object.values(counts).reduce((a, b) => a + b, 0);

	const lastSession = useMemo(
		() =>
			sessions.reduce<(typeof sessions)[number] | undefined>(
				(latest, session) =>
					!latest || session.createdAt > latest.createdAt ? session : latest,
				undefined,
			),
		[sessions],
	);
	const lastActivity = activityLog[0];

	if (!isLoading && campaigns.length === 0) {
		return (
			<div className="flex min-h-[calc(100vh-6rem)] items-center justify-center p-6 w-full">
				<div className="panel w-full max-w-md p-8 relative overflow-hidden shadow-2xl">
					<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
					<div className="relative z-10 flex flex-col gap-6">
						<div>
							<h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
								Bem-vindo ao Arkhiveon!
							</h2>
							<p className="mt-2 text-sm text-muted-foreground">
								Para começar a organizar suas aventuras de RPG de mesa, crie sua
								primeira campanha.
							</p>
						</div>

						<form
							onSubmit={handleCreateFirstCampaign}
							className="flex flex-col gap-4"
						>
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor={onboardingNameId}
									className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
								>
									Nome da Campanha
								</label>
								<Input
									id={onboardingNameId}
									required
									placeholder="Ex: A Lenda de Baldur's Gate"
									value={firstCampaignName}
									onChange={(e) => setFirstCampaignName(e.target.value)}
									disabled={isCreatingFirst}
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<label
									htmlFor={onboardingDescId}
									className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
								>
									Descrição (Opcional)
								</label>
								<Textarea
									id={onboardingDescId}
									placeholder="Ex: Uma jornada épica pela Costa da Espada contra o culto dos Três Mortos..."
									value={firstCampaignDesc}
									onChange={(e) => setFirstCampaignDesc(e.target.value)}
									disabled={isCreatingFirst}
									rows={3}
								/>
							</div>

							<Button
								type="submit"
								loading={isCreatingFirst}
								loadingText="Criando Campanha..."
								disabled={!firstCampaignName.trim()}
								className="mt-2 gap-2 h-11 cursor-pointer"
							>
								Criar Minha Primeira Campanha
								<ArrowUpRight className="h-4 w-4" />
							</Button>
						</form>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-6 py-10 sm:px-8">
			<InviteBanner />

			<a
				href="https://discord.gg/64jBCNfzvd"
				target="_blank"
				rel="noopener noreferrer"
				className="group relative flex items-center justify-between rounded-2xl border border-border/70 bg-card-elevated p-4.5 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-[#5865F2]/40 active:scale-[0.985] active:translate-y-0"
			>
				<div className="flex items-center gap-3.5">
					<div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/10 text-[#5865F2] transition-colors group-hover:bg-[#5865F2]/20">
						<DiscordIcon className="h-5.5 w-5.5" />
					</div>
					<div className="flex flex-col">
						<span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#5865F2]">
							Comunidade
						</span>
						<span className="font-display mt-0.5 text-[14px] font-bold leading-tight text-foreground">
							Entrar no Discord
						</span>
						<span className="text-[11px] text-muted-foreground leading-tight">
							Conecte-se com outros mestres e jogadores para tirar dúvidas,
							compartilhar homebrews e jogar
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2 text-[11px] font-bold text-primary group-hover:text-[#5865F2] transition-colors">
					<span>Acessar servidor</span>
					<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
				</div>
			</a>

			<section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 p-7 shadow-xl shadow-black/5 sm:p-10">
				<DashboardHeroBackground />
				{/* Dark overlay for better text contrast */}
				<div className="absolute inset-0 z-[1] bg-black/35 rounded-[1.75rem]" />
				<div className="relative z-[2] grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-center">
					<div className="max-w-3xl">
						<p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
							Visão geral
						</p>
						<h1 className="font-display mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
							{activeCampaign ? activeCampaign.name : "Sua campanha em foco"}
						</h1>
						<p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/80">
							Acompanhe os registros principais, retome a última sessão e acesse
							as coleções que mantêm o mundo organizado.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							{isViewer ? (
								<div className="group/tooltip relative inline-block">
									<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
										Apenas mestre ou co-mestre podem criar fichas
									</div>
									<Button
										disabled
										className="h-11 gap-2 px-5 font-bold cursor-not-allowed opacity-50"
									>
										<User className="h-4 w-4" />
										Criar ficha
									</Button>
								</div>
							) : (
								<Link
									to="/sheets/new"
									aria-keyshortcuts="Alt+N"
									data-shortcut-action="new"
								>
									<Button className="h-11 gap-2 px-5 font-bold">
										<User className="h-4 w-4" />
										Criar ficha
									</Button>
								</Link>
							)}
							{isViewer ? (
								<div className="group/tooltip relative inline-block">
									<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
										Apenas mestre ou co-mestre podem registrar sessões
									</div>
									<Button
										disabled
										variant="outline"
										className="h-11 gap-2 border-white/10 bg-white/5 px-5 font-bold text-white/40 cursor-not-allowed opacity-50"
									>
										<ScrollText className="h-4 w-4" />
										Registrar sessão
									</Button>
								</div>
							) : (
								<Link to="/sessions">
									<Button
										variant="outline"
										className="h-11 gap-2 border-white/30 bg-white/10 px-5 font-bold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
									>
										<ScrollText className="h-4 w-4" />
										Registrar sessão
									</Button>
								</Link>
							)}
							{activeCampaign && activeCampaign.myRole === "owner" && (
								<Button
									type="button"
									variant="outline"
									onClick={() => setShowInviteDialog(true)}
									className="h-11 gap-2 border-white/30 bg-white/10 px-5 font-bold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
								>
									<UserPlus className="h-4 w-4" />
									Convidar Jogadores
								</Button>
							)}
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
						<MetricCard
							label="Registros"
							value={totalEntries}
							description="entradas no Arkhiveon"
							Icon={BookOpen}
							isLoading={isLoading}
						/>
						<MetricCard
							label="Eventos"
							value={activityLog.length}
							description={
								lastActivity
									? `último ${formatRelativeTime(lastActivity.timestamp)}`
									: "sem histórico"
							}
							Icon={Clock3}
							isLoading={isLoading}
						/>
						<MetricCard
							label="Sessões"
							value={sessions.length}
							description={
								lastSession
									? lastSession.title || "última sem título"
									: "nenhuma registrada"
							}
							Icon={ScrollText}
							isLoading={isLoading}
						/>
					</div>
				</div>
			</section>

			<section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				{sections.map((section, index) => (
					<div
						key={section.to}
						className="t-stagger-item"
						style={{ "--stagger-index": index } as React.CSSProperties}
					>
						<StatPill
							to={section.to}
							label={section.title}
							value={counts[section.key]}
							Icon={section.Icon}
							iconColor={section.accent}
							isLoading={isLoading}
						/>
					</div>
				))}
			</section>

			<section className="space-y-5">
				<SectionHeading
					eyebrow="Coleções"
					title="Continue construindo o mundo"
					description="Acesse rapidamente personagens, sessões, itens e os detalhes do cenário."
				/>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{sections.map((section, index) => (
						<div
							key={section.to}
							className="t-stagger-item"
							style={{ "--stagger-index": index + 3 } as React.CSSProperties}
						>
							<DashboardCard
								to={section.to}
								title={section.title}
								description={section.description}
								Icon={section.Icon}
								iconColor={section.accent}
								count={counts[section.key]}
								isLoading={isLoading}
							/>
						</div>
					))}
				</div>
			</section>

			<section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
				<ActivityFeed limit={6} isLoading={isLoading} />
				<LastSessionCard lastSession={lastSession} isLoading={isLoading} />
			</section>

			{showInviteDialog && activeCampaign && (
				<CampaignForm
					open={showInviteDialog}
					onOpenChange={setShowInviteDialog}
					campaign={activeCampaign}
					defaultTab="members"
				/>
			)}
		</div>
	);
}

interface StatPillProps {
	to: string;
	label: string;
	value: number;
	Icon: LucideIcon;
	iconColor: string;
	isLoading?: boolean;
}

function StatPill({
	to,
	label,
	value,
	Icon,
	iconColor,
	isLoading,
}: StatPillProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card-elevated px-4 py-4 shadow-sm shadow-black/5">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-5 w-8" />
				</div>
				<Skeleton className="h-8 w-8 rounded-lg" />
			</div>
		);
	}

	return (
		<Link
			to={to}
			className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card-elevated px-4 py-4 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.985] active:translate-y-0"
		>
			<div className="flex flex-col">
				<span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
					{label}
				</span>
				<span className="font-display mt-1 text-xl font-bold leading-none text-foreground">
					{value}
				</span>
			</div>
			<div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/60">
				<Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.7} />
			</div>
		</Link>
	);
}

interface DashboardCardProps {
	to: string;
	title: string;
	description: string;
	Icon: LucideIcon;
	iconColor: string;
	count: number;
	isLoading?: boolean;
}

function DashboardCard({
	to,
	title,
	description,
	Icon,
	iconColor,
	count,
	isLoading,
}: DashboardCardProps) {
	if (isLoading) {
		return (
			<div className="rounded-2xl border border-border/70 bg-card-elevated p-6 shadow-sm shadow-black/5">
				<div className="flex items-start justify-between gap-4">
					<Skeleton className="h-11 w-11 rounded-xl" />
					<div className="flex flex-col items-end gap-2">
						<Skeleton className="h-8 w-12" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>
				<div className="mt-6 space-y-2">
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-3/4" />
				</div>
				<div className="mt-6 border-t border-border/60 pt-4">
					<Skeleton className="h-4 w-24" />
				</div>
			</div>
		);
	}

	return (
		<Link
			to={to}
			className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-card-elevated p-6 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0"
		>
			<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
			<div className="flex items-start justify-between gap-4">
				<div
					className={`flex h-11 w-11 shrink-0 items-center justify-center ${iconColor}`}
				>
					<Icon className="h-6 w-6" strokeWidth={1.5} />
				</div>
				<div className="text-right">
					<span className="font-display text-3xl font-bold leading-none text-foreground">
						{count}
					</span>
					<p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						registros
					</p>
				</div>
			</div>

			<div className="mt-6">
				<h3 className="text-[15px] font-bold text-foreground transition-colors group-hover:text-primary">
					{title}
				</h3>
				<p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>

			<div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-[12px] font-bold text-primary">
				<span>Abrir coleção</span>
				<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
			</div>
		</Link>
	);
}

function MetricCard({
	label,
	value,
	description,
	Icon,
	isLoading,
}: {
	label: string;
	value: number;
	description: string;
	Icon: LucideIcon;
	isLoading?: boolean;
}) {
	if (isLoading) {
		return (
			<div className="rounded-2xl border border-border/70 bg-background/80 md:bg-background/45 p-5 shadow-sm shadow-black/5 md:backdrop-blur-sm">
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-4 w-4 rounded" />
				</div>
				<Skeleton className="mt-3 h-8 w-14" />
				<Skeleton className="mt-2 h-3 w-28" />
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-border/70 bg-background/80 md:bg-background/45 p-5 shadow-sm shadow-black/5 md:backdrop-blur-sm">
			<div className="flex items-center justify-between gap-3">
				<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
					{label}
				</p>
				<Icon className="h-4 w-4 text-primary" strokeWidth={1.7} />
			</div>
			<p className="font-display mt-3 text-3xl font-bold leading-none text-foreground">
				{value}
			</p>
			<p className="mt-2 truncate text-[12px] text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function SectionHeading({
	eyebrow,
	title,
	description,
}: {
	eyebrow: string;
	title: string;
	description: string;
}) {
	return (
		<div className="flex max-w-2xl flex-col gap-2">
			<p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground heading-rule">
				{eyebrow}
			</p>
			<h2 className="text-2xl font-bold tracking-tight text-foreground">
				{title}
			</h2>
			<p className="text-[13px] leading-6 text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function LastSessionCard({
	lastSession,
	isLoading,
}: {
	lastSession:
		| {
				title: string;
				date: string;
				summary: string;
				createdAt: number;
		  }
		| undefined;
	isLoading?: boolean;
}) {
	if (isLoading) {
		return (
			<aside className="rounded-2xl border border-border/70 bg-card-elevated p-6 shadow-sm shadow-black/5 h-full">
				<div className="mb-5 flex items-center justify-between gap-3">
					<div className="space-y-2">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-6 w-36" />
					</div>
					<Skeleton className="h-5 w-5 rounded" />
				</div>
				<div className="rounded-xl border border-border/50 bg-background/50 p-5 flex-1 space-y-4">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="mt-3 h-7 w-3/4" />
					<div className="mt-4 space-y-2">
						<Skeleton className="h-3.5 w-full" />
						<Skeleton className="h-3.5 w-full" />
						<Skeleton className="h-3.5 w-2/3" />
					</div>
				</div>
			</aside>
		);
	}

	return (
		<aside className="rounded-2xl border border-border/70 bg-card-elevated p-6 shadow-sm shadow-black/5 h-full">
			<div className="mb-5 flex items-center justify-between gap-3">
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
						Sessões
					</p>
					<h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
						Última sessão
					</h2>
				</div>
				<CalendarDays
					className="h-5 w-5 text-primary animate-pulse-slow"
					strokeWidth={1.7}
				/>
			</div>

			{lastSession ? (
				<Link
					to="/sessions"
					className="group block rounded-xl border border-border/50 bg-background/40 p-5 transition-all hover:border-primary/30 hover:bg-background/60"
				>
					<div className="flex items-center justify-between border-b border-border/40 pb-2.5">
						<span className="text-[11px] font-bold uppercase tracking-wider text-primary">
							{lastSession.date || "Sem data"}
						</span>
						<ArrowUpRight className="h-4.5 w-4.5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
					</div>

					<h3 className="font-display mt-4 text-xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
						{lastSession.title || "Sem título"}
					</h3>

					<p className="mt-3.5 line-clamp-4 text-[13px] leading-relaxed text-muted-foreground font-medium">
						{lastSession.summary || "Ainda não há resumo para esta sessão."}
					</p>

					<div className="mt-6 flex items-center gap-1.5 text-[12px] font-bold text-primary/95 pt-4 border-t border-border/30">
						<span>Ver crônicas</span>
						<span className="transition-transform group-hover:translate-x-0.5">
							→
						</span>
					</div>
				</Link>
			) : (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-12 text-center bg-background/20">
					<div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center mb-3 text-muted-foreground/45">
						<CalendarDays className="h-5 w-5 text-primary/60" />
					</div>
					<p className="text-[13px] font-bold text-foreground">
						Nenhuma sessão registrada
					</p>
					<p className="mt-1 max-w-[200px] text-[11px] leading-normal text-muted-foreground/60 font-medium">
						Comece registrando o diário da sua primeira sessão de aventura!
					</p>
					<Link to="/sessions" className="mt-4">
						<Button size="sm" variant="outline">
							Registrar Sessão
						</Button>
					</Link>
				</div>
			)}
		</aside>
	);
}

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 127.14 96.36"
			fill="currentColor"
			role="img"
			aria-label="Discord"
			{...props}
		>
			<path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.8,6.83,77.19,77.19,0,0,0,49.5,0,105.15,105.15,0,0,0,19.06,8.07C3.58,31.21-1.92,53.7,1,75.87a107.94,107.94,0,0,0,32,16.15,86.23,86.23,0,0,0,6.72-11A72.82,72.82,0,0,1,25,74.55c.9-.66,1.8-1.34,2.66-2a74.75,74.75,0,0,0,79,0c.87.69,1.76,1.37,2.66,2a72.82,72.82,0,0,1-14.73,6.51,86.23,86.23,0,0,0,6.72,11,107.94,107.94,0,0,0,32-16.15C129.8,49.12,123.63,26.83,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.35,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
		</svg>
	);
}
