import { Link } from "@tanstack/react-router";
import {
	BookOpen,
	Crown,
	GitFork,
	Globe2,
	House,
	Images,
	Map as MapIcon,
	Newspaper,
	Package,
	Palette,
	Scroll,
	ScrollText,
	Sparkles,
	User,
	Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isDesignSystemEnabled } from "@/lib/feature-flags";
import { useRPGStore } from "@/lib/store";
import { FREE_CREATION_LIMIT } from "@/lib/store/sync-slice";
import { getFactionsTabConfig } from "@/lib/systems";
import { CampaignSwitcher } from "./campaign-switcher";
import { SidebarNav } from "./sidebar-nav";

const mesaItems = [
	{ to: "/dashboard", label: "Dashboard", Icon: House, shortcut: "Alt+1" },
	{ to: "/characters", label: "Personagens", Icon: User, shortcut: "Alt+2" },
	{ to: "/quests", label: "Missões", Icon: Scroll, shortcut: "Alt+3" },
	{ to: "/family-tree", label: "Árvore", Icon: GitFork, shortcut: "Alt+4" },
	{ to: "/sessions", label: "Sessões", Icon: ScrollText, shortcut: "Alt+5" },
];

const systemItems = isDesignSystemEnabled()
	? [{ to: "/design-system", label: "Design System", Icon: Palette }]
	: [];

interface SidebarProps {
	isOpen: boolean;
	onItemClick?: () => void;
}

