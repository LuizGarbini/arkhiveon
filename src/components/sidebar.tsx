import {
	BookOpen,
	FileText,
	GitFork,
	House,
	Map as MapIcon,
	Package,
	Palette,
	ScrollText,
	Sparkles,
	User,
	Users,
} from "lucide-react";
import { useRPGStore } from "@/lib/store";
import { CampaignSwitcher } from "./campaign-switcher";
import { SidebarNav } from "./sidebar-nav";

const FREE_CREATION_LIMIT = 20;

const arkhiveonItems = [
	{ to: "/dashboard", label: "Dashboard", Icon: House },
	{ to: "/characters", label: "Elenco", Icon: User },
	{ to: "/sheets", label: "Fichas", Icon: FileText },
	{ to: "/family-tree", label: "Árvore", Icon: GitFork },
	{ to: "/npcs", label: "NPCs", Icon: Users },
	{ to: "/sessions", label: "Sessões", Icon: ScrollText },
];

const worldItems = [
	{ to: "/items", label: "Itens", Icon: Package },
	{ to: "/locations", label: "Locais", Icon: MapIcon },
	{ to: "/lore", label: "Lore", Icon: BookOpen },
];

const systemItems = [
	{ to: "/design-system", label: "Design System", Icon: Palette },
];

interface SidebarProps {
	isOpen: boolean;
	onItemClick?: () => void;
}

export function Sidebar({ isOpen, onItemClick }: SidebarProps) {
	const isCollapsed = !isOpen;
	const usedCreations = useRPGStore((s) => s.globalRecordsCount);
	const usagePercentage = Math.min(
		100,
		Math.round((usedCreations / FREE_CREATION_LIMIT) * 100),
	);

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
						title="Arkhiveon"
						isCollapsed={isCollapsed}
						items={arkhiveonItems}
						onItemClick={onItemClick}
					/>
					<SidebarNav
						title="Mundo"
						isCollapsed={isCollapsed}
						items={worldItems}
						onItemClick={onItemClick}
					/>
					<SidebarNav
						title="Sistema"
						isCollapsed={isCollapsed}
						items={systemItems}
						onItemClick={onItemClick}
					/>
				</div>

				{/* Footer / Pro Card */}
				<div className="mt-auto space-y-4 p-4">
					<div
						className={`overflow-hidden rounded-2xl border border-primary/20 bg-primary/8 ring-1 ring-primary/10 transition-[height,padding,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
							isCollapsed ? "h-10 p-0" : "h-[176px] p-4"
						}`}
						title={isCollapsed ? "Plano Free" : undefined}
					>
						<div
							className={`flex items-center gap-2 transition-[justify-content] duration-300 ${
								isCollapsed ? "h-full justify-center" : "justify-between"
							}`}
						>
							<div className="flex items-center gap-2 text-[11px] font-bold text-primary">
								<Sparkles className="h-3.5 w-3.5 shrink-0" />
								<span
									className={`whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
										isCollapsed
											? "max-w-0 -translate-x-2 opacity-0"
											: "max-w-24 translate-x-0 opacity-100"
									}`}
								>
									Plano Free
								</span>
							</div>
							<span
								className={`rounded-full border border-border/60 bg-background/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
									isCollapsed
										? "max-w-0 translate-x-2 opacity-0"
										: "max-w-16 translate-x-0 opacity-100"
								}`}
							>
								Free
							</span>
						</div>

						<div
							className={`transition-[max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
								isCollapsed
									? "max-h-0 translate-y-2 opacity-0"
									: "max-h-40 translate-y-0 opacity-100"
							}`}
						>
							<p className="mt-2 text-[11px] font-medium leading-relaxed text-foreground/90">
								Crie até {FREE_CREATION_LIMIT} registros no plano gratuito.
							</p>
							<div className="mt-3">
								<div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
									<span>{usedCreations} usados</span>
									<span>{FREE_CREATION_LIMIT} limite</span>
								</div>
								<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background/70 ring-1 ring-border/60">
									<div
										className="h-full rounded-full bg-linear-to-r from-primary to-fuchsia-500 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
										style={{ width: `${usagePercentage}%` }}
									/>
								</div>
							</div>
							<button
								type="button"
								className="mt-3 w-full rounded-xl border border-primary/35 bg-primary/15 px-3 py-2 text-[11px] font-bold text-primary transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary/20 active:scale-[0.98]"
							>
								Upgrade
							</button>
						</div>
						{isCollapsed && (
							<div className="sr-only">
								{usedCreations} de {FREE_CREATION_LIMIT} registros usados no
								plano Free
							</div>
						)}
					</div>
				</div>
			</div>
		</aside>
	);
}
