import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarNavProps {
	title?: string;
	isCollapsed?: boolean;
	items: {
		to: string;
		label: string;
		Icon: LucideIcon;
		exact?: boolean;
		shortcut?: string;
		/** Rótulo depende de dado ainda não carregado: skeleton no lugar do padrão. */
		labelPending?: boolean;
	}[];
	onItemClick?: () => void;
}

export function SidebarNav({
	title,
	isCollapsed,
	items,
	onItemClick,
}: SidebarNavProps) {
	return (
		<div className="space-y-2">
			{title && (
				<div
					className={`overflow-hidden px-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/60 transition-[max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
						isCollapsed
							? "max-h-0 -translate-x-2 opacity-0"
							: "max-h-4 translate-x-0 opacity-100"
					}`}
				>
					{title}
				</div>
			)}
			<div className="space-y-1">
				{items.map(({ to, label, Icon, exact, shortcut, labelPending }) => (
					<Link
						key={to}
						to={to}
						aria-keyshortcuts={shortcut}
						onClick={onItemClick}
						activeOptions={{ exact: exact ?? to === "/dashboard" }}
						activeProps={{
							className:
								"border-primary/25 bg-primary/12 text-primary shadow-[0_10px_30px_-24px_var(--primary)]",
						}}
						inactiveProps={{
							className:
								"border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/55 hover:text-foreground",
						}}
						className={`group/nav relative flex items-center rounded-xl border text-[12px] font-semibold transition-[background-color,border-color,color,box-shadow,transform,padding,gap] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${
							isCollapsed
								? "justify-center gap-0 px-0 py-2.5"
								: "gap-2.5 px-3 py-2.5"
						}`}
						title={isCollapsed && !labelPending ? label : undefined}
						aria-label={labelPending ? "Carregando seção do mundo" : undefined}
					>
						{({ isActive }) => (
							<>
								{isActive && (
									<span className="absolute left-1 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
								)}
								<Icon
									className={`h-4 w-4 shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/nav:scale-105 ${isActive ? "text-primary" : "text-muted-foreground"}`}
									strokeWidth={isActive ? 2 : 1.6}
								/>
								<span
									className={`truncate transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
										isCollapsed
											? "max-w-0 -translate-x-2 opacity-0"
											: "max-w-36 translate-x-0 opacity-100"
									}`}
								>
									{labelPending ? (
										<Skeleton
											aria-hidden="true"
											className="dashboard-skeleton inline-block h-3 w-24 align-middle"
										/>
									) : (
										label
									)}
								</span>
							</>
						)}
					</Link>
				))}
			</div>
		</div>
	);
}
