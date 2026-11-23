import { Link } from "@tanstack/react-router";
import {
	BookOpen,
	GitFork,
	Globe2,
	House,
	Images,
	LibraryBig,
	Map as MapIcon,
	Newspaper,
	Package,
	Palette,
	Scroll,
	ScrollText,
	User,
	Users,
} from "lucide-react";
import { isDesignSystemEnabled } from "@/lib/feature-flags";
import { useLibraryPilot } from "@/lib/library/use-library-pilot";
import { useStorageContext } from "@/lib/storage/use-storage-context";
import { useRPGStore } from "@/lib/store";
import { getFactionsTabConfig } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { CampaignSwitcher } from "./campaign-switcher";
import { SidebarNav } from "./sidebar-nav";
import { StorageCard } from "./storage/storage-card";

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
	const storage = useStorageContext();

	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
	const factionsTabConfig = getFactionsTabConfig(activeCampaign?.system);
	// O sistema da mesa vem das campanhas; até chegarem, o rótulo não cai no padrão.
	// No erro, o nome (o do cache ou o fallback da bandeira) fica visível.
	const worldLabelsPending = useRPGStore(
		(s) =>
			s.campaignLoadStatus !== "ready" &&
			(s.campaignLoadStatus !== "error" || s.isRetryingBase) &&
			(s.activeCampaignId !== null || !s.hasLoadedCampaigns),
	);
	// Piloto invisível: fora da allowlist o grupo Mundo fica idêntico.
	const libraryEnabled = useLibraryPilot(activeCampaignId) === true;

	const dynamicWorldItems = [
		{ to: "/world", label: "Visão geral", Icon: Globe2 },
		{ to: "/npcs", label: "NPCs", Icon: Users, shortcut: "Alt+5" },
		{
			to: "/factions",
			label: factionsTabConfig.label,
			Icon: factionsTabConfig.Icon,
			labelPending: worldLabelsPending,
		},
		{ to: "/news", label: "Mural", Icon: Newspaper },
		{ to: "/items", label: "Itens", Icon: Package, shortcut: "Alt+6" },
		{ to: "/locations", label: "Locais", Icon: MapIcon, shortcut: "Alt+7" },
		{ to: "/lore", label: "Lore", Icon: BookOpen, shortcut: "Alt+8" },
		...(libraryEnabled
			? [{ to: "/library", label: "Biblioteca", Icon: LibraryBig }]
			: []),
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
					<Link
						to="/dashboard"
						onClick={onItemClick}
						aria-label="Ir para a visão inicial (Dashboard)"
						className={cn(
							"group mb-7 flex items-center gap-3 rounded-2xl transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.98]",
							isCollapsed ? "justify-center" : "justify-start",
						)}
					>
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_12px_28px_-22px_var(--primary)] transition-all duration-200 group-hover:scale-105 group-hover:border-primary/50 group-hover:bg-primary/20">
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
							<span className="font-display block whitespace-nowrap text-[13px] font-bold tracking-[0.2em] text-foreground transition-colors group-hover:text-primary">
								ARKHIVEON
							</span>
							<span className="mt-0.5 block whitespace-nowrap text-[9px] uppercase tracking-[0.28em] text-muted-foreground transition-colors group-hover:text-foreground/80">
								Arkhiveon
							</span>
						</div>
					</Link>

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

				{/* Card compacto de cota (U1). */}
				<div className={cn("mt-auto", isCollapsed ? "p-2" : "px-3 py-2")}>
					<StorageCard
						context={storage}
						isCollapsed={isCollapsed}
						onNavigate={onItemClick}
					/>
				</div>
			</div>
		</aside>
	);
}
