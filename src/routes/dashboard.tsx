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
	Users,
} from "lucide-react";
import { useMemo } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { ArkhiveonGradientBackground } from "@/components/arkhiveon-gradient-background";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRPGStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
	component: Dashboard,
});

const sections = [
	{
		to: "/characters",
		title: "Elenco",
		description: "Visão narrativa",
		Icon: User,
		accent: "text-violet-300",
		tint: "bg-violet-500/10 border-violet-500/20",
		key: "characters" as const,
	},
	{
		to: "/npcs",
		title: "NPCs",
		description: "Aliados, inimigos e mistérios",
		Icon: Users,
		accent: "text-fuchsia-300",
		tint: "bg-fuchsia-500/10 border-fuchsia-500/20",
		key: "npcs" as const,
	},
	{
		to: "/sessions",
		title: "Sessões",
		description: "Crônicas das aventuras",
		Icon: ScrollText,
		accent: "text-amber-300",
		tint: "bg-amber-500/10 border-amber-500/20",
		key: "sessions" as const,
	},
	{
		to: "/items",
		title: "Itens",
		description: "Tesouros e relíquias",
		Icon: Package,
		accent: "text-emerald-300",
		tint: "bg-emerald-500/10 border-emerald-500/20",
		key: "items" as const,
	},
	{
		to: "/locations",
		title: "Locais",
		description: "Reinos e fronteiras",
		Icon: MapIcon,
		accent: "text-rose-300",
		tint: "bg-rose-500/10 border-rose-500/20",
		key: "locations" as const,
	},
	{
		to: "/lore",
		title: "Lore",
		description: "História e conhecimento",
		Icon: BookOpen,
		accent: "text-indigo-300",
		tint: "bg-indigo-500/10 border-indigo-500/20",
		key: "lores" as const,
	},
];

function Dashboard() {
	const characters = useRPGStore((s) => s.characters);
	const npcs = useRPGStore((s) => s.npcs);
	const sessions = useRPGStore((s) => s.sessions);
	const items = useRPGStore((s) => s.items);
	const locations = useRPGStore((s) => s.locations);
	const lores = useRPGStore((s) => s.lores);
	const activityLog = useRPGStore((s) => s.activityLog);
	const isLoading = useRPGStore((s) => s.isLoadingRemote);

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

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-6 py-10 sm:px-8">
			<section className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#080b1d] p-7 text-white shadow-xl shadow-black/10 sm:p-10">
				<ArkhiveonGradientBackground />
				<div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(8,11,29,0.88)_0%,rgba(8,11,29,0.62)_46%,rgba(8,11,29,0.34)_100%)]" />
				<div className="pointer-events-none absolute inset-0 z-[1] ring-1 ring-inset ring-white/10" />
				<div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-center">
					<div className="max-w-3xl">
						<p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
							Visão geral
						</p>
						<h1 className="font-display mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
							Sua campanha em foco
						</h1>
						<p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/72">
							Acompanhe os registros principais, retome a última sessão e acesse
							as coleções que mantêm o mundo organizado.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
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
							<Link to="/sessions">
								<Button variant="outline" className="h-11 gap-2 px-5 font-bold">
									<ScrollText className="h-4 w-4" />
									Registrar sessão
								</Button>
							</Link>
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
				{sections.map((section) => (
					<StatPill
						key={section.to}
						to={section.to}
						label={section.title}
						value={counts[section.key]}
						Icon={section.Icon}
						iconColor={section.accent}
						isLoading={isLoading}
					/>
				))}
			</section>

			<section className="space-y-5">
				<SectionHeading
					eyebrow="Coleções"
					title="Continue construindo o mundo"
					description="Acesse rapidamente personagens, sessões, itens e os detalhes do cenário."
				/>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{sections.map((section) => (
						<DashboardCard
							key={section.to}
							to={section.to}
							title={section.title}
							description={section.description}
							Icon={section.Icon}
							iconColor={section.accent}
							tint={section.tint}
							count={counts[section.key]}
							isLoading={isLoading}
						/>
					))}
				</div>
			</section>

			<section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
				<ActivityFeed limit={10} isLoading={isLoading} />
				<LastSessionCard lastSession={lastSession} isLoading={isLoading} />
			</section>
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
			className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card-elevated px-4 py-4 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-primary/30"
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
	tint: string;
	count: number;
	isLoading?: boolean;
}

function DashboardCard({
	to,
	title,
	description,
	Icon,
	iconColor,
	tint,
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
			className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-card-elevated p-6 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5"
		>
			<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
			<div className="flex items-start justify-between gap-4">
				<div
					className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tint} ${iconColor}`}
				>
					<Icon className="h-5 w-5" strokeWidth={1.7} />
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
			<aside className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/5">
				<div className="mb-5 flex items-center justify-between gap-3">
					<div className="space-y-2">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-6 w-36" />
					</div>
					<Skeleton className="h-5 w-5 rounded" />
				</div>
				<div className="rounded-xl border border-border/70 bg-card-elevated p-4">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="mt-3 h-6 w-3/4" />
					<div className="mt-4 space-y-2">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-2/3" />
					</div>
				</div>
			</aside>
		);
	}

	return (
		<aside className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/5">
			<div className="mb-5 flex items-center justify-between gap-3">
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
						Sessões
					</p>
					<h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
						Última sessão
					</h2>
				</div>
				<CalendarDays className="h-5 w-5 text-amber-300" strokeWidth={1.7} />
			</div>

			{lastSession ? (
				<Link
					to="/sessions"
					className="group block rounded-xl border border-border/70 bg-card-elevated p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35"
				>
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								{lastSession.date || "Sem data"}
							</p>
							<h3 className="font-display mt-2 text-xl font-bold text-foreground">
								{lastSession.title || "Sem título"}
							</h3>
						</div>
						<ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
					</div>
					<p className="mt-3 line-clamp-4 text-[12px] leading-relaxed text-muted-foreground">
						{lastSession.summary || "Ainda não há resumo para esta sessão."}
					</p>
				</Link>
			) : (
				<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
					<p className="text-[13px] font-bold text-foreground">
						Nenhuma sessão registrada
					</p>
					<p className="mt-1 text-[12px] text-muted-foreground">
						Quando uma sessão for criada, ela aparece aqui como destaque.
					</p>
				</div>
			)}
		</aside>
	);
}
