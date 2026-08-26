import { BookOpen, Sparkles, Trash } from "lucide-react";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { SpellSearchDialog } from "@/components/spell-search-dialog";
import { Button } from "@/components/ui/button";
import { Field, FormSection } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Spell } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import type {
	CharacterControl,
	CharacterRegister,
	CharacterSetValue,
} from "../types";
import { AdjustableNumberField } from "./adjustable-number-field";
import { CustomFieldsRenderer } from "./custom-fields-renderer";

export function MagicFields({
	register,
	config,
	control,
	setValue,
}: {
	register: CharacterRegister;
	config: SystemConfig;
	control: CharacterControl;
	setValue: CharacterSetValue;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const system = useWatch({ control, name: "system" }) || "generic";
	const spellsList = useWatch({ control, name: "spellsList" }) || [];
	const legacySpells = useWatch({ control, name: "spells" }) || "";

	const handleSelectSpell = (spell: Spell) => {
		if (
			spellsList.some((s) => s.name.toLowerCase() === spell.name.toLowerCase())
		) {
			return;
		}
		setValue("spellsList", [...spellsList, spell]);
	};

	const handleRemoveSpell = (spellId: string) => {
		setValue(
			"spellsList",
			spellsList.filter((s) => s.id !== spellId),
		);
	};

	return (
		<FormSection title="Magia">
			<CustomFieldsRenderer
				register={register}
				control={control}
				setValue={setValue}
				config={config}
				section="magic"
			/>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
				<Field label="Classe conjuradora">
					<Input
						placeholder="Mago, Clérigo..."
						{...register("spellcastingClass")}
					/>
				</Field>
				<Field label="Atributo de magia">
					<Input placeholder="INT / SAB / CAR" {...register("spellAbility")} />
				</Field>
				<Field label="CD da magia">
					<AdjustableNumberField
						name="spellSaveDc"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="13"
					/>
				</Field>
				<Field label="Bônus de ataque mágico">
					<AdjustableNumberField
						name="spellAttackBonus"
						register={register}
						control={control}
						setValue={setValue}
						min={-20}
						max={50}
						placeholder="0"
					/>
				</Field>
				<Field
					label="Espaços de magia"
					className="sm:col-span-2"
					hint="Ex: Nv1: 4 / Nv2: 3"
				>
					<Input placeholder="Nv1: 4 / Nv2: 3..." {...register("spellSlots")} />
				</Field>
			</div>

			<div className="space-y-4 border-t border-border/40 pt-4">
				<div className="flex items-center justify-between">
					<h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
						<Sparkles className="h-4 w-4 text-primary" />
						Grimório do Personagem
					</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setDialogOpen(true)}
						className="text-xs h-8 gap-1.5"
					>
						<BookOpen className="h-3.5 w-3.5" />
						Buscar no Grimório
					</Button>
				</div>

				{spellsList.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-border/60 bg-background/30 p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
						<BookOpen className="h-7 w-7 opacity-40 text-primary" />
						<p className="font-semibold text-foreground">
							Nenhuma magia adicionada ao grimório
						</p>
						<p className="text-[11px] text-muted-foreground">
							Clique em "Buscar no Grimório" para explorar e adicionar truques e
							magias.
						</p>
					</div>
				) : (
					<div className="grid gap-2 sm:grid-cols-2">
						{spellsList.map((spell) => (
							<div
								key={spell.id}
								className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-all text-xs group"
							>
								<div className="min-w-0 pr-2">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="font-display font-bold text-foreground truncate">
											{spell.name}
										</span>
										{spell.is_homebrew && (
											<span className="text-[8px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
												HB
											</span>
										)}
									</div>
									<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
										<span className="text-primary font-semibold">
											{spell.level === 0 ? "Truque" : `${spell.level}º Círculo`}
										</span>
										{spell.school && <span>· {spell.school}</span>}
										{spell.casting_time && (
											<span className="text-white/50 hidden sm:inline">
												· {spell.casting_time}
											</span>
										)}
									</div>
								</div>
								<button
									type="button"
									onClick={() => handleRemoveSpell(spell.id)}
									className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors shrink-0"
									title="Remover magia do grimório"
								>
									<Trash className="h-3.5 w-3.5" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{(system !== "dnd5e" || legacySpells.trim()) && (
				<div className="space-y-4 border-t border-border/40 pt-4 mt-6">
					<Field
						label={
							system === "dnd5e"
								? "Magias (Legado / Outras)"
								: "Magias preparadas / conhecidas"
						}
						hint={
							system === "dnd5e"
								? "Campo de texto legado. Recomendamos migrar suas magias para o Grimório estruturado acima."
								: undefined
						}
					>
						<Textarea
							rows={4}
							placeholder="Mísseis Mágicos, Bola de Fogo..."
							{...register("spells")}
						/>
					</Field>
				</div>
			)}

			<SpellSearchDialog
				system={system}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSelectSpell={handleSelectSpell}
				currentSpells={spellsList}
			/>
		</FormSection>
	);
}
