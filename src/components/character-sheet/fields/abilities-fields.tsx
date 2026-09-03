import { Dices, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Path } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { DiceRollOverlay } from "@/components/dice-roll-overlay";
import { Button } from "@/components/ui/button";
import { Field, FormSection } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { getAttributeExtraInfo, getAttributeFullName } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import { getAttributeConstraints } from "../helpers";
import {
	type CharacterControl,
	type CharacterFormValues,
	type CharacterRegister,
	type CharacterSetValue,
	STANDARD_CHARACTER_ATTRIBUTE_KEYS,
} from "../types";

export function AbilitiesFields({
	register,
	control,
	setValue,
	config,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
}) {
	const fields = config.attributes || [];

	const [rollState, setRollState] = useState<{
		open: boolean;
		label: string;
		fieldName: Path<CharacterFormValues> | null;
	}>({
		open: false,
		label: "",
		fieldName: null,
	});

	const handleRollTrigger = (
		label: string,
		fieldName: Path<CharacterFormValues>,
	) => {
		setRollState({
			open: true,
			label,
			fieldName,
		});
	};

	const handleRollComplete = (value: number) => {
		if (rollState.fieldName) {
			setValue(rollState.fieldName, value, {
				shouldValidate: true,
				shouldDirty: true,
			});
		}
	};

	const handleRollAll = () => {
		const rollSingle = (system: string) => {
			if (system === "coc" || system === "ordem") {
				const r = () => Math.floor(Math.random() * 6) + 1;
				return (r() + r() + r()) * 5;
			}
			const rolls = Array.from(
				{ length: 4 },
				() => Math.floor(Math.random() * 6) + 1,
			);
			rolls.sort((a, b) => a - b);
			return rolls[1] + rolls[2] + rolls[3];
		};

		for (const field of fields) {
			const isStandardKey = STANDARD_CHARACTER_ATTRIBUTE_KEYS.includes(
				field.key as (typeof STANDARD_CHARACTER_ATTRIBUTE_KEYS)[number],
			);
			const fieldName = (
				isStandardKey ? field.key : `systemAttributes.${field.key}`
			) as Path<CharacterFormValues>;
			const newValue = rollSingle(config.value);
			setValue(fieldName, newValue, {
				shouldValidate: true,
				shouldDirty: true,
			});
		}
	};

	return (
		<>
			<FormSection
				title="Atributos Primários"
				description={
					config.value === "coc" || config.value === "ordem"
						? "Cthulhu/Ordem: pontos podem ir até 99 (escala percentual)."
						: "Pontuações de 1 a 30."
				}
			>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
					<div className="text-xs text-muted-foreground">
						Ajuste manualmente ou use os dados para rolar os atributos do seu
						personagem.
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleRollAll}
						className="min-h-[44px] gap-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer self-start sm:self-auto"
					>
						<Sparkles className="h-4 w-4" />
						Rolar Todos (
						{config.value === "coc" || config.value === "ordem"
							? "3d6*5"
							: "4d6 drop 1"}
						)
					</Button>
				</div>

				<div
					className={`grid gap-3 ${
						fields.length >= 8
							? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
							: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
					}`}
				>
					{fields.map((field) => (
						<AbilityInputField
							key={field.key}
							label={field.label}
							name={field.key}
							register={register}
							control={control}
							setValue={setValue}
							config={config}
							onRollTrigger={handleRollTrigger}
						/>
					))}
				</div>

				{config.customFields?.some((f) => f.section === "abilities") && (
					<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
						{config.customFields
							.filter((f) => f.section === "abilities")
							.map((field) => (
								<Field key={field.key} label={field.label}>
									<Input
										placeholder="..."
										className="min-h-[44px]"
										{...register(
											`systemFields.${field.key}` as Path<CharacterFormValues>,
										)}
									/>
								</Field>
							))}
					</div>
				)}
			</FormSection>

			<DiceRollOverlay
				open={rollState.open}
				attributeLabel={rollState.label}
				diceType={config.defaultDice || "d20"}
				onComplete={handleRollComplete}
				onClose={() => setRollState((s) => ({ ...s, open: false }))}
			/>
		</>
	);
}

