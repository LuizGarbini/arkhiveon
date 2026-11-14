import { Backpack, Link2, Shield, Unlink } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
	attunedCount,
	computeEffectiveStats,
	defaultSlotFor,
	EQUIP_SLOT_LABELS,
	type EquipOutcome,
	equipEntryInSlot,
	MAX_ATTUNED_ITEMS,
	resolveSlots,
	setAttunement,
	unequipEntry,
	withoutEquipment,
} from "@/core/rules";
import { useAuth } from "@/lib/auth";
import { saveEquipmentAsOwner } from "@/lib/character-equipment";
import {
	resolveCharacterImageUrl,
	resolveItemImageUrl,
} from "@/lib/character-images";
import {
	type Character,
	useActiveCampaignRole,
	useImageAssetLookup,
	useRPGStore,
} from "@/lib/store";
import type { EquipSlot, Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { useCampaignItems, useCanLinkOnSheet } from "../use-linked-items";
import { EquipmentBackpack } from "./equipment-backpack";
import { EquipmentDoll } from "./equipment-doll";
import { EquipmentSlotPicker } from "./equipment-slot-picker";
import { ItemThumb } from "./equipment-slot-tile";
import { EquipmentSummary } from "./equipment-summary";

type Tab = "equipment" | "backpack";

const NO_CAMPAIGN_ITEMS: readonly Item[] = [];

function AttunementDots({ used }: { used: number }) {
	return (
		<div
			className="flex shrink-0 items-center gap-1.5"
			title="Sintonização: itens mágicos que exigem vínculo (máximo 3)"
		>
			<span className="hidden text-[10.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:inline">
				Sintonização
			</span>
			{Array.from({ length: MAX_ATTUNED_ITEMS }, (_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: três pontos fixos
					key={i}
					aria-hidden
					className={cn(
						"size-2.5 rounded-full",
						i < used
							? "bg-primary shadow-[0_0_8px_var(--primary-glow)]"
							: "bg-muted-foreground/25",
					)}
				/>
			))}
			<span className="text-xs font-semibold tabular-nums">
				{used}/{MAX_ATTUNED_ITEMS}
			</span>
		</div>
	);
}

function EquipmentBody({
	character,
	speedUnit,
}: {
	character: Character;
	speedUnit: string;
}) {
	const toast = useToast();
	const { session } = useAuth();
	const role = useActiveCampaignRole();
	const imageAssets = useImageAssetLookup();
	const updateCharacter = useRPGStore((s) => s.updateCharacter);
	const { items, byId } = useCampaignItems();
	// Mestre e co-mestre salvam a ficha; o jogador que criou a ficha equipa os
	// próprios itens pela função segura do banco (só local, slot e sintonia).
	const staff = useCanLinkOnSheet(character);
	const isSheetOwner =
		Boolean(session?.user.id) && character.createdBy === session?.user.id;
	const canEdit = staff || isSheetOwner;
	const [tab, setTab] = useState<Tab>("equipment");
	const [pickerSlot, setPickerSlot] = useState<EquipSlot | null>(null);

	const inventory = useMemo(
		() => character.inventoryList ?? [],
		[character.inventoryList],
	);
	const stats = useMemo(
		() => computeEffectiveStats(character, byId),
		[character, byId],
	);
	const bare = useMemo(
		() =>
			computeEffectiveStats(
				{ ...character, inventoryList: withoutEquipment(inventory) },
				byId,
			),
		[character, inventory, byId],
	);
	const slotMap = useMemo(() => resolveSlots(stats.linked), [stats.linked]);
	const attuned = attunedCount(stats.linked);

	const imageFor = (item: Item) => resolveItemImageUrl(item, imageAssets, role);
	const portraitUrl = resolveCharacterImageUrl(
		character,
		imageAssets,
		role,
		session?.user.id,
	);

	const save = (nextInventory: typeof inventory) => {
		if (staff) {
			void updateCharacter(character.id, { inventoryList: nextInventory });
			return;
		}
		void saveEquipmentAsOwner({
			characterId: character.id,
			next: nextInventory,
		}).then((result) => {
			if (!result.ok) {
				toast.error({
					title: "Não foi possível equipar",
					description: result.message,
				});
			}
		});
	};
	const applyEquip = (outcome: EquipOutcome, slot: EquipSlot) => {
		save(outcome.inventory);
		setPickerSlot(null);
		if (outcome.attunementFull) {
			toast.error({
				title: "Equipado sem sintonia",
				description: `Já há ${MAX_ATTUNED_ITEMS} itens sintonizados. Troque um para este valer.`,
			});
		} else if (outcome.displacedAll.length > 0) {
			toast.success({
				title: `${EQUIP_SLOT_LABELS[slot]} trocado`,
				description: `${outcome.displacedAll.map((e) => e.name).join(" e ")} ${outcome.displacedAll.length > 1 ? "voltaram" : "voltou"} para a mochila.`,
			});
		}
	};

	return (
		<>
			<header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border/70 bg-card/60 py-3 pr-14 pl-4 sm:pl-5">
				<div className="flex min-w-0 items-center gap-3">
					<span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 ring-1 ring-border/70">
						{portraitUrl ? (
							<img
								src={portraitUrl}
								alt=""
								className="size-full object-cover"
							/>
						) : (
							<Shield className="size-5 text-primary" aria-hidden />
						)}
					</span>
					<div className="min-w-0">
						<DialogTitle className="font-display truncate text-lg leading-tight font-semibold">
							{character.characterName}
						</DialogTitle>
						<DialogDescription className="truncate text-xs text-muted-foreground">
							Equipamento e build
						</DialogDescription>
					</div>
				</div>
				<div
					role="tablist"
					aria-label="Seções do equipamento"
					className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1"
				>
					{(
						[
							["equipment", "Equipamento", Shield],
							["backpack", "Mochila", Backpack],
						] as const
					).map(([id, label, Icon]) => (
						<button
							key={id}
							type="button"
							role="tab"
							aria-selected={tab === id}
							onClick={() => {
								setTab(id);
								setPickerSlot(null);
							}}
							className={cn(
								"flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-9",
								tab === id
									? "border-primary/40 bg-primary/15 text-foreground"
									: "border-transparent text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
							)}
						>
							<Icon className="size-4" aria-hidden />
							{label}
						</button>
					))}
				</div>
				<div className="ml-auto">
					<AttunementDots used={attuned} />
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
				{tab === "equipment" ? (
					<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
						<div className="space-y-3">
							<EquipmentDoll
								character={character}
								bySlot={slotMap.bySlot}
								twoHanded={slotMap.twoHanded}
								abilities={stats.abilities}
								portraitUrl={portraitUrl}
								imageFor={imageFor}
								canEdit={canEdit}
								selectedSlot={pickerSlot}
								onSelectSlot={setPickerSlot}
							/>
							{slotMap.unslotted.length > 0 ? (
								<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
									<p className="text-xs font-semibold text-amber-300">
										Equipados sem slot (não aparecem no boneco)
									</p>
									<ul className="mt-2 space-y-1.5">
										{slotMap.unslotted.map((l) => (
											<li
												key={l.entry.id}
												className="flex items-center gap-2 text-[13px]"
											>
												<ItemThumb
													item={l.item}
													imageUrl={imageFor(l.item)}
													className="size-9"
												/>
												<span className="min-w-0 flex-1 truncate">
													{l.item.name}
												</span>
												{canEdit ? (
													<Button
														type="button"
														variant="outline"
														size="sm"
														className="min-h-11 gap-1 sm:min-h-8"
														onClick={() =>
															save(unequipEntry(inventory, l.entry.id))
														}
													>
														<Unlink className="size-3.5" aria-hidden />
														Desequipar
													</Button>
												) : null}
											</li>
										))}
									</ul>
									<p className="mt-2 text-[11px] text-muted-foreground">
										Escolha “Onde se veste” no cadastro do item para ele ocupar
										um slot.
									</p>
								</div>
							) : null}
							{!canEdit ? (
								<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<Link2 className="size-3.5" aria-hidden />
									Só quem criou a ficha, o mestre e os co-mestres trocam o
									equipamento.
								</p>
							) : null}
						</div>
						<aside aria-live="polite" className="min-h-0">
							{pickerSlot ? (
								<EquipmentSlotPicker
									key={pickerSlot}
									slot={pickerSlot}
									character={character}
									// O jogador só equipa o que já tem; item novo da campanha
									// é com o mestre.
									campaignItems={staff ? items : NO_CAMPAIGN_ITEMS}
									itemsById={byId}
									linked={stats.linked}
									occupant={slotMap.bySlot.get(pickerSlot)}
									current={stats}
									speedUnit={speedUnit}
									imageFor={imageFor}
									onBack={() => setPickerSlot(null)}
									onEquip={(outcome) => applyEquip(outcome, pickerSlot)}
									onUnequip={(entryId) => {
										save(unequipEntry(inventory, entryId));
										setPickerSlot(null);
									}}
									onToggleAttune={(entryId, attunedNext) => {
										const result = setAttunement(
											inventory,
											byId,
											entryId,
											attunedNext,
										);
										if (result.ok) save(result.inventory);
										else
											toast.error({
												title: "Sem vaga de sintonia",
												description: `Já há ${MAX_ATTUNED_ITEMS} itens sintonizados. Tire a sintonia de um para sintonizar este.`,
											});
									}}
								/>
							) : (
								<EquipmentSummary
									character={character}
									stats={stats}
									bare={bare}
									itemsById={byId}
									speedUnit={speedUnit}
								/>
							)}
						</aside>
					</div>
				) : (
					<EquipmentBackpack
						inventory={inventory}
						linked={stats.linked}
						canEdit={canEdit}
						imageFor={imageFor}
						defaultSlot={(item) => defaultSlotFor(item, stats.linked)}
						onEquip={(entryId, slot) =>
							applyEquip(equipEntryInSlot(inventory, byId, entryId, slot), slot)
						}
					/>
				)}
			</div>
		</>
	);
}

/**
 * Aba de equipamento da ficha (D&D 5e): o boneco com os slots, os atributos
 * com os itens e o que cada troca muda antes de confirmar.
 */
export function EquipmentDialog({
	character,
	open,
	onOpenChange,
	speedUnit,
}: {
	character: Character;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	speedUnit: string;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"flex max-h-[94dvh] flex-col gap-0 overflow-hidden p-0",
					"top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none border-x-0 border-b-0",
					"sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:h-[min(92vh,820px)] sm:max-h-[min(92vh,820px)] sm:w-[calc(100%-2rem)] sm:max-w-[1120px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border",
				)}
			>
				{open ? (
					<EquipmentBody character={character} speedUnit={speedUnit} />
				) : null}
			</DialogContent>
		</Dialog>
	);
}
