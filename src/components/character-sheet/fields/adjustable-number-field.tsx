import { Minus, Plus } from "lucide-react";
import type { Path, RegisterOptions } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
	CharacterControl,
	CharacterFormValues,
	CharacterRegister,
	CharacterSetValue,
} from "../types";

export interface AdjustableNumberFieldProps {
	name: string;
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	min?: number;
	max?: number;
	step?: number | "any";
	placeholder?: string;
	className?: string;
	validate?: RegisterOptions<
		CharacterFormValues,
		Path<CharacterFormValues>
	>["validate"];
}

export function AdjustableNumberField({
	name,
	register,
	control,
	setValue,
	min = 0,
	max = 9999,
	step = "any",
	placeholder = "0",
	className,
	validate,
}: AdjustableNumberFieldProps) {
	const fieldName = name as Path<CharacterFormValues>;
	const value = useWatch({ control, name: fieldName });
	const numeric =
		typeof value === "number" && !Number.isNaN(value)
			? value
			: Number.parseFloat(value as string) || 0;

	const handleAdjustment = (delta: number) => {
		const currentVal = Number.isNaN(numeric) ? 0 : numeric;
		const stepVal = typeof step === "number" ? step : 0.5;
		const newVal = Math.max(min, Math.min(max, currentVal + delta * stepVal));
		const roundedVal = Math.round(newVal * 10) / 10;
		setValue(fieldName, roundedVal, {
			shouldValidate: true,
			shouldDirty: true,
		});
	};

	return (
		<div
			className={cn(
				"relative flex items-center w-full max-w-[140px] rounded-lg border border-border bg-input/10 focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-primary/15 transition-all p-0.5",
				className,
			)}
		>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				disabled={numeric <= min}
				onClick={() => handleAdjustment(-1)}
				className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:scale-90 transition-all select-none disabled:opacity-30 disabled:pointer-events-none shrink-0"
			>
				<Minus className="h-3 w-3" />
			</Button>

			<div className="relative flex-1 h-7 flex items-center justify-center min-w-0">
				<span
					key={numeric}
					className="t-digit-group is-animating text-[13.5px] font-extrabold text-foreground pointer-events-none select-none"
				>
					{String(Number.isNaN(numeric) ? 0 : numeric)
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
					step={step}
					placeholder={placeholder}
					className="absolute inset-0 w-full h-full opacity-0 cursor-default outline-none border-none p-0 text-center text-[13.5px] font-extrabold text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
					{...register(fieldName, { valueAsNumber: true, validate })}
				/>
			</div>

			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				disabled={numeric >= max}
				onClick={() => handleAdjustment(1)}
				className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:scale-90 transition-all select-none disabled:opacity-30 disabled:pointer-events-none shrink-0"
			>
				<Plus className="h-3 w-3" />
			</Button>
		</div>
	);
}
