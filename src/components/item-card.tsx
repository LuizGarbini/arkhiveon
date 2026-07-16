import { Link, useNavigate } from "@tanstack/react-router";
import { Coins, Gem, Link2, Weight } from "lucide-react";
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
	{ tone: string; border: string; glow: string }
> = {
	comum: {
		tone: "text-slate-300",
		border: "border-border/70",
		glow: "from-slate-500/10",
	},
	incomum: {
		tone: "text-emerald-300",
		border: "border-emerald-500/35",
		glow: "from-emerald-500/15",
	},
	raro: {
		tone: "text-blue-300",
		border: "border-blue-500/35",
		glow: "from-blue-500/15",
	},
	"muito raro": {
		tone: "text-fuchsia-300",
		border: "border-fuchsia-500/35",
		glow: "from-fuchsia-500/15",
	},
	lendario: {
		tone: "text-amber-300",
		border: "border-amber-500/35",
		glow: "from-amber-500/15",
	},
	artefato: {
		tone: "text-rose-300",
		border: "border-rose-500/40",
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

	const rarityKey = (item.rarity || "comum")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
	const rarity = rarityStyles[rarityKey] ?? rarityStyles.comum;
	const itemImageUrl = resolveItemImageUrl(
		item,
		imageAssetLookup,
		activeCampaignRole,
	);
	const hasCustomImage = Boolean(itemImageUrl);

	return (
		<div
			className={`group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border bg-black/40 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0 ${rarity.border} hover:border-primary/45`}
		>
			{/* Accessible anchor covering the entire card background */}
			<Link
				to="/items/$itemId"
				params={{ itemId: item.id }}
				search={{ edit: false }}
				className="absolute inset-0 z-0 cursor-pointer"
				aria-label={`Abrir item ${item.name}`}
			/>

			{/* Card Image / Icon Background */}
			<div
				className={`absolute inset-0 -z-10 h-full w-full overflow-hidden bg-linear-to-br ${rarity.glow} to-transparent`}
			>
				{hasCustomImage ? (
					<img
						src={itemImageUrl}
						alt={item.name}
						loading="lazy"
						decoding="async"
						className="h-full w-full object-cover object-center opacity-70 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-card-elevated text-white/5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
						<Gem
							className={`h-16 w-16 ${rarity.tone} opacity-15`}
							strokeWidth={1.2}
						/>
					</div>
				)}
				<div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/80 via-black/30 to-transparent" />
				<div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-black via-black/75 to-transparent" />
			</div>

			{/* Card Content */}
			<div className="relative z-10 pointer-events-none flex h-full flex-col justify-between">
				<div className="pointer-events-auto">
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
				</div>

				<div className="p-4.5 pt-5">
					<h3 className="font-display truncate text-xl font-bold tracking-tight text-white drop-shadow-sm">
						{item.name || "Sem nome"}
					</h3>
					<div className="mt-1 flex flex-wrap items-center gap-1.5">
						<span
							className={`rounded bg-background/50 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${rarity.border} ${rarity.tone}`}
						>
							{item.rarity || "comum"}
						</span>
						{item.type && (
							<span className="text-xs text-white/70 font-medium">
								· {item.type}
								{item.subtype && ` (${item.subtype})`}
							</span>
						)}
					</div>
					{(item.requiresAttunement || item.equipped) && (
						<div className="mt-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider">
							{item.requiresAttunement && (
								<span className="flex items-center gap-1 text-violet-300">
									<Link2 className="h-3 w-3" /> requer sintonia
								</span>
							)}
							{item.equipped && (
								<span className="text-emerald-300 font-bold">equipado</span>
							)}
						</div>
					)}
				</div>

				<div className="space-y-3.5 p-4.5 pb-5">
					{item.stats && (
						<p className="font-mono rounded-xl bg-background/45 p-2 text-xs text-white/80 ring-1 ring-white/10 leading-relaxed">
							{item.stats}
						</p>
					)}

					<div className="grid grid-cols-3 gap-1.5 text-xs">
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
						<p className="line-clamp-2 border-t border-white/10 pt-3 text-xs italic leading-relaxed text-white/60">
							“{item.description}”
						</p>
					)}

					<div className="pointer-events-auto pt-1">
						<span className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-white/10 bg-white/10 text-xs font-medium text-white backdrop-blur-md transition hover:border-white/15 hover:bg-white/15">
							Abrir ficha
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

interface MiniInfoProps {
	Icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
}

function MiniInfo({ Icon, label, value }: MiniInfoProps) {
	return (
		<div className="flex items-center gap-1.5 rounded-xl bg-black/45 px-1.5 py-1 border border-white/10">
			<Icon className="h-3.5 w-3.5 shrink-0 text-white/50" />
			<div className="min-w-0">
				<div className="text-[7px] uppercase tracking-wider text-white/50 font-bold leading-none">
					{label}
				</div>
				<div className="truncate text-[10px] font-bold text-white leading-tight mt-0.5">
					{value}
				</div>
			</div>
		</div>
	);
}
