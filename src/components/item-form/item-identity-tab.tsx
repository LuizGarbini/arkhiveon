import { WandSparkles } from "lucide-react";
import { useId } from "react";
import { useWatch } from "react-hook-form";
import {
	emptyWeaponStats,
	ITEM_CATEGORIES,
	ITEM_RARITY_OPTIONS,
	itemCategoryKind,
	WEAPON_CATEGORY_LABELS,
} from "@/core/rules/item-mechanics";
import type { ItemWeaponStats } from "@/lib/store";
import { cn } from "@/lib/utils";
import { EntityImagePicker } from "../entity-image-picker";
import { normalizeRarityKey, rarityStyleFor } from "../item-rarity";
import { Field, FormSection } from "../ui/form-tabs";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import {
	CollapsibleRow,
	type ItemFormApi,
	type ItemFormValues,
	Segmented,
} from "./item-form-controls";
import { ItemStartFrom } from "./item-start-from";

interface ItemIdentityTabProps {
	form: ItemFormApi;
	mode: "create" | "edit";
	onCategoryChange: (type: string) => void;
}

export function ItemIdentityTab({
	form,
	mode,
	onCategoryChange,
}: ItemIdentityTabProps) {
	const { control, register, setValue } = form;
	const nameId = useId();
	const categoryId = useId();
	const [
		name,
		type,
		rarity,
		weapon,
		origin,
		imageUrl,
		imageAssetId,
		imageFocusY,
		imageZoom,
		weight,
		value,
		source,
	] = useWatch({
		control,
		name: [
			"name",
			"type",
			"rarity",
			"weapon",
			"origin",
			"imageUrl",
			"imageAssetId",
			"imageFocusY",
			"imageZoom",
			"weight",
			"value",
			"source",
		],
	});
	const kind = itemCategoryKind(type);
	const categories: string[] = [...ITEM_CATEGORIES];
	if (type && !categories.includes(type)) categories.unshift(type);
	const rarityKey = normalizeRarityKey(rarity);
	const secondarySummary = [weight, value, source]
		.map((v) => v?.trim())
		.filter(Boolean)
		.join(" · ");
	const itemNoun = kind === "weapon" ? "Arma" : "Item";

	function set<K extends keyof ItemFormValues>(key: K, val: ItemFormValues[K]) {
		setValue(key, val as never, { shouldDirty: true });
	}

	return (
		<div className="space-y-7">
			{mode === "create" ? (
				<ItemStartFrom
					origin={origin}
					onBlank={() => {
						set("origin", { kind: "blank" });
						if (kind === "weapon") set("weapon", emptyWeaponStats());
						set("armor", undefined);
						set("bonuses", []);
					}}
					onCopy={(patch) => {
						set("type", patch.type || type);
						set("subtype", patch.subtype ?? "");
						set("rarity", patch.rarity || "comum");
						set("weapon", patch.weapon);
						set("armor", patch.armor);
						set("bonuses", patch.bonuses ?? []);
						set("origin", patch.origin);
						onCategoryChange(patch.type || type);
					}}
				/>
			) : null}

			<FormSection title="Imagem">
				<EntityImagePicker
					value={{
						imageUrl: imageUrl ?? "",
						imageAssetId,
						imageFocusY,
						imageZoom,
					}}
					onChange={(patch) => {
						for (const [key, val] of Object.entries(patch)) {
							setValue(key as keyof ItemFormValues, val as never, {
								shouldDirty: true,
							});
						}
					}}
					uploadLabel="Ilustração"
					folder="items"
					libraryName={name}
				/>
			</FormSection>

			<FormSection title="Nome e classificação">
				<Field label="Nome" htmlFor={nameId}>
					<div className="relative">
						<Input
							id={nameId}
							autoComplete="off"
							placeholder="Ex.: Lâmina da Aurora"
							className={cn("h-11", mode === "edit" && "sm:pr-56")}
							{...register("name", { required: true })}
						/>
						{mode === "edit" ? (
							<span className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 text-[11px] text-muted-foreground sm:block">
								Renomear não desvincula das fichas
							</span>
						) : null}
					</div>
				</Field>

				<div
					className={cn(
						"grid grid-cols-1 gap-3",
						kind === "weapon" && "sm:grid-cols-2",
					)}
				>
					<Field label="Categoria" htmlFor={categoryId}>
						<Select
							id={categoryId}
							value={type}
							onChange={(e) => onCategoryChange(e.target.value)}
						>
							{type ? null : <option value="">Escolha…</option>}
							{categories.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</Select>
					</Field>
					{kind === "weapon" ? (
						<Field label="Tipo">
							<Segmented
								ariaLabel="Tipo de arma"
								value={(weapon ?? emptyWeaponStats()).weaponCategory}
								onChange={(weaponCategory) =>
									set("weapon", {
										...emptyWeaponStats(),
										...weapon,
										weaponCategory,
									} as ItemWeaponStats)
								}
								options={(["simple", "martial"] as const).map((v) => ({
									value: v,
									label: WEAPON_CATEGORY_LABELS[v],
								}))}
							/>
						</Field>
					) : null}
				</div>

				<Field label="Raridade">
					<div
						role="radiogroup"
						aria-label="Raridade"
						className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden"
					>
						{ITEM_RARITY_OPTIONS.map((option) => {
							const style = rarityStyleFor(option.value);
							const active = normalizeRarityKey(option.value) === rarityKey;
							return (
								// biome-ignore lint/a11y/useSemanticElements: chips de raridade
								<button
									key={option.value}
									type="button"
									role="radio"
									aria-checked={active}
									onClick={() => set("rarity", option.value)}
									className={cn(
										"inline-flex min-h-11 shrink-0 cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-8",
										active
											? cn(
													"bg-gradient-to-b to-background/40",
													style.border,
													style.glow,
													style.tone,
												)
											: "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
									)}
								>
									<span
										className={cn(
											"h-1.5 w-1.5 rounded-full bg-current",
											style.tone,
										)}
										aria-hidden="true"
									/>
									{option.label}
								</button>
							);
						})}
					</div>
				</Field>
			</FormSection>

			{mode === "edit" && origin ? (
				<div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
						<WandSparkles className="h-4 w-4" />
					</span>
					<div className="min-w-0">
						<p className="text-[13px] font-semibold text-foreground">
							{itemNoun} personalizad{kind === "weapon" ? "a" : "o"}
						</p>
						<p className="text-[12px] text-muted-foreground">
							{origin.kind === "copy"
								? `Copiad${kind === "weapon" ? "a" : "o"} de ${origin.fromName}. Os números agora são só del${kind === "weapon" ? "a" : "e"}.`
								: `Criad${kind === "weapon" ? "a" : "o"} do zero.`}
						</p>
					</div>
				</div>
			) : null}

			<CollapsibleRow title="Peso, valor e fonte" summary={secondarySummary}>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<Field label="Peso">
						<Input placeholder="Ex: 1,5 kg" {...register("weight")} />
					</Field>
					<Field label="Valor">
						<Input placeholder="Ex: 50 po" {...register("value")} />
					</Field>
					<Field label="Fonte">
						<Input placeholder="Ex: Homebrew" {...register("source")} />
					</Field>
					<Field label="Subtipo">
						<Input placeholder="Ex: espada longa" {...register("subtype")} />
					</Field>
					<Field label="Cargas">
						<Input placeholder="Ex: 3/7" {...register("charges")} />
					</Field>
				</div>
			</CollapsibleRow>
		</div>
	);
}
