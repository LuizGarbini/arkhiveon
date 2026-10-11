import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { useWatch } from "react-hook-form";
import {
	ARMOR_CATEGORY_LABELS,
	ARMOR_DEX_LABELS,
	emptyArmorStats,
	emptyWeaponStats,
	type ItemDraftErrors,
	makeExtraDamage,
	normalizeWeaponAbility,
	WEAPON_ABILITIES,
	WEAPON_ABILITY_LABELS,
	WEAPON_PROPERTY_CHIPS,
	WEAPON_PROPERTY_LABELS,
} from "@/core/rules/item-mechanics";
import { DAMAGE_TYPE_LABELS, DAMAGE_TYPES } from "@/core/rules/weapon-damage";
import type {
	DamageType,
	ItemArmorStats,
	ItemWeaponStats,
	WeaponAbility,
	WeaponPropertyKey,
} from "@/lib/store";
import { Button } from "../ui/button";
import { Field, FormSection } from "../ui/form-tabs";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import {
	HelpText,
	type ItemFormApi,
	Segmented,
	SignedNumberInput,
	ToggleChip,
} from "./item-form-controls";

/** Sugestões de "Conta como" (só nomes; não é catálogo de números). */
const BASE_WEAPON_SUGGESTIONS = [
	"Adaga",
	"Azagaia",
	"Bordão",
	"Clava",
	"Foice curta",
	"Lança",
	"Maça",
	"Machadinha",
	"Martelo leve",
	"Arco curto",
	"Besta leve",
	"Alabarda",
	"Cimitarra",
	"Espada curta",
	"Espada grande",
	"Espada longa",
	"Glaive",
	"Lança de montaria",
	"Machado de batalha",
	"Machado grande",
	"Malho",
	"Mangual",
	"Martelo de guerra",
	"Picareta de guerra",
	"Rapieira",
	"Tridente",
	"Arco longo",
	"Besta pesada",
	"Besta de mão",
];

interface ItemAttackTabProps {
	form: ItemFormApi;
	errors: ItemDraftErrors;
}

