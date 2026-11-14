import { Link2, Shield } from "lucide-react";
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
			<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/30 px-5 py-9 text-center">
				<Shield className="size-6 text-primary" aria-hidden />
				<div>
					<p className="text-sm font-semibold">Nada equipado</p>
					<p className="mx-auto mt-1 max-w-[16rem] text-xs text-muted-foreground">
						Equipe itens para mudar atributos, CA e ataques da ficha.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					className="min-h-11 gap-2"
					onClick={onOpenEquipment}
				>
					<Shield className="size-4" aria-hidden />
					Abrir equipamento
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<ul className="divide-y divide-border/60">
				{rows.map((row) => {
					const chips = describeItemEffects(row.item);
					return (
						<li
							key={row.key}
							className="flex items-center gap-3 py-2.5 first:pt-0"
						>
							<ItemThumb
								item={row.item}
								imageUrl={imageFor(row.item)}
								slot={row.slot}
								className="size-11"
							/>
							<div className="min-w-0 flex-1">
								<p className="text-[11px] text-muted-foreground">{row.label}</p>
								<p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
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
									<p className="mt-0.5 truncate text-[11.5px] text-muted-foreground tabular-nums">
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
				className="min-h-11 w-full gap-2"
				onClick={onOpenEquipment}
			>
				<Shield className="size-4" aria-hidden />
				Trocar itens e ver a build
			</Button>
		</div>
	);
}
