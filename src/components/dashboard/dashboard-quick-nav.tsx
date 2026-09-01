import { Link } from "@tanstack/react-router";
import {
	BookOpen,
	Flag,
	FolderTree,
	MapIcon,
	Package,
	Scroll,
	ScrollText,
	User,
	Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardQuickNavProps {
	counts: {
		characters: number;
		npcs: number;
		sessions: number;
		quests: number;
		items: number;
		locations: number;
		lores: number;
		factions?: number;
	};
	isLoading?: boolean;
}

const navItems = [
	{
		to: "/characters",
		title: "Personagens",
		key: "characters" as const,
		Icon: User,
		color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
	},
	{
		to: "/npcs",
		title: "NPCs & Criaturas",
		key: "npcs" as const,
		Icon: Users,
		color: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
	},
	{
		to: "/sessions",
		title: "Sessões & Diários",
		key: "sessions" as const,
		Icon: ScrollText,
		color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
	},
	{
		to: "/quests",
		title: "Missões & Objetivos",
		key: "quests" as const,
		Icon: Scroll,
		color: "text-amber-300 bg-amber-500/10 border-amber-500/20",
	},
	{
		to: "/items",
		title: "Itens & Inventário",
		key: "items" as const,
		Icon: Package,
		color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
	},
	{
		to: "/locations",
		title: "Locais & Mapas",
		key: "locations" as const,
		Icon: MapIcon,
		color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
	},
	{
		to: "/lore",
		title: "Lore & Conhecimento",
		key: "lores" as const,
		Icon: BookOpen,
		color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
	},
	{
		to: "/factions",
		title: "Facções & Casas",
		key: "factions" as const,
		Icon: Flag,
		color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
	},
];

export function DashboardQuickNav({
	counts,
	isLoading,
}: DashboardQuickNavProps) {
	if (isLoading) {
		return (
			<div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
				<Skeleton className="h-5 w-36 mb-4" />
				<div className="grid grid-cols-2 gap-2">
					{Array.from({ length: 8 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading items
						<Skeleton key={i} className="h-12 w-full rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
			<div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
						<FolderTree className="h-3.5 w-3.5" />
					</div>
					<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
						Grimório da Mesa
					</h3>
				</div>
				<span className="text-[10px] font-semibold text-muted-foreground">
					Navegação Rápida
				</span>
			</div>

			<div className="grid grid-cols-2 gap-2">
				{navItems.map((item) => {
					const count = counts[item.key] ?? 0;
					const Icon = item.Icon;

					return (
						<Link
							key={item.to}
							to={item.to}
							className="group t-hover-lift flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-2.5 hover:border-primary/40 hover:bg-background/80 select-none"
						>
							<div className="flex items-center gap-2.5 min-w-0">
								<div
									className={`t-icon-spring flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${item.color}`}
								>
									<Icon className="h-3.5 w-3.5" />
								</div>
								<span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
									{item.title}
								</span>
							</div>

							<span className="font-mono text-[10px] font-bold text-muted-foreground/70 group-hover:text-primary transition-colors tabular-nums shrink-0 ml-1">
								{count}
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
