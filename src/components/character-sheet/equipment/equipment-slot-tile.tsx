import {
	CircleDot,
	Footprints,
	Gem,
	Hand,
	HardHat,
	Layers,
	Link2,
	Plus,
	Shield,
	Shirt,
	Sword,
} from "lucide-react";
import type { ComponentType } from "react";
import { FramedImage } from "@/components/framed-image";
import { rarityStyleFor } from "@/components/item-rarity";
import {
	describeItemEffects,
	EQUIP_SLOT_LABELS,
	EQUIP_SLOT_SHORT_LABELS,
	type LinkedEntry,
} from "@/core/rules";
import type { EquipSlot, Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export const SLOT_ICONS: Record<
	EquipSlot,
	ComponentType<{ className?: string }>
> = {
	head: HardHat,
	neck: Gem,
	cloak: Layers,
	hands: Hand,
	ring1: CircleDot,
	ring2: CircleDot,
	mainHand: Sword,
	offHand: Shield,
	armor: Shirt,
	feet: Footprints,
};

/** Foto do item (ou o ícone do slot quando não há imagem). */
export function ItemThumb({
	item,
	imageUrl,
	slot,
	className,
}: {
	item: Item;
	imageUrl: string;
	slot?: EquipSlot;
	className?: string;
}) {
	const rarity = rarityStyleFor(item.rarity);
	const Icon = slot ? SLOT_ICONS[slot] : Gem;
	return (
		<div
			className={cn(
				"relative shrink-0 overflow-hidden rounded-xl border bg-gradient-to-br to-card/40",
				rarity.border,
				rarity.glow,
				className,
			)}
		>
			{imageUrl ? (
				<FramedImage src={imageUrl} alt={item.name} framing={item} />
			) : (
				<div
					className={cn(
						"flex h-full w-full items-center justify-center",
						rarity.tone,
					)}
				>
					<Icon className="size-1/2" aria-hidden />
				</div>
			)}
		</div>
	);
}

/**
 * Um slot do boneco. Vazio mostra o "+ Equipar"; ocupado mostra a foto do item
 * com a raridade, o selo de sintonização e um ponto quando o item muda números.
 */
export function EquipmentSlotTile({
	slot,
	linked,
	imageUrl,
	canEdit,
	selected,
	onSelect,
	layout,
}: {
	slot: EquipSlot;
	linked?: LinkedEntry;
	imageUrl: string;
	canEdit: boolean;
	selected: boolean;
	onSelect: (slot: EquipSlot) => void;
	/** `doll`: 104 px nas colunas do boneco. `grid`: quadrado na grade do celular. */
	layout: "doll" | "grid";
}) {
	const Icon = SLOT_ICONS[slot];
	const sizeClass = layout === "doll" ? "size-[104px]" : "aspect-square w-full";
	const item = linked?.item;
	const rarity = item ? rarityStyleFor(item.rarity) : null;
	const hasEffects = item ? describeItemEffects(item).length > 0 : false;
	const needsAttunement = Boolean(item?.requiresAttunement);
	const attuned = linked?.entry.isAttuned === true;
	const label = item
		? `${EQUIP_SLOT_LABELS[slot]}: ${item.name}${canEdit ? ". Trocar ou desequipar" : ""}`
		: `${EQUIP_SLOT_LABELS[slot]}: vazio${canEdit ? ". Equipar item" : ""}`;
	const disabled = !canEdit && !item;

	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={selected}
			disabled={disabled}
			onClick={() => onSelect(slot)}
			className={cn(
				"group relative select-none overflow-hidden rounded-2xl border text-left transition-[transform,border-color,box-shadow] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:active:scale-100",
				sizeClass,
				item
					? cn("bg-gradient-to-br to-card/40", rarity?.border, rarity?.glow)
					: "border-dashed border-border/80 bg-background/30 text-muted-foreground",
				selected && "ring-2 ring-primary shadow-[0_0_24px_var(--primary-glow)]",
				canEdit && "[@media(hover:hover)]:hover:border-primary/50",
			)}
		>
			{item ? (
				<>
					{imageUrl ? (
						<FramedImage src={imageUrl} alt="" framing={item} />
					) : (
						<span
							className={cn(
								"flex h-full w-full items-center justify-center",
								rarity?.tone,
							)}
						>
							<Icon className="size-1/3" aria-hidden />
						</span>
					)}
					{needsAttunement ? (
						<span
							className={cn(
								"absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full backdrop-blur-md",
								attuned
									? "bg-primary/25 text-primary"
									: "bg-amber-500/25 text-amber-300",
							)}
							title={attuned ? "Sintonizado" : "Sem sintonia: não soma"}
						>
							<Link2 className="size-3" aria-hidden />
						</span>
					) : null}
					{hasEffects && (needsAttunement ? attuned : true) ? (
						<span
							aria-hidden
							className="absolute top-2 right-2 size-2 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400"
						/>
					) : null}
					<span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 truncate rounded-md bg-background/80 px-1.5 py-0.5 text-center text-[10px] font-semibold tracking-wider text-foreground uppercase backdrop-blur-md">
						{EQUIP_SLOT_SHORT_LABELS[slot]}
					</span>
				</>
			) : (
				<span className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-1 text-center">
					<Icon className="size-6 opacity-55" aria-hidden />
					<span className="text-[11px] leading-tight">
						{EQUIP_SLOT_SHORT_LABELS[slot]}
					</span>
					{canEdit ? (
						<span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary">
							<Plus className="size-3" aria-hidden />
							Equipar
						</span>
					) : null}
				</span>
			)}
		</button>
	);
}