export function Sidebar({ isOpen, onItemClick }: SidebarProps) {
	const isCollapsed = !isOpen;
	const { isPro, planLoading, storageUsedBytes } = useAuth();
	const usedCreations = useRPGStore((s) => s.globalRecordsCount);

	const usagePercentage = isPro
		? 100
		: Math.min(100, Math.round((usedCreations / FREE_CREATION_LIMIT) * 100));

	const storageLimitBytes = isPro ? 2 * 1024 * 1024 * 1024 : 100 * 1024 * 1024;
	const storageUsagePercentage = Math.min(
		100,
		Math.round((storageUsedBytes / storageLimitBytes) * 100),
	);
	const storageUsedMB = (storageUsedBytes / (1024 * 1024)).toFixed(1);
	const storageLimitMB = isPro ? "2GB" : "100MB";

	const planLabel = isPro ? "Plano Pro" : "Plano Free";
	const badgeLabel = planLoading ? "..." : isPro ? "Pro" : "Free";

	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
	const factionsTabConfig = getFactionsTabConfig(activeCampaign?.system);

	const dynamicWorldItems = [
		{ to: "/world", label: "Visão geral", Icon: Globe2 },
		{ to: "/npcs", label: "NPCs", Icon: Users, shortcut: "Alt+5" },
		{ to: "/factions", label: factionsTabConfig.label, Icon: factionsTabConfig.Icon },
		{ to: "/news", label: "Mural", Icon: Newspaper },
		{ to: "/items", label: "Itens", Icon: Package, shortcut: "Alt+6" },
		{ to: "/locations", label: "Locais", Icon: MapIcon, shortcut: "Alt+7" },
		{ to: "/lore", label: "Lore", Icon: BookOpen, shortcut: "Alt+8" },
		{ to: "/images", label: "Imagens", Icon: Images },
	];

	return (
		<aside
			className={`flex h-full shrink-0 flex-col overflow-hidden bg-transparent transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
				isOpen ? "w-[256px]" : "w-[72px]"
			}`}
		>
			<div className="flex h-full flex-col">
				{/* Brand & Switcher */}
				<div className="px-4 py-5">
					<div
						className={`mb-7 flex items-center gap-3 transition-[justify-content] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
							isCollapsed ? "justify-center" : "justify-start"
						}`}
					>
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_12px_28px_-22px_var(--primary)]">
							<img
								src="/favicon.svg"
								alt="Arkhiveon"
								className="h-6 w-6"
								draggable={false}
							/>
						</div>
						<div
							className={`min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
								isCollapsed
									? "max-w-0 -translate-x-2 opacity-0"
									: "max-w-40 translate-x-0 opacity-100"
							}`}
						>
							<span className="font-display block whitespace-nowrap text-[13px] font-bold tracking-[0.2em] text-foreground">
								ARKHIVEON
							</span>
							<span className="mt-0.5 block whitespace-nowrap text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
								Arkhiveon
							</span>
						</div>
					</div>

					<CampaignSwitcher isCollapsed={isCollapsed} />
				</div>

				{/* Nav Sections */}
				<div className="flex-1 space-y-7 overflow-y-auto px-4 py-2 scrollbar-none">
					<SidebarNav
						title="Mesa"
						isCollapsed={isCollapsed}
						items={mesaItems}
						onItemClick={onItemClick}
					/>
					<SidebarNav
						title="Mundo"
						isCollapsed={isCollapsed}
						items={dynamicWorldItems}
						onItemClick={onItemClick}
					/>
					{systemItems.length > 0 ? (
						<SidebarNav
							title="Sistema"
							isCollapsed={isCollapsed}
							items={systemItems}
							onItemClick={onItemClick}
						/>
					) : null}
				</div>

				{/* Footer / Pro Card */}
				<div className="mt-auto space-y-4 p-4">
					<div
						className={`overflow-hidden rounded-2xl border border-primary/20 bg-primary/8 ring-1 ring-primary/10 transition-[height,padding,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
							isCollapsed ? "h-10 p-0" : "h-[200px] p-4"
						}`}
						title={isCollapsed ? planLabel : undefined}
					>
						<div
							className={`flex items-center gap-2 transition-[justify-content] duration-300 ${
								isCollapsed ? "h-full justify-center" : "justify-between"
							}`}
						>
							<div className="flex items-center gap-2 text-[11px] font-bold text-primary">
								{isPro ? (
									<Crown className="h-3.5 w-3.5 shrink-0" />
								) : (
									<Sparkles className="h-3.5 w-3.5 shrink-0" />
								)}
								<span
									className={`whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
										isCollapsed
											? "max-w-0 -translate-x-2 opacity-0"
											: "max-w-24 translate-x-0 opacity-100"
									}`}
								>
									{planLoading ? "Verificando" : planLabel}
								</span>
							</div>
							<span
								className={`rounded-full border border-border/60 bg-background/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
									isCollapsed
										? "max-w-0 translate-x-2 opacity-0"
										: "max-w-16 translate-x-0 opacity-100"
								}`}
							>
								{badgeLabel}
							</span>
						</div>

						<div
							className={`transition-[max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
								isCollapsed
									? "max-h-0 translate-y-2 opacity-0"
									: "max-h-[160px] translate-y-0 opacity-100"
							}`}
						>
							<div className="mt-3">
								<div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
									<span>Registros</span>
									<span>
										{usedCreations} / {isPro ? "∞" : FREE_CREATION_LIMIT}
									</span>
								</div>
								<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background/70 ring-1 ring-border/60">
									<div
										className="h-full rounded-full bg-linear-to-r from-primary to-fuchsia-500 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
										style={{ width: `${usagePercentage}%` }}
									/>
								</div>
							</div>

							<div className="mt-3">
								<div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
									<span>Arquivos</span>
									<span>
										{storageUsedMB}MB / {storageLimitMB}
									</span>
								</div>
								<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background/70 ring-1 ring-border/60">
									<div
										className={`h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
											storageUsagePercentage > 90
												? "bg-rose-500"
												: "bg-linear-to-r from-sky-400 to-primary"
										}`}
										style={{ width: `${storageUsagePercentage}%` }}
									/>
								</div>
							</div>

							<Link
								to="/billing"
								search={{}}
								className="mt-4 block w-full rounded-xl border border-primary/35 bg-primary/15 px-3 py-2 text-center text-[11px] font-bold text-primary transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary/20 active:scale-[0.98]"
								onClick={onItemClick}
							>
								{isPro ? "Pro ativo" : "Fazer Upgrade"}
							</Link>
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}
