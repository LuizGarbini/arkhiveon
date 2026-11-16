import { Link2 } from "lucide-react";
import type { CSSProperties } from "react";
import { ItemThumb } from "@/components/character-sheet/equipment/equipment-slot-tile";
import { Button } from "@/components/ui/button";
import {
	describeItemEffects,
	type EffectiveStats,
	EQUIP_SLOT_LABELS,
	EQUIP_SLOTS,
	resolveSlots,
} from "@/core/rules";
import { resolveItemImageUrl } from "@/lib/character-images";
import { useActiveCampaignRole, useImageAssetLookup } from "@/lib/store";
import type { EquipSlot, Item } from "@/lib/store/types";
import { ArcaneShieldGlyph } from "./sheet-icons";

/** O que está vestido, slot a slot; a troca e a build completa ficam no diálogo. */
export function EquipmentTab({
	stats,
	onOpenEquipment,
}: {
	stats: EffectiveStats;
	onOpenEquipment: () => void;
}) {
	const role = useActiveCampaignRole();
	const imageAssets = useImageAssetLookup();
	const { bySlot, unslotted } = resolveSlots(stats.linked);
	const imageFor = (item: Item) => resolveItemImageUrl(item, imageAssets, role);
	const rows: {
		key: string;
		slot?: EquipSlot;
		label: string;
		item: Item;
		attuned?: boolean;
	}[] = [
		...EQUIP_SLOTS.flatMap((slot) => {
			const linked = bySlot.get(slot);
			return linked
				? [
						{
							key: slot,
							slot,
							label: EQUIP_SLOT_LABELS[slot],
							item: linked.item,
							attuned: linked.item.requiresAttunement
								? linked.entry.isAttuned === true
								: undefined,
						},
					]
				: [];
		}),
		...unslotted.map((l) => ({
			key: l.entry.id,
			label: "Sem slot",
			item: l.item,
			attuned: l.item.requiresAttunement
				? l.entry.isAttuned === true
				: undefined,
		})),
	];

	if (rows.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.1] bg-black/25 px-5 py-9 text-center shadow-[inset_0_1px_0_oklch(1_0_0/0.03)]">
				<span className="flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-primary/85 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
					<ArcaneShieldGlyph className="size-5" />
				</span>
				<div>
					<p className="text-sm font-semibold">Nada equipado</p>
					<p className="mx-auto mt-1 max-w-[16rem] text-xs text-muted-foreground">
						Equipe itens para mudar atributos, CA e ataques da ficha.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					className="group min-h-10 gap-2 rounded-lg border-white/[0.09] bg-linear-to-b from-white/[0.04] to-black/30 text-xs font-medium shadow-[inset_0_1px_0_oklch(1_0_0/0.07)] hover:border-primary/40 hover:bg-primary/10 hover:text-primary [@media(pointer:coarse)]:min-h-11"
					onClick={onOpenEquipment}
				>
					<ArcaneShieldGlyph className="t-icon-spring size-3.5" />
					Abrir equipamento
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 px-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
				{rows.map((row, index) => {
					const chips = describeItemEffects(row.item);
					return (
						<li
							key={row.key}
							style={{ "--stagger-index": Math.min(index, 7) } as CSSProperties}
							className="t-stagger-item flex items-center gap-3 py-2.5"
						>
							<ItemThumb
								item={row.item}
								imageUrl={imageFor(row.item)}
								slot={row.slot}
								className="size-10 rounded-lg border border-white/[0.08] shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]"
							/>
							<div className="min-w-0 flex-1">
								<p className="text-[10.5px] font-medium tracking-[0.04em] text-muted-foreground/80 uppercase">
									{row.label}
								</p>
								<p className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
									<span className="truncate">{row.item.name}</span>
									{row.attuned !== undefined ? (
										<Link2
											role="img"
											aria-label={row.attuned ? "Sintonizado" : "Sem sintonia"}
											className={
												row.attuned
													? "size-3 shrink-0 text-primary"
													: "size-3 shrink-0 text-amber-300"
											}
										/>
									) : null}
								</p>
								{chips.length > 0 ? (
									<p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground tabular-nums">
										{chips
											.slice(0, 4)
											.map((c) => `${c.label} ${c.value}`)
											.join(" · ")}
									</p>
								) : null}
							</div>
						</li>
					);
				})}
			</ul>
			<Button
				type="button"
				variant="outline"
				className="group min-h-10 w-full gap-2 rounded-lg border-white/[0.09] bg-linear-to-b from-white/[0.04] to-black/30 text-xs font-medium shadow-[inset_0_1px_0_oklch(1_0_0/0.07)] hover:border-primary/40 hover:bg-primary/10 hover:text-primary [@media(pointer:coarse)]:min-h-11"
				onClick={onOpenEquipment}
			>
				<ArcaneShieldGlyph className="t-icon-spring size-3.5" />
				Trocar itens e ver a build
			</Button>
		</div>
	);
}
