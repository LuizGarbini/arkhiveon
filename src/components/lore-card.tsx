import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lore } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { EntityActions } from "./entity-actions";

interface LoreCardProps {
	lore?: Lore;
	isLoading?: boolean;
}

const importanceStyles: Record<
	string,
	{ tone: string; ring: string; label: string }
> = {
	minor: {
		tone: "text-muted-foreground",
		ring: "ring-border",
		label: "Curiosidade",
	},
	supporting: {
		tone: "text-foreground/80",
		ring: "ring-border",
		label: "Coadjuvante",
	},
	major: {
		tone: "text-primary",
		ring: "ring-primary/30",
		label: "Importante",
	},
	core: {
		tone: "text-amber-300",
		ring: "ring-amber-500/40",
		label: "Pilar",
	},
};

export function LoreCard({ lore, isLoading }: LoreCardProps) {
	const removeLore = useRPGStore((s) => s.removeLore);
	const navigate = useNavigate();

	if (isLoading || !lore) {
		return (
			<div className="flex flex-col rounded-xl border border-border bg-card-elevated p-4 space-y-4">
				<div className="flex items-start gap-3 pl-2">
					<Skeleton className="h-12 w-12 rounded-lg shrink-0" />
					<div className="min-w-0 flex-1 space-y-2">
						<div className="flex items-center gap-1.5">
							<Skeleton className="h-5 w-3/4" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-3 w-16" />
							<Skeleton className="h-3 w-12" />
						</div>
					</div>
				</div>
				<div className="border-t border-border/60 pt-2.5 pl-2 space-y-2">
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-2/3" />
				</div>
				<div className="flex gap-1 pl-2">
					<Skeleton className="h-4 w-10 rounded" />
					<Skeleton className="h-4 w-10 rounded" />
				</div>
			</div>
		);
	}

	const importance =
		importanceStyles[lore.importance] ?? importanceStyles.supporting;
	const tags = lore.tags
		? lore.tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean)
		: [];

	return (
		<Link
			to="/lore/$loreId"
			params={{ loreId: lore.id }}
			search={{ edit: false }}
			className={`group relative flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card-elevated p-4 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none ${importance.ring}`}
		>
			<EntityActions
				onEdit={() =>
					void navigate({
						to: "/lore/$loreId",
						params: { loreId: lore.id },
						search: { edit: true },
					})
				}
				onDelete={() => removeLore(lore.id)}
				entityName={lore.title || "Sem titulo"}
				entityKindLabel="lore"
			/>

			<div className="pointer-events-none absolute inset-y-3 left-0 w-[2px] rounded-full bg-linear-to-b from-transparent via-primary/40 to-transparent" />

			<div className="flex items-start gap-3 pl-2">
				<div
					className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background/45 ring-1 ${importance.ring} ${importance.tone}`}
				>
					{lore.imageUrl ? (
						<img
							src={lore.imageUrl}
							alt={lore.title}
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover"
						/>
					) : (
						<BookOpen className="h-4 w-4" strokeWidth={1.6} />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<h3 className="font-display truncate text-[15px] font-bold text-foreground">
							{lore.title || "Sem titulo"}
						</h3>
						{lore.isSecret && (
							<Lock className="h-3 w-3 shrink-0 text-rose-400" />
						)}
					</div>
					<div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
						{lore.category && <span>{lore.category}</span>}
						{lore.era && (
							<>
								<span className="text-primary/40">·</span>
								<span>{lore.era}</span>
							</>
						)}
					</div>
					<div className="mt-1.5 flex flex-wrap items-center gap-1">
						<span
							className={`rounded bg-background/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${importance.ring} ${importance.tone}`}
						>
							{importance.label}
						</span>
					</div>
				</div>
			</div>

			{lore.content && (
				<p className="font-display mt-3 line-clamp-5 border-t border-border/60 pt-2.5 text-[12px] italic leading-relaxed text-foreground/85 pl-2">
					{lore.content}
				</p>
			)}

			{tags.length > 0 && (
				<div className="mt-3 flex flex-wrap gap-1 pl-2">
					{tags.slice(0, 5).map((tag) => (
						<span
							key={tag}
							className="rounded bg-muted/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground ring-1 ring-border"
						>
							#{tag}
						</span>
					))}
				</div>
			)}
			{lore.entityLinks?.length > 0 && (
				<div className="mt-3 border-t border-border/60 pt-3 pl-2">
					<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
						{lore.entityLinks.length} conexao
						{lore.entityLinks.length === 1 ? "" : "es"}
					</span>
				</div>
			)}
		</Link>
	);
}
