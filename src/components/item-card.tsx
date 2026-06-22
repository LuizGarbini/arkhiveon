import { Link, useNavigate } from "@tanstack/react-router";
import { Coins, Gem, Link2, Weight } from "lucide-react";
import { FramedImage } from "@/components/framed-image";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveItemImageUrl } from "@/lib/character-images";
import type { Item } from "@/lib/store";
import {
	useActiveCampaignRole,
	useImageAssetLookup,
	useRPGStore,
} from "@/lib/store";
import { EntityActions } from "./entity-actions";

interface ItemCardProps {
	item?: Item;
	isLoading?: boolean;
}

const rarityStyles: Record<
	string,
	{ tone: string; ring: string; glow: string }
> = {
	comum: {
		tone: "text-slate-300",
		ring: "ring-border",
		glow: "from-slate-500/10",
	},
	incomum: {
		tone: "text-emerald-300",
		ring: "ring-emerald-500/30",
		glow: "from-emerald-500/15",
	},
	raro: {
		tone: "text-blue-300",
		ring: "ring-blue-500/30",
		glow: "from-blue-500/15",
	},
	"muito raro": {
		tone: "text-fuchsia-300",
		ring: "ring-fuchsia-500/30",
		glow: "from-fuchsia-500/15",
	},
	lendario: {
		tone: "text-amber-300",
		ring: "ring-amber-500/30",
		glow: "from-amber-500/15",
	},
	artefato: {
		tone: "text-rose-300",
		ring: "ring-rose-500/40",
		glow: "from-rose-500/15",
	},
};

export function ItemCard({ item, isLoading }: ItemCardProps) {
	const removeItem = useRPGStore((s) => s.removeItem);
	const imageAssetLookup = useImageAssetLookup();
	const activeCampaignRole = useActiveCampaignRole();
	const navigate = useNavigate();

	if (isLoading || !item) {
		return (
			<div className="flex flex-col rounded-xl border border-border bg-card-elevated p-4 space-y-4">
				<div className="flex items-start gap-3">
					<Skeleton className="h-14 w-14 rounded-lg shrink-0" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-5 w-3/4" />
						<div className="flex gap-2">
							<Skeleton className="h-4 w-16 rounded" />
							<Skeleton className="h-4 w-12 rounded" />
						</div>
					</div>
				</div>
				<Skeleton className="h-10 w-full rounded-md" />
				<div className="grid grid-cols-3 gap-1.5">
					<Skeleton className="h-10 w-full rounded" />
					<Skeleton className="h-10 w-full rounded" />
					<Skeleton className="h-10 w-full rounded" />
				</div>
				<div className="border-t border-border/60 pt-2.5">
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-4/5 mt-1" />
				</div>
			</div>
		);
	}

	const rarityKey = (item.rarity || "comum")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
	const rarity = rarityStyles[rarityKey] ?? rarityStyles.comum;
	const itemImageUrl = item
		? resolveItemImageUrl(item, imageAssetLookup, activeCampaignRole)
		: "";

	return (
		<Link
			to="/items/$itemId"
			params={{ itemId: item.id }}
			search={{ edit: false }}
			className={`group relative flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card-elevated p-4 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none ${rarity.ring}`}
		>
			<EntityActions
				onEdit={() =>
					void navigate({
						to: "/items/$itemId",
						params: { itemId: item.id },
						search: { edit: true },
					})
				}
				onDelete={() => removeItem(item.id)}
				entityName={item.name || "Sem nome"}
				entityKindLabel="item"
			/>

			<div className="flex items-start gap-3">
				<div
					className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br ${rarity.glow} to-transparent ring-1 ${rarity.ring} ${rarity.tone}`}
				>
					{itemImageUrl ? (
						<FramedImage src={itemImageUrl} alt={item.name} framing={item} />
					) : (
						<Gem className="h-5 w-5" strokeWidth={1.6} />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="font-display truncate text-[15px] font-bold text-foreground">
						{item.name || "Sem nome"}
					</h3>
					<div className="mt-0.5 flex flex-wrap items-center gap-1">
						<span
							className={`rounded bg-background/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${rarity.ring} ${rarity.tone}`}
						>
							{item.rarity || "comum"}
						</span>
						{item.type && (
							<span className="text-[11px] text-muted-foreground">
								· {item.type}
							</span>
						)}
						{item.subtype && (
							<span className="text-[11px] text-muted-foreground/80">
								({item.subtype})
							</span>
						)}
					</div>
					{(item.requiresAttunement || item.equipped) && (
						<div className="mt-1 flex items-center gap-2 text-[9px] uppercase tracking-wider">
							{item.requiresAttunement && (
								<span className="flex items-center gap-0.5 text-violet-300">
									<Link2 className="h-2.5 w-2.5" /> sintonia
								</span>
							)}
							{item.equipped && (
								<span className="text-emerald-300">equipado</span>
							)}
						</div>
					)}
				</div>
			</div>

			{item.stats && (
				<p className="font-mono mt-3 line-clamp-2 rounded-xl bg-background/45 p-2 text-[11px] text-foreground/90 ring-1 ring-border/60">
					{item.stats}
				</p>
			)}

			<div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
				{item.weight && (
					<MiniInfo Icon={Weight} label="Peso" value={item.weight} />
				)}
				{item.value && (
					<MiniInfo Icon={Coins} label="Valor" value={item.value} />
				)}
				{item.charges && (
					<MiniInfo Icon={Gem} label="Cargas" value={item.charges} />
				)}
			</div>

			{item.description && (
				<p className="mt-3 line-clamp-2 border-t border-border/60 pt-2.5 text-[11px] italic text-muted-foreground">
					"{item.description}"
				</p>
			)}
			{item.entityLinks?.length > 0 && (
				<div className="mt-3 border-t border-border/60 pt-3">
					<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
						{item.entityLinks.length} conexao
						{item.entityLinks.length === 1 ? "" : "es"}
					</span>
				</div>
			)}
		</Link>
	);
}

interface MiniInfoProps {
	Icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
}

function MiniInfo({ Icon, label, value }: MiniInfoProps) {
	return (
		<div className="flex items-center gap-1.5 rounded-xl bg-background/45 px-1.5 py-1 ring-1 ring-border/60">
			<Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
			<div className="min-w-0">
				<div className="text-[8px] uppercase tracking-wider text-muted-foreground">
					{label}
				</div>
				<div className="truncate text-[10px] font-semibold text-foreground">
					{value}
				</div>
			</div>
		</div>
	);
}