function AbilityInputField({
	label,
	name,
	register,
	control,
	setValue,
	config,
	onRollTrigger,
}: {
	label: string;
	name: string;
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
	onRollTrigger?: (label: string, fieldName: Path<CharacterFormValues>) => void;
}) {
	const isStandardKey = STANDARD_CHARACTER_ATTRIBUTE_KEYS.includes(
		name as (typeof STANDARD_CHARACTER_ATTRIBUTE_KEYS)[number],
	);
	const { min, max, placeholder } = getAttributeConstraints(config);

	const fieldName = (
		isStandardKey ? name : `systemAttributes.${name}`
	) as Path<CharacterFormValues>;
	const value = useWatch({ control, name: fieldName });
	const fallbackScore = Number.parseInt(placeholder, 10) || 10;
	const numeric =
		typeof value === "number" && !Number.isNaN(value)
			? value
			: Number.parseInt(value as string, 10) || fallbackScore;

	const handleAdjustment = (delta: number) => {
		const currentVal =
			Number.isNaN(numeric) || numeric === 0 ? fallbackScore : numeric;
		const newVal = Math.max(min, Math.min(max, currentVal + delta));
		setValue(fieldName, newVal, { shouldValidate: true, shouldDirty: true });
	};

	const handleRollSingle = () => {
		if (onRollTrigger) {
			onRollTrigger(label || name, fieldName);
		}
	};

	const fullName = getAttributeFullName(label || name);
	const extraInfo = getAttributeExtraInfo(numeric, config.value);

	return (
		<div className="group/tooltip relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-card/50 hover:bg-card p-3 shadow-xs transition-all duration-200 hover:border-primary/35 hover:-translate-y-[2px] hover:shadow-md hover:shadow-primary/5">
			{/* Tooltip */}
			<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
				{fullName}
			</div>

			{/* Individual Attribute Dice Roller */}
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				onClick={handleRollSingle}
				className="absolute -top-1 -right-1 min-h-[44px] min-w-[44px] text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded-md shrink-0 md:opacity-40 group-hover/tooltip:opacity-100 hover:!opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
				title="Rolar este atributo"
				aria-label={`Rolar dado para ${fullName}`}
			>
				<Dices className="h-4 w-4" />
			</Button>

			<span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover/tooltip:text-primary">
				{label}
			</span>

			<div className="flex w-full items-center justify-between gap-1 rounded-lg border border-border/60 bg-muted/20 min-h-[44px] p-1 focus-within:border-primary/45 transition-all">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					disabled={numeric <= min}
					onClick={() => handleAdjustment(-1)}
					className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:scale-90 select-none shrink-0 cursor-pointer"
					aria-label={`Diminuir ${label}`}
				>
					<Minus className="h-3.5 w-3.5" />
				</Button>

				<div className="relative flex-1 h-8 flex items-center justify-center min-w-0">
					<span
						key={numeric}
						className="t-digit-group is-animating text-[15px] font-extrabold text-foreground pointer-events-none select-none"
					>
						{String(
							Number.isNaN(numeric) || numeric === 0 ? fallbackScore : numeric,
						)
							.split("")
							.map((digit, i, arr) => {
								let staggerVal: string | undefined;
								if (i === arr.length - 2) staggerVal = "1";
								else if (i === arr.length - 1) staggerVal = "2";
								return (
									// biome-ignore lint/suspicious/noArrayIndexKey: split digits are transient
									<span key={i} className="t-digit" data-stagger={staggerVal}>
										{digit}
									</span>
								);
							})}
					</span>

					<input
						type="number"
						min={min}
						max={max}
						placeholder={placeholder}
						className="absolute inset-0 w-full h-full opacity-0 cursor-default outline-none border-none p-0 text-center text-[15px] font-extrabold text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						{...register(fieldName, { valueAsNumber: true })}
					/>
				</div>

				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					disabled={numeric >= max}
					onClick={() => handleAdjustment(1)}
					className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:scale-90 select-none shrink-0 cursor-pointer"
					aria-label={`Aumentar ${label}`}
				>
					<Plus className="h-3.5 w-3.5" />
				</Button>
			</div>

			{extraInfo ? (
				<span className="font-mono text-[11.5px] font-extrabold tabular-nums text-primary/80 transition-colors group-hover/tooltip:text-primary">
					{extraInfo}
				</span>
			) : (
				<span className="h-4" />
			)}
		</div>
	);
}
