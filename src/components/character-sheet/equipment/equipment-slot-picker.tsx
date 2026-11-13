import {
	ArrowLeft,
	Check,
	Link2,
	Search,
	TriangleAlert,
	Unlink,
} from "lucide-react";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	ABILITY_KEYS,
	ABILITY_SHORT_LABELS,
	attunedCount,
	computeEffectiveStats,
	describeItemEffects,
	type EffectiveStats,
	EQUIP_SLOT_LABELS,
	type EquipOutcome,
	equipEntryInSlot,
	equipNewItemInSlot,
	formatModifier,
	type LinkedEntry,
	MAX_ATTUNED_ITEMS,
	slotsForItem,
} from "@/core/rules";
import type { Character, EquipSlot, Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { ItemThumb } from "./equipment-slot-tile";

interface Candidate {
	key: string;
	item: Item;
	/** Entrada que já está na ficha (mochila/montaria); sem ela, é item novo da campanha. */
	entryId?: string;
}

function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

interface DiffRow {
	label: string;
	from: string;
	to: string;
	up: boolean;
}

/** Só o que mudou entre a ficha agora e depois de equipar. */
function diffStats(
	current: EffectiveStats,
	next: EffectiveStats,
	speedUnit: string,
): DiffRow[] {
	const rows: DiffRow[] = [];
	const push = (
		label: string,
		from: number,
		to: number,
		format: (n: number) => string,
	) => {
		if (from !== to)
			rows.push({ label, from: format(from), to: format(to), up: to > from });
	};
	push("Classe de Armadura", current.ac.total, next.ac.total, String);
	for (const key of ABILITY_KEYS) {
		push(
			ABILITY_SHORT_LABELS[key],
			current.abilities[key].total,
			next.abilities[key].total,
			String,
		);
	}
	push(
		"Iniciativa",
		current.initiative.total,
		next.initiative.total,
		formatModifier,
	);
	push(
		"Deslocamento",
		current.speed.total,
		next.speed.total,
		(n) => `${n}${speedUnit}`,
	);
	push("Salvaguardas", current.saves.total, next.saves.total, formatModifier);
	return rows;
}

/**
 * Painel "Equipar em <slot>": itens da mochila e da campanha que cabem ali,
 * com a prévia do que muda na ficha antes de confirmar.
 */
export function EquipmentSlotPicker({
	slot,
	character,
	campaignItems,
	itemsById,
	linked,
	occupant,
	current,
	speedUnit,
	imageFor,
	onBack,
	onEquip,
	onUnequip,
	onToggleAttune,
}: {
	slot: EquipSlot;
	character: Character;
	/** Itens da campanha que o usuário enxerga. */
	campaignItems: readonly Item[];
	itemsById: ReadonlyMap<string, Item>;
	linked: readonly LinkedEntry[];
	occupant?: LinkedEntry;
	current: EffectiveStats;
	speedUnit: string;
	imageFor: (item: Item) => string;
	onBack: () => void;
	onEquip: (outcome: EquipOutcome) => void;
	onUnequip: (entryId: string) => void;
	onToggleAttune: (entryId: string, attuned: boolean) => void;
}) {
	const searchId = useId();
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const inventory = useMemo(
		() => character.inventoryList ?? [],
		[character.inventoryList],
	);

	const { fromBackpack, fromCampaign } = useMemo(() => {
		const q = normalize(deferredQuery.trim());
		const matches = (item: Item) => !q || normalize(item.name).includes(q);
		const backpack: Candidate[] = linked
			.filter(
				(l) =>
					l.entry.location !== "equipped" &&
					slotsForItem(l.item).includes(slot) &&
					matches(l.item),
			)
			.map((l) => ({
				key: `entry:${l.entry.id}`,
				item: l.item,
				entryId: l.entry.id,
			}));
		const owned = new Set(
			inventory.map((e) => e.campaignItemId).filter(Boolean),
		);
		const campaign: Candidate[] = campaignItems
			.filter(
				(item) =>
					slotsForItem(item).includes(slot) &&
					!owned.has(item.id) &&
					matches(item),
			)
			.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
			.map((item) => ({ key: `item:${item.id}`, item }));
		return { fromBackpack: backpack, fromCampaign: campaign };
	}, [linked, campaignItems, inventory, slot, deferredQuery]);

	const selected =
		[...fromBackpack, ...fromCampaign].find((c) => c.key === selectedKey) ??
		null;

	const preview = useMemo(() => {
		if (!selected) return null;
		const outcome = selected.entryId
			? equipEntryInSlot(inventory, itemsById, selected.entryId, slot)
			: equipNewItemInSlot(inventory, itemsById, selected.item, slot);
		const next = computeEffectiveStats(
			{ ...character, inventoryList: outcome.inventory },
			itemsById,
		);
		return {
			outcome,
			rows: diffStats(current, next, speedUnit),
			attuned: attunedCount(next.linked),
		};
	}, [selected, inventory, itemsById, slot, character, current, speedUnit]);

	const hasCandidates = fromBackpack.length + fromCampaign.length > 0;

	const renderRow = (c: Candidate, tag: string) => {
		const chips = describeItemEffects(c.item);
		const active = c.key === selectedKey;
		return (
			<li key={c.key}>
				<button
					type="button"
					aria-pressed={active}
					onClick={() => setSelectedKey(active ? null : c.key)}
					className={cn(
						"flex min-h-14 w-full cursor-pointer select-none items-center gap-3 rounded-xl border p-2 text-left transition-[transform,border-color,background-color] duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
						active
							? "border-primary/60 bg-primary/10"
							: "border-border/70 bg-background/40 [@media(hover:hover)]:hover:border-primary/35",
					)}
				>
					<ItemThumb
						item={c.item}
						imageUrl={imageFor(c.item)}
						slot={slot}
						className="size-11"
					/>
					<span className="min-w-0 flex-1">
						<span className="flex items-center gap-2">
							<span className="truncate text-[13.5px] font-semibold">
								{c.item.name}
							</span>
							<span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
								{tag}
							</span>
						</span>
						<span className="mt-1 flex flex-wrap gap-1">
							{chips.length === 0 ? (
								<span className="text-[11px] text-muted-foreground">
									Sem número na ficha
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
						</span>
					</span>
					{active ? (
						<Check className="size-4 shrink-0 text-primary" aria-hidden />
					) : null}
				</button>
			</li>
		);
	};

	return (
		<div className="flex min-h-0 flex-col gap-3">
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="min-h-11 min-w-11 shrink-0"
					aria-label="Voltar ao resumo"
					onClick={onBack}
				>
					<ArrowLeft className="size-4" aria-hidden />
				</Button>
				<div className="min-w-0">
					<p className="text-[10.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
						Equipar em
					</p>
					<h3 className="font-display text-lg leading-tight font-semibold">
						{EQUIP_SLOT_LABELS[slot]}
					</h3>
				</div>
			</div>

			{occupant ? (
				<div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 p-2">
					<ItemThumb
						item={occupant.item}
						imageUrl={imageFor(occupant.item)}
						slot={slot}
						className="size-11"
					/>
					<div className="min-w-0 flex-1">
						<p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
							Equipado agora
						</p>
						<p className="truncate text-[13.5px] font-semibold">
							{occupant.item.name}
						</p>
					</div>
					<div className="flex shrink-0 flex-col gap-1.5">
						{occupant.item.requiresAttunement ? (
							<Button
								type="button"
								variant={occupant.entry.isAttuned ? "default" : "outline"}
								size="sm"
								aria-pressed={occupant.entry.isAttuned === true}
								className="min-h-11 gap-1.5 sm:min-h-8"
								onClick={() =>
									onToggleAttune(occupant.entry.id, !occupant.entry.isAttuned)
								}
							>
								<Link2 className="size-3.5" aria-hidden />
								{occupant.entry.isAttuned ? "Sintonizado" : "Sintonizar"}
							</Button>
						) : null}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="min-h-11 gap-1.5 sm:min-h-8"
							onClick={() => onUnequip(occupant.entry.id)}
						>
							<Unlink className="size-3.5" aria-hidden />
							Desequipar
						</Button>
					</div>
				</div>
			) : null}

			<div className="relative">
				<label htmlFor={searchId} className="sr-only">
					Buscar item
				</label>
				<Search
					aria-hidden
					className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					id={searchId}
					type="search"
					spellCheck={false}
					autoComplete="off"
					placeholder="Buscar nos itens…"
					className="pl-9"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
			</div>

			<div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
				{fromBackpack.length > 0 ? (
					<section className="space-y-1.5">
						<h4 className="text-[10.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
							Na mochila
						</h4>
						<ul className="space-y-1.5">
							{fromBackpack.map((c) => renderRow(c, "Mochila"))}
						</ul>
					</section>
				) : null}
				{fromCampaign.length > 0 ? (
					<section className="space-y-1.5">
						<h4 className="text-[10.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
							Itens da campanha
						</h4>
						<ul className="space-y-1.5">
							{fromCampaign.map((c) => renderRow(c, "Campanha"))}
						</ul>
					</section>
				) : null}
				{!hasCandidates ? (
					<div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-5 text-center">
						<p className="text-[13px] font-semibold">
							{deferredQuery.trim()
								? "Nenhum item com esse nome."
								: `Nenhum item cabe em ${EQUIP_SLOT_LABELS[slot].toLowerCase()}.`}
						</p>
						<p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
							Crie o item na aba Itens e escolha “Onde se veste” na aba Bônus do
							cadastro.
						</p>
					</div>
				) : null}
			</div>

			{selected && preview ? (
				<div className="space-y-2.5 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3">
					<p className="text-[10.5px] font-semibold tracking-[0.14em] text-emerald-300 uppercase">
						O que muda na ficha
					</p>
					{preview.rows.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							{preview.outcome.attunementFull
								? `${selected.item.name} só passa a somar quando tiver sintonia.`
								: `Nenhum número muda com ${selected.item.name}.`}
						</p>
					) : (
						<ul className="space-y-1">
							{preview.rows.map((row) => (
								<li
									key={row.label}
									className="flex items-center justify-between text-[12.5px]"
								>
									<span>{row.label}</span>
									<span className="font-semibold tabular-nums">
										<span className="text-muted-foreground line-through">
											{row.from}
										</span>{" "}
										→{" "}
										<span
											className={row.up ? "text-emerald-300" : "text-rose-300"}
										>
											{row.to}
										</span>
									</span>
								</li>
							))}
						</ul>
					)}
					{selected.item.requiresAttunement ? (
						<p
							className={cn(
								"flex items-start gap-1.5 text-xs",
								preview.outcome.attunementFull
									? "text-amber-300"
									: "text-muted-foreground",
							)}
						>
							<TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
							{preview.outcome.attunementFull
								? `Já há ${MAX_ATTUNED_ITEMS} itens sintonizados: este ficará equipado, mas sem sintonia (não soma). Tire a sintonia de outro item para ele valer.`
								: `Exige sintonização: ${preview.attuned}/${MAX_ATTUNED_ITEMS} vagas usadas.`}
						</p>
					) : null}
				</div>
			) : null}

			<div className="grid grid-cols-2 gap-2">
				<Button
					type="button"
					variant="outline"
					className="min-h-11"
					onClick={onBack}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					className="min-h-11 gap-1.5"
					disabled={!selected || !preview}
					onClick={() => preview && onEquip(preview.outcome)}
				>
					<Check className="size-4" aria-hidden />
					Equipar
				</Button>
			</div>
		</div>
	);
}