export function ItemAttackTab({ form, errors }: ItemAttackTabProps) {
	const { control, setValue } = form;
	const raw = useWatch({ control, name: "weapon" });
	const weapon: ItemWeaponStats = { ...emptyWeaponStats(), ...raw };
	const ids = {
		dice: useId(),
		ability: useId(),
		type: useId(),
		magic: useId(),
		range: useId(),
		countsAs: useId(),
		countsList: useId(),
		versatile: useId(),
		custom: useId(),
	};
	const [addingCustom, setAddingCustom] = useState(false);
	const [customText, setCustomText] = useState("");

	function update(patch: Partial<ItemWeaponStats>) {
		setValue("weapon", { ...weapon, ...patch }, { shouldDirty: true });
	}

	function toggleProperty(key: WeaponPropertyKey) {
		const has = weapon.properties.includes(key);
		update({
			properties: has
				? weapon.properties.filter((p) => p !== key)
				: [...weapon.properties, key],
		});
	}

	function commitCustom() {
		const text = customText.trim();
		if (text && !weapon.customProperties.includes(text))
			update({ customProperties: [...weapon.customProperties, text] });
		setCustomText("");
		setAddingCustom(false);
	}

	return (
		<div className="space-y-7">
			<FormSection title="Dano">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<Field
						label="Dados"
						htmlFor={ids.dice}
						error={errors.damageDice}
						className="col-span-2 sm:col-span-1"
					>
						<Input
							id={ids.dice}
							placeholder="1d8"
							autoComplete="off"
							aria-invalid={errors.damageDice ? true : undefined}
							value={weapon.damageDice}
							onChange={(e) => update({ damageDice: e.target.value })}
						/>
					</Field>
					<Field label="Tipo" htmlFor={ids.type}>
						<Select
							id={ids.type}
							value={weapon.damageType}
							onChange={(e) =>
								update({ damageType: e.target.value as DamageType })
							}
						>
							{DAMAGE_TYPES.map((t) => (
								<option key={t} value={t}>
									{DAMAGE_TYPE_LABELS[t]}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Bônus mágico" htmlFor={ids.magic}>
						<SignedNumberInput
							id={ids.magic}
							value={weapon.magicBonus}
							onChange={(magicBonus) => update({ magicBonus })}
						/>
					</Field>
				</div>
				<HelpText>
					Qualquer dado e qualquer tipo. O bônus mágico soma no acerto{" "}
					<strong className="text-foreground">e</strong> no dano.
				</HelpText>
			</FormSection>

			<FormSection title="Como ataca">
				<Field label="Atributo" htmlFor={ids.ability}>
					<Select
						id={ids.ability}
						aria-label="Atributo de ataque"
						value={normalizeWeaponAbility(weapon.ability)}
						onChange={(e) =>
							update({ ability: e.target.value as WeaponAbility })
						}
					>
						{WEAPON_ABILITIES.map((a) => (
							<option key={a} value={a}>
								{WEAPON_ABILITY_LABELS[a]}
							</option>
						))}
					</Select>
				</Field>
				<HelpText>Soma no acerto e no dano. Ex.: bruxo usa Carisma.</HelpText>
				<div className="grid grid-cols-2 gap-3">
					<Field label="Alcance" htmlFor={ids.range}>
						<Input
							id={ids.range}
							placeholder="1,5 m"
							value={weapon.range ?? ""}
							onChange={(e) => update({ range: e.target.value })}
						/>
					</Field>
					<Field
						label="Conta como"
						htmlFor={ids.countsAs}
						hint="Define a proficiência de quem equipar."
					>
						<Input
							id={ids.countsAs}
							list={ids.countsList}
							placeholder="Opcional"
							value={weapon.countsAs ?? ""}
							onChange={(e) => update({ countsAs: e.target.value })}
						/>
						<datalist id={ids.countsList}>
							{BASE_WEAPON_SUGGESTIONS.map((w) => (
								<option key={w} value={w} />
							))}
						</datalist>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Propriedades">
				<div className="flex flex-wrap gap-2">
					{WEAPON_PROPERTY_CHIPS.map((key) => (
						<ToggleChip
							key={key}
							active={weapon.properties.includes(key)}
							onClick={() => toggleProperty(key)}
						>
							{WEAPON_PROPERTY_LABELS[key]}
						</ToggleChip>
					))}
					{weapon.customProperties.map((text) => (
						<span
							key={text}
							className="inline-flex min-h-11 items-center gap-1 rounded-full border border-blue-500/35 bg-blue-500/10 pl-3 text-[13px] font-medium text-blue-300 sm:min-h-8"
						>
							<Sparkles className="h-3.5 w-3.5" />
							{text}
							<button
								type="button"
								aria-label={`Remover ${text}`}
								onClick={() =>
									update({
										customProperties: weapon.customProperties.filter(
											(p) => p !== text,
										),
									})
								}
								className="flex h-11 w-9 cursor-pointer items-center justify-center rounded-full hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-8 sm:w-8"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</span>
					))}
				</div>
				{addingCustom ? (
					<div className="flex gap-2">
						<Input
							id={ids.custom}
							aria-label="Nova propriedade personalizada"
							autoFocus
							placeholder="Ex.: Luz 6 m"
							value={customText}
							onChange={(e) => setCustomText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									commitCustom();
								}
								if (e.key === "Escape") {
									e.stopPropagation();
									setAddingCustom(false);
									setCustomText("");
								}
							}}
						/>
						<Button type="button" variant="outline" onClick={commitCustom}>
							Adicionar
						</Button>
					</div>
				) : (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="min-h-11 text-primary sm:min-h-8"
						onClick={() => setAddingCustom(true)}
					>
						<Plus className="h-3.5 w-3.5" />
						Personalizada
					</Button>
				)}
				{weapon.properties.includes("versatile") ? (
					<div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3.5 py-2.5">
						<label
							htmlFor={ids.versatile}
							className="text-[13px] text-muted-foreground"
						>
							Versátil: dano com as duas mãos
						</label>
						<div className="w-24 shrink-0">
							<Input
								id={ids.versatile}
								placeholder="1d10"
								aria-invalid={errors.versatileDice ? true : undefined}
								value={weapon.versatileDice ?? ""}
								onChange={(e) => update({ versatileDice: e.target.value })}
							/>
						</div>
					</div>
				) : null}
				{errors.versatileDice ? (
					<p className="text-[11px] font-medium text-destructive">
						{errors.versatileDice}
					</p>
				) : null}
			</FormSection>

			<FormSection
				title="Dano extra"
				action={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="min-h-11 text-primary sm:min-h-8"
						onClick={() =>
							update({
								extraDamage: [...weapon.extraDamage, makeExtraDamage()],
							})
						}
					>
						<Plus className="h-3.5 w-3.5" />
						Adicionar
					</Button>
				}
			>
				{weapon.extraDamage.length === 0 ? (
					<HelpText>
						Nenhum dano extra. Ex.: +1d6 radiante contra mortos-vivos.
					</HelpText>
				) : (
					<div className="space-y-2">
						{weapon.extraDamage.map((extra) => {
							const patchExtra = (patch: Partial<typeof extra>) =>
								update({
									extraDamage: weapon.extraDamage.map((e) =>
										e.id === extra.id ? { ...e, ...patch } : e,
									),
								});
							const error = errors.extraDamage?.[extra.id];
							return (
								<div key={extra.id}>
									<div className="grid grid-cols-[5.5rem_1fr_2.75rem] gap-2 sm:grid-cols-[6rem_10rem_1fr_2.75rem]">
										<Input
											aria-label="Quantia"
											placeholder="+1d6"
											aria-invalid={error ? true : undefined}
											value={extra.amount}
											onChange={(e) => patchExtra({ amount: e.target.value })}
										/>
										<Select
											aria-label="Tipo do dano extra"
											value={extra.type}
											onChange={(e) =>
												patchExtra({ type: e.target.value as DamageType })
											}
										>
											{DAMAGE_TYPES.map((t) => (
												<option key={t} value={t}>
													{DAMAGE_TYPE_LABELS[t]}
												</option>
											))}
										</Select>
										<Input
											aria-label="Condição"
											placeholder="Quando? Ex.: Contra mortos-vivos"
											className="order-last col-span-2 sm:order-none sm:col-span-1"
											value={extra.label}
											onChange={(e) => patchExtra({ label: e.target.value })}
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label="Remover dano extra"
											className="h-10 w-11 text-muted-foreground hover:text-destructive"
											onClick={() =>
												update({
													extraDamage: weapon.extraDamage.filter(
														(e) => e.id !== extra.id,
													),
												})
											}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
									{error ? (
										<p className="mt-1 text-[11px] font-medium text-destructive">
											{error}
										</p>
									) : null}
								</div>
							);
						})}
					</div>
				)}
			</FormSection>
		</div>
	);
}

interface ItemDefenseTabProps {
	form: ItemFormApi;
}

export function ItemDefenseTab({ form }: ItemDefenseTabProps) {
	const { control, setValue } = form;
	const [raw, type] = useWatch({ control, name: ["armor", "type"] });
	const armor: ItemArmorStats = raw ?? emptyArmorStats(type === "Escudo");
	const acId = useId();

	function update(patch: Partial<ItemArmorStats>) {
		setValue("armor", { ...armor, ...patch }, { shouldDirty: true });
	}

	return (
		<div className="space-y-7">
			<FormSection title="Proteção">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<Field label="CA base" htmlFor={acId}>
						<Input
							id={acId}
							type="number"
							inputMode="numeric"
							min={0}
							className="tabular-nums"
							value={Number.isFinite(armor.baseAc) ? armor.baseAc : ""}
							onChange={(e) =>
								update({ baseAc: Number.parseInt(e.target.value, 10) || 0 })
							}
						/>
					</Field>
				</div>
				<Field label="Destreza na CA">
					<Segmented
						ariaLabel="Destreza na CA"
						value={armor.dexMode}
						onChange={(dexMode) => update({ dexMode })}
						options={(["full", "max2", "none"] as const).map((v) => ({
							value: v,
							label: ARMOR_DEX_LABELS[v],
						}))}
					/>
				</Field>
				<Field label="Categoria">
					<Segmented
						ariaLabel="Categoria de armadura"
						value={armor.armorCategory}
						onChange={(armorCategory) => update({ armorCategory })}
						options={(["light", "medium", "heavy", "shield"] as const).map(
							(v) => ({ value: v, label: ARMOR_CATEGORY_LABELS[v] }),
						)}
					/>
				</Field>
				<HelpText>
					Guardado no item. A conta de CA na ficha entra numa próxima etapa.
				</HelpText>
			</FormSection>
		</div>
	);
}
