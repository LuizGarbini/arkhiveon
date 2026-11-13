import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useWatch } from "react-hook-form";
import {
	ABILITY_FULL_LABELS,
	ABILITY_KEYS,
	ITEM_SLOT_LABELS,
	ITEM_SLOTS,
	makeAbilityBonus,
} from "@/core/rules";
import {
	ITEM_BONUS_TARGET_LABELS,
	makeItemBonus,
} from "@/core/rules/item-mechanics";
import type {
	ItemAbilityBonus,
	ItemBonus,
	ItemBonusTarget,
	ItemSlot,
	WeaponAbility,
} from "@/lib/store";
import { Button } from "../ui/button";
import { FormSection } from "../ui/form-tabs";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import {
	HelpText,
	type ItemFormApi,
	SignedNumberInput,
} from "./item-form-controls";

const TARGETS = Object.keys(ITEM_BONUS_TARGET_LABELS) as ItemBonusTarget[];

export function ItemBonusTab({ form }: { form: ItemFormApi }) {
	const { control, setValue } = form;
	const bonuses: ItemBonus[] = useWatch({ control, name: "bonuses" }) ?? [];
	const abilityBonuses: ItemAbilityBonus[] =
		useWatch({ control, name: "abilityBonuses" }) ?? [];
	const slot: ItemSlot | "" = useWatch({ control, name: "slot" }) ?? "";

	function save(next: ItemBonus[]) {
		setValue("bonuses", next, { shouldDirty: true });
	}
	function saveAbilities(next: ItemAbilityBonus[]) {
		setValue("abilityBonuses", next, { shouldDirty: true });
	}
	const add = () => save([...bonuses, makeItemBonus()]);
	const addAbility = () =>
		saveAbilities([...abilityBonuses, makeAbilityBonus()]);

	return (
		<div className="space-y-7">
			<FormSection title="Onde se veste">
				<Select
					aria-label="Onde o item é vestido"
					value={slot}
					onChange={(e) =>
						setValue("slot", (e.target.value || undefined) as ItemSlot, {
							shouldDirty: true,
						})
					}
				>
					<option value="">Automático (pela categoria)</option>
					{ITEM_SLOTS.map((s) => (
						<option key={s} value={s}>
							{ITEM_SLOT_LABELS[s]}
						</option>
					))}
				</Select>
				<HelpText>
					Arma, armadura, escudo, anel e amuleto já vão para o lugar certo.
					Itens maravilhosos (luvas, botas, elmo, capa) precisam de um slot para
					aparecer no equipamento da ficha.
				</HelpText>
			</FormSection>

			<FormSection
				title="Atributos"
				action={
					abilityBonuses.length ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="min-h-11 text-primary sm:min-h-8"
							onClick={addAbility}
						>
							<Plus className="h-3.5 w-3.5" />
							Adicionar atributo
						</Button>
					) : null
				}
			>
				{abilityBonuses.length === 0 ? (
					<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/30 px-4 py-8 text-center">
						<Sparkles className="h-5 w-5 text-primary" />
						<p className="max-w-xs text-[13px] text-muted-foreground">
							O item muda um atributo? Ex.: Luvas de Poder de Ogro deixam a
							Força em 19; um Cinto soma +2 em Força.
						</p>
						<Button type="button" variant="outline" onClick={addAbility}>
							<Plus className="h-3.5 w-3.5" />
							Adicionar atributo
						</Button>
					</div>
				) : (
					<div className="space-y-2">
						{abilityBonuses.map((bonus) => {
							const patch = (p: Partial<ItemAbilityBonus>) =>
								saveAbilities(
									abilityBonuses.map((b) =>
										b.id === bonus.id ? { ...b, ...p } : b,
									),
								);
							return (
								<div
									key={bonus.id}
									className="grid grid-cols-[1fr_1fr_4.5rem_2.75rem] gap-2"
								>
									<Select
										aria-label="Atributo"
										value={bonus.ability}
										onChange={(e) =>
											patch({ ability: e.target.value as WeaponAbility })
										}
									>
										{ABILITY_KEYS.map((key) => (
											<option key={key} value={key}>
												{ABILITY_FULL_LABELS[key]}
											</option>
										))}
									</Select>
									<Select
										aria-label="Como altera"
										value={bonus.mode}
										onChange={(e) =>
											patch({
												mode: e.target.value as ItemAbilityBonus["mode"],
												// Fixar em +2 não faz sentido: sugere um valor típico.
												value:
													e.target.value === "set" && bonus.value < 3
														? 19
														: e.target.value === "add" && bonus.value > 10
															? 2
															: bonus.value,
											})
										}
									>
										<option value="add">Soma</option>
										<option value="set">Fixa em</option>
									</Select>
									{bonus.mode === "set" ? (
										<Input
											aria-label="Valor do atributo"
											type="number"
											inputMode="numeric"
											min={1}
											max={30}
											className="tabular-nums"
											value={bonus.value}
											onChange={(e) =>
												patch({
													value: Number.parseInt(e.target.value, 10) || 0,
												})
											}
										/>
									) : (
										<SignedNumberInput
											ariaLabel="Valor somado"
											value={bonus.value}
											onChange={(value) => patch({ value: value ?? 0 })}
										/>
									)}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Remover atributo"
										className="h-10 w-11 text-muted-foreground hover:text-destructive"
										onClick={() =>
											saveAbilities(
												abilityBonuses.filter((b) => b.id !== bonus.id),
											)
										}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							);
						})}
					</div>
				)}
				<HelpText>
					“Fixa em” só vale se o atributo de quem usa for menor (Força 19 não
					rebaixa quem já tem 21). “Soma” entra depois. Só conta com o item
					equipado e, se exigir, sintonizado.
				</HelpText>
			</FormSection>

			<FormSection
				title="Bônus de quem usa"
				action={
					bonuses.length ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="min-h-11 text-primary sm:min-h-8"
							onClick={add}
						>
							<Plus className="h-3.5 w-3.5" />
							Adicionar bônus
						</Button>
					) : null
				}
			>
				{bonuses.length === 0 ? (
					<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/30 px-4 py-8 text-center">
						<Sparkles className="h-5 w-5 text-primary" />
						<p className="max-w-xs text-[13px] text-muted-foreground">
							Nenhum bônus ainda. Ex.: +1 na CA, +2 na iniciativa, +1 em
							salvaguardas, +3 de deslocamento.
						</p>
						<Button type="button" variant="outline" onClick={add}>
							<Plus className="h-3.5 w-3.5" />
							Adicionar bônus
						</Button>
					</div>
				) : (
					<div className="space-y-2">
						{bonuses.map((bonus) => {
							const patch = (p: Partial<ItemBonus>) =>
								save(
									bonuses.map((b) => (b.id === bonus.id ? { ...b, ...p } : b)),
								);
							return (
								<div
									key={bonus.id}
									className="grid grid-cols-[1fr_5rem_2.75rem] gap-2 sm:grid-cols-[10rem_5rem_1fr_2.75rem]"
								>
									<Select
										aria-label="Soma em"
										value={bonus.target}
										onChange={(e) =>
											patch({ target: e.target.value as ItemBonusTarget })
										}
									>
										{TARGETS.map((t) => (
											<option key={t} value={t}>
												{ITEM_BONUS_TARGET_LABELS[t]}
											</option>
										))}
									</Select>
									<SignedNumberInput
										ariaLabel="Valor"
										value={bonus.value}
										onChange={(value) => patch({ value: value ?? 0 })}
									/>
									<Input
										aria-label="Quando"
										placeholder="Quando? (opcional)"
										className="order-last col-span-2 sm:order-none sm:col-span-1"
										value={bonus.when ?? ""}
										onChange={(e) => patch({ when: e.target.value })}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Remover bônus"
										className="h-10 w-11 text-muted-foreground hover:text-destructive"
										onClick={() =>
											save(bonuses.filter((b) => b.id !== bonus.id))
										}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							);
						})}
					</div>
				)}
				<HelpText>
					CA, iniciativa, salvaguardas e deslocamento já somam na ficha. Acerto
					e dano ficam guardados por enquanto. Com “Quando?” preenchido, o bônus
					vira só uma nota e não soma.
				</HelpText>
			</FormSection>
		</div>
	);
}
