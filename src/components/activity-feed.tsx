import type { LucideIcon } from "lucide-react";
import {
	BookOpen,
	History,
	LayoutTemplate,
	MapIcon,
	Package,
	Pencil,
	Plus,
	Scroll,
	ScrollText,
	Trash2,
	User,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type ActivityAction,
	ENTITY_LABELS,
	type EntityKind,
	useRPGStore,
} from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";

const ENTITY_ICONS: Record<EntityKind, LucideIcon> = {
	character: User,
	npc: Users,
	session: ScrollText,
	item: Package,
	location: MapIcon,
	lore: BookOpen,
	quest: Scroll,
	partyLoot: Package,
	customTemplate: LayoutTemplate,
};

const ENTITY_COLORS: Record<EntityKind, string> = {
	character: "text-violet-300",
	npc: "text-fuchsia-300",
	session: "text-amber-300",
	item: "text-emerald-300",
	location: "text-rose-300",
	lore: "text-indigo-300",
	quest: "text-amber-400",
	partyLoot: "text-amber-300",
	customTemplate: "text-violet-300",
};

const ACTION_META: Record<
	ActivityAction,
	{ label: string; Icon: LucideIcon; color: string }
> = {
	create: { label: "criou", Icon: Plus, color: "text-emerald-400" },
	update: { label: "editou", Icon: Pencil, color: "text-amber-400" },
	delete: { label: "removeu", Icon: Trash2, color: "text-rose-400" },
};

interface ActivityFeedProps {
	limit?: number;
	isLoading?: boolean;
}

export function ActivityFeed({ limit = 6, isLoading }: ActivityFeedProps) {
	const activity = useRPGStore((s) => s.activityLog);
	const [visibleCount, setVisibleCount] = useState(limit);
	const items = useMemo(
		() => activity.slice(0, visibleCount),
		[activity, visibleCount],
	);

	const skeletonKeys = useMemo(
		() =>
			Array.from(
				{ length: limit },
				(_, index) => `activity-skeleton-${limit}-${index}`,
			),
		[limit],
	);

	return (
		<aside className="rounded-2xl border border-border/70 bg-card-elevated p-6 shadow-sm shadow-black/5 flex flex-col justify-between">
			<div>
				<div className="mb-6 flex items-center justify-between gap-3">
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
							Timeline
						</p>
						<h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
							Atividade recente
						</h2>
					</div>
					<div className="flex items-center gap-3">
						{!isLoading && activity.length > 0 && (
							<span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[9px] font-bold tracking-wide text-primary">
								{activity.length} eventos
							</span>
						)}
						<History className="h-5 w-5 text-primary" strokeWidth={1.7} />
					</div>
				</div>

				{isLoading ? (
					<div className="relative border-l border-border/40 ml-3 space-y-6">
						{skeletonKeys.map((key) => (
							<div
								key={key}
								className="relative flex items-center justify-between gap-4 pl-6"
							>
								<div className="absolute -left-[10px] flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border">
									<div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
								</div>
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-3 w-24" />
									<Skeleton className="h-4 w-1/2" />
								</div>
								<Skeleton className="h-4 w-12 rounded" />
							</div>
						))}
					</div>
				) : items.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center bg-background/20">
						<div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground/45">
							<History className="h-5 w-5 text-primary/60" />
						</div>
						<p className="text-[13px] font-bold text-foreground">
							Nenhum registro ainda
						</p>
						<p className="mt-1 text-[12px] text-muted-foreground">
							Crie ou edite algo para ver o histórico aqui.
						</p>
					</div>
				) : (
					<div className="relative border-l border-border/40 ml-3 space-y-6 py-1">
						{items.map((entry) => {
							const Icon = ENTITY_ICONS[entry.entityKind];
							const action = ACTION_META[entry.action];
							const ActionIcon = action.Icon;
							const entityLabel = ENTITY_LABELS[entry.entityKind].singular;
							return (
								<div
									key={entry.id}
									className="group relative flex items-start justify-between gap-4 pl-6 transition-all"
								>
									{/* Timeline node - icon alone centered on the line */}
									<div className="absolute left-0 top-1.5 -translate-x-1/2 flex items-center justify-center">
										<ActionIcon
											className={`h-3.5 w-3.5 ${action.color}`}
											strokeWidth={2.5}
										/>
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/80">
											<span className="font-semibold text-foreground/90 lowercase">
												{action.label}
											</span>
											<span>{entityLabel.toLowerCase()}</span>
											<span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-background/50 border border-border px-0.5">
												<Icon
													className={`h-2.5 w-2.5 ${ENTITY_COLORS[entry.entityKind]}`}
												/>
											</span>
										</div>
										<h4 className="mt-1 text-[14px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
											{entry.entityName || "Sem nome"}
										</h4>
									</div>

									<time
										dateTime={new Date(entry.timestamp).toISOString()}
										className="shrink-0 text-[11px] font-medium text-muted-foreground/60 mt-0.5"
									>
										{formatRelativeTime(entry.timestamp)}
									</time>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{!isLoading && activity.length > visibleCount && (
				<div className="mt-6 pt-4 border-t border-border/60 flex justify-center">
					<button
						type="button"
						onClick={() => setVisibleCount((prev) => prev + 6)}
						className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/55 px-4 py-2 text-[12px] font-semibold text-muted-foreground transition-[border-color,background-color,color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/35 hover:bg-primary/5 hover:text-foreground active:scale-[0.98] cursor-pointer"
					>
						Carregar mais
					</button>
				</div>
			)}
		</aside>
	);
}
