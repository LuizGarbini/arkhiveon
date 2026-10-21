import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Lock } from "lucide-react";
import type { Lore } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { EntityActions } from "./entity-actions";
import { cardInitials, EntityCardMedia } from "./entity-card-media";
import { EntityImageViewer } from "./images/entity-image-viewer";

interface LoreCardProps {
	lore?: Lore;
	isLoading?: boolean;
}

const importanceStyles: Record<
	string,
	{ tone: string; border: string; accent: string; label: string }
> = {
	minor: {
		tone: "text-muted-foreground",
		border: "border-border/70",
		accent: "via-muted-foreground/30",
		label: "Curiosidade",
	},
	supporting: {
		tone: "text-foreground/80",
		border: "border-border/70",
		accent: "via-foreground/20",
		label: "Coadjuvante",
	},
	major: {
		tone: "text-primary",
		border: "border-primary/30",
		accent: "via-primary/40",
		label: "Importante",
	},
	core: {
		tone: "text-amber-300",
		border: "border-amber-500/40",
		accent: "via-amber-500/45",
		label: "Pilar",
	},
};

export function LoreCard({ lore, isLoading }: LoreCardProps) {
	const removeLore = useRPGStore((s) => s.removeLore);
	const navigate = useNavigate();

	if (isLoading || !lore) {
		return (
			<div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card-elevated p-5 shadow-sm animate-pulse">
				<div className="space-y-2.5 pt-1">
					<div className="h-5 w-1/2 rounded-md bg-white/10" />
					<div className="h-3 w-1/3 rounded-md bg-white/5" />
				</div>
				<div className="space-y-3 border-t border-white/5 pt-4">
					<div className="h-4 w-1/4 rounded bg-white/10" />
					<div className="h-8 w-full rounded-full bg-white/10" />
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
	const hasCustomImage = Boolean(lore.imageUrl);

	return (
		<div
			className={`group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border bg-black/40 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0 ${importance.border} hover:border-primary/45`}
		>
			{/* Accessible anchor covering the entire card background */}
			<Link
				to="/lore/$loreId"
				params={{ loreId: lore.id }}
				search={{ edit: false }}
				className="absolute inset-0 z-0 cursor-pointer"
				aria-label={`Abrir lore ${lore.title}`}
			/>

			{/* Left border accent representing importance */}
			<div
				className={`pointer-events-none absolute inset-y-3.5 left-0 w-[2px] rounded-full bg-linear-to-b from-transparent ${importance.accent} to-transparent`}
			/>

			<EntityCardMedia
				src={hasCustomImage ? lore.imageUrl : undefined}
				alt={lore.title}
				icon={BookOpen}
				accentClassName="from-amber-500/15 text-amber-300/40"
				initials={cardInitials(lore.title || "L")}
			/>

			{/* Card Content */}
			<div className="relative z-10 pointer-events-none flex h-full flex-col justify-between pl-1.5">
				<div className="pointer-events-auto">
					<EntityActions
						onEdit={() =>
							void navigate({
								to: "/lore/$loreId",
								params: { loreId: lore.id },
								search: { edit: true },
							})
						}
						onDelete={() => removeLore(lore.id)}
						entityName={lore.title || "Sem título"}
						entityKindLabel="lore"
						worldStaffOnly
						extraActions={
							<EntityImageViewer
								variant="corner"
								src={(hasCustomImage ? lore.imageUrl : undefined) || undefined}
								name={lore.title || "Sem nome"}
							/>
						}
					/>
				</div>

				<div className="p-4.5 pt-5">
					<div className="flex items-center gap-1.5 pr-28">
						<h3 className="font-display truncate text-xl font-bold tracking-tight text-white drop-shadow-sm">
							{lore.title || "Sem título"}
						</h3>
						{lore.isSecret && (
							<Lock className="h-4.5 w-4.5 shrink-0 text-rose-400" />
						)}
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-white/70 font-medium">
						{lore.category && <span>{lore.category}</span>}
						{lore.era && (
							<>
								<span className="opacity-55">·</span>
								<span>{lore.era}</span>
							</>
						)}
					</div>
					<div className="mt-2.5">
						<span
							className={`rounded bg-background/50 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${importance.border} ${importance.tone}`}
						>
							{importance.label}
						</span>
					</div>
				</div>

				<div className="space-y-3.5 p-4.5 pb-5">
					{lore.content && (
						<p className="line-clamp-4 border-t border-white/10 pt-3 text-xs italic leading-relaxed text-white/60">
							“{lore.content}”
						</p>
					)}

					{tags.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{tags.slice(0, 4).map((tag) => (
								<span
									key={tag}
									className="rounded bg-black/45 border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70"
								>
									#{tag}
								</span>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
