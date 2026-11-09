import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { useWatch } from "react-hook-form";
import { emptyAmmoStats } from "@/core/rules/ammo";
import {
	type ItemDraftErrors,
	makeAmmoCondition,
	makeExtraDamage,
} from "@/core/rules/item-mechanics";
import { DAMAGE_TYPE_LABELS, DAMAGE_TYPES } from "@/core/rules/weapon-damage";
import type { DamageType, ItemAmmoStats } from "@/lib/store";
import { Button } from "../ui/button";
import { Field, FormSection } from "../ui/form-tabs";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { HelpText, type ItemFormApi } from "./item-form-controls";

interface ItemAmmoTabProps {
	form: ItemFormApi;
	errors: ItemDraftErrors;
}

export function ItemAmmoTab({ form, errors }: ItemAmmoTabProps) {
	const { control, setValue } = form;
	const raw = useWatch({ control, name: "ammo" });
	const ammo: ItemAmmoStats = { ...emptyAmmoStats(), ...raw };
	const ids = {
		unit: useId(),
		amount: useId(),
		type: useId(),
	};

	function update(patch: Partial<ItemAmmoStats>) {
		setValue("ammo", { ...ammo, ...patch }, { shouldDirty: true });
	}

	return (
		<div className="space-y-7">
			<FormSection title="Unidade">
				<Field label="Rótulo" htmlFor={ids.unit}>
					<Input
						id={ids.unit}
						placeholder="flecha, tiro, virote"
						autoComplete="off"
						spellCheck={false}
						value={ammo.unitLabel}
						onChange={(e) => update({ unitLabel: e.target.value })}
					/>
				</Field>
				<HelpText>
					Só o nome da unidade. O estoque fica no inventário da ficha, não neste
					cadastro.
				</HelpText>
			</FormSection>

			<FormSection title="Dano próprio">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<Field
						label="Dados"
						htmlFor={ids.amount}
						error={errors.ammoDamage}
						className="col-span-2 sm:col-span-1"
					>
						<Input
							id={ids.amount}
							placeholder="1d8"
							autoComplete="off"
							spellCheck={false}
							aria-invalid={errors.ammoDamage ? true : undefined}
							value={ammo.damage?.amount ?? ""}
							onChange={(e) => {
								const amount = e.target.value;
								update({
									damage: amount
										? { amount, type: ammo.damage?.type ?? "piercing" }
										: undefined,
								});
							}}
						/>
					</Field>
					<Field label="Tipo" htmlFor={ids.type}>
						<Select
							id={ids.type}
							value={ammo.damage?.type ?? "piercing"}
							onChange={(e) =>
								update({
									damage: {
										amount: ammo.damage?.amount ?? "",
										type: e.target.value as DamageType,
									},
								})
							}
						>
							{DAMAGE_TYPES.map((t) => (
								<option key={t} value={t}>
									{DAMAGE_TYPE_LABELS[t]}
								</option>
							))}
						</Select>
					</Field>
				</div>
				<HelpText>
					Opcional. Soma no disparo junto com o dano da arma. Deixe em branco se
					a munição só adiciona efeito extra.
				</HelpText>
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
								extraDamage: [...ammo.extraDamage, makeExtraDamage()],
							})
						}
					>
						<Plus className="h-3.5 w-3.5" />
						Adicionar
					</Button>
				}
			>
				{ammo.extraDamage.length === 0 ? (
					<HelpText>
						Nenhum dano extra. Ex.: +1d6 de fogo além do dano da flecha.
					</HelpText>
				) : (
					<div className="space-y-2">
						{ammo.extraDamage.map((extra) => {
							const patchExtra = (patch: Partial<typeof extra>) =>
								update({
									extraDamage: ammo.extraDamage.map((row) =>
										row.id === extra.id ? { ...row, ...patch } : row,
									),
								});
							const error = errors.extraDamage?.[extra.id];
							return (
								<div key={extra.id}>
									<div className="grid grid-cols-[5.5rem_1fr_2.75rem] gap-2 sm:grid-cols-[6rem_10rem_1fr_2.75rem]">
										<Input
											aria-label="Quantia"
											placeholder="+1d6"
											autoComplete="off"
											spellCheck={false}
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
											aria-label="Condição do extra"
											placeholder="Quando? Ex.: Ao acertar"
											autoComplete="off"
											spellCheck={false}
											className="order-last col-span-2 sm:order-none sm:col-span-1"
											value={extra.label}
											onChange={(e) => patchExtra({ label: e.target.value })}
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label="Remover dano extra"
											className="h-11 w-11 text-muted-foreground hover:text-destructive sm:h-10 sm:w-11"
											onClick={() =>
												update({
													extraDamage: ammo.extraDamage.filter(
														(row) => row.id !== extra.id,
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

			<FormSection
				title="Condições"
				action={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="min-h-11 text-primary sm:min-h-8"
						onClick={() =>
							update({
								conditions: [...ammo.conditions, makeAmmoCondition()],
							})
						}
					>
						<Plus className="h-3.5 w-3.5" />
						Adicionar
					</Button>
				}
			>
				{ammo.conditions.length === 0 ? (
					<HelpText>
						Nenhuma condição. O mestre aplica o texto na mesa; não há duração
						automática.
					</HelpText>
				) : (
					<div className="space-y-3">
						{ammo.conditions.map((condition) => {
							const patchCondition = (patch: Partial<typeof condition>) =>
								update({
									conditions: ammo.conditions.map((row) =>
										row.id === condition.id ? { ...row, ...patch } : row,
									),
								});
							return (
								<div
									key={condition.id}
									className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3"
								>
									<div className="flex items-start gap-2">
										<Input
											aria-label="Nome da condição"
											placeholder="Em chamas"
											autoComplete="off"
											spellCheck={false}
											value={condition.name}
											onChange={(e) => patchCondition({ name: e.target.value })}
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label="Remover condição"
											className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive sm:h-10 sm:w-11"
											onClick={() =>
												update({
													conditions: ammo.conditions.filter(
														(row) => row.id !== condition.id,
													),
												})
											}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
									<Textarea
										aria-label="Notas da condição"
										placeholder="O mestre aplica na mesa."
										rows={2}
										spellCheck={false}
										value={condition.notes}
										onChange={(e) => patchCondition({ notes: e.target.value })}
									/>
								</div>
							);
						})}
					</div>
				)}
			</FormSection>
		</div>
	);
}
