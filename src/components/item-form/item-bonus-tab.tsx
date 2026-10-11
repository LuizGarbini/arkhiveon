import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useWatch } from "react-hook-form";
import {
	ITEM_BONUS_TARGET_LABELS,
	makeItemBonus,
} from "@/core/rules/item-mechanics";
import type { ItemBonus, ItemBonusTarget } from "@/lib/store";
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

	function save(next: ItemBonus[]) {
		setValue("bonuses", next, { shouldDirty: true });
	}
	const add = () => save([...bonuses, makeItemBonus()]);

	return (
		<div className="space-y-7">
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
							salvaguardas.
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
					Guardado no item. A soma na ficha entra numa próxima etapa.
				</HelpText>
			</FormSection>
		</div>
	);
}
