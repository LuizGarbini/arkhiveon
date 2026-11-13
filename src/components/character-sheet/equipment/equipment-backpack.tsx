import { Backpack, Plus, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	describeItemEffects,
	EQUIP_SLOT_LABELS,
	type LinkedEntry,
	slotsForItem,
} from "@/core/rules";
import type { EquipSlot, InventoryItem, Item } from "@/lib/store/types";
import { ItemThumb } from "./equipment-slot-tile";

/**
 * Mochila e montaria: o que está guardado. Item com slot tem o botão
 * "Equipar" (vai para o primeiro slot livre; ocupado, troca).
 */
export function EquipmentBackpack({
	inventory,
	linked,
	canEdit,
	imageFor,
	defaultSlot,
	onEquip,
}: {
	inventory: readonly InventoryItem[];
	linked: readonly LinkedEntry[];
	canEdit: boolean;
	imageFor: (item: Item) => string;
	defaultSlot: (item: Item) => EquipSlot | undefined;
	onEquip: (entryId: string, slot: EquipSlot) => void;
}) {
	const stored = inventory.filter((e) => e.location !== "equipped");
	const linkedById = new Map(linked.map((l) => [l.entry.id, l]));

	if (stored.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/30 px-6 py-14 text-center">
				<Backpack className="size-7 text-primary" aria-hidden />
				<p className="text-sm font-semibold">A mochila está vazia</p>
				<p className="max-w-sm text-xs text-muted-foreground">
					Adicione itens da campanha pelo módulo Inventário da ficha (“Da
					campanha”) ou equipe direto pelo boneco, na aba Equipamento.
				</p>
			</div>
		);
	}

	return (
		<ul className="grid gap-2 sm:grid-cols-2">
			{stored.map((entry) => {
				const l = linkedById.get(entry.id);
				const slot = l ? defaultSlot(l.item) : undefined;
				const chips = l ? describeItemEffects(l.item) : [];
				return (
					<li
						key={entry.id}
						className="flex min-h-[72px] items-center gap-3 rounded-xl border border-border/70 bg-background/40 p-2.5"
					>
						{l ? (
							<ItemThumb
								item={l.item}
								imageUrl={imageFor(l.item)}
								slot={slotsForItem(l.item)[0]}
								className="size-12"
							/>
						) : (
							<span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
								<Backpack className="size-5" aria-hidden />
							</span>
						)}
						<div className="min-w-0 flex-1">
							<p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
								<span className="truncate">{l?.item.name ?? entry.name}</span>
								{entry.quantity > 1 ? (
									<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
										×{entry.quantity}
									</span>
								) : null}
								{entry.location === "mount_stash" ? (
									<Warehouse
										className="size-3.5 shrink-0 text-muted-foreground"
										aria-label="Na montaria"
									/>
								) : null}
							</p>
							{l ? (
								<div className="mt-1 flex flex-wrap gap-1">
									{chips.length === 0 ? (
										<span className="text-[11px] text-muted-foreground">
											{slot
												? "Sem número na ficha"
												: "Defina “Onde se veste” no cadastro do item"}
										</span>
									) : (
										chips.slice(0, 4).map((chip) => (
											<span
												key={`${chip.label}${chip.value}`}
												className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-300 tabular-nums"
											>
												{chip.label} {chip.value}
											</span>
										))
									)}
								</div>
							) : (
								<p className="mt-1 text-[11px] text-muted-foreground">
									Item avulso: não entra no cálculo da ficha.
								</p>
							)}
						</div>
						{l && slot && canEdit ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="min-h-11 shrink-0 gap-1 sm:min-h-8"
								aria-label={`Equipar ${l.item.name} em ${EQUIP_SLOT_LABELS[slot]}`}
								onClick={() => onEquip(entry.id, slot)}
							>
								<Plus className="size-3.5" aria-hidden />
								Equipar
							</Button>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}
