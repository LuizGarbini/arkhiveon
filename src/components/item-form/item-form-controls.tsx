import { Check, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { Item } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";

export type ItemFormValues = Omit<Item, "id" | "createdAt" | "updatedAt">;
export type ItemFormApi = UseFormReturn<ItemFormValues>;

interface SegmentedProps<T extends string> {
	value: T;
	options: { value: T; label: string }[];
	onChange: (value: T) => void;
	ariaLabel: string;
	className?: string;
}

/** Seletor segmentado (mesmo visual do FormTabs), alvo ≥ 44 px no toque. */
export function Segmented<T extends string>({
	value,
	options,
	onChange,
	ariaLabel,
	className,
}: SegmentedProps<T>) {
	return (
		<div
			role="radiogroup"
			aria-label={ariaLabel}
			className={cn(
				"flex w-full select-none gap-1 rounded-xl border border-border/50 bg-muted/30 p-1",
				className,
			)}
		>
			{options.map((option) => {
				const active = option.value === value;
				return (
					// biome-ignore lint/a11y/useSemanticElements: segmentado com botões (padrão do FormTabs)
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => onChange(option.value)}
						className={cn(
							"min-h-11 flex-1 cursor-pointer whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-9",
							active
								? "border-border/70 bg-card text-foreground shadow-xs"
								: "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

interface ToggleChipProps {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
	className?: string;
	activeClassName?: string;
	ariaLabel?: string;
}

export function ToggleChip({
	active,
	onClick,
	children,
	className,
	activeClassName,
	ariaLabel,
}: ToggleChipProps) {
	return (
		<button
			type="button"
			aria-pressed={active}
			aria-label={ariaLabel}
			onClick={onClick}
			className={cn(
				"inline-flex min-h-11 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-8",
				active
					? (activeClassName ?? "border-primary/40 bg-primary/15 text-primary")
					: "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
				className,
			)}
		>
			{active && !activeClassName ? <Check className="h-3.5 w-3.5" /> : null}
			{children}
		</button>
	);
}

interface CollapsibleRowProps {
	title: string;
	summary?: string;
	children: ReactNode;
}

/** Linha que expande: detalhe secundário fica fechado por padrão. */
export function CollapsibleRow({
	title,
	summary,
	children,
}: CollapsibleRowProps) {
	const [open, setOpen] = useState(false);
	return (
		<div className="rounded-xl border border-border/60 bg-background/30">
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className="flex min-h-12 w-full cursor-pointer select-none items-center gap-2 rounded-xl px-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
			>
				<ChevronRight
					className={cn(
						"h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
						open && "rotate-90",
					)}
				/>
				<span className="text-[13px] font-medium text-foreground">{title}</span>
				{summary ? (
					<span className="ml-auto truncate pl-3 text-[12px] tabular-nums text-muted-foreground">
						{summary}
					</span>
				) : null}
			</button>
			{open ? (
				<div className="border-t border-border/50 px-3.5 py-3.5">
					{children}
				</div>
			) : null}
		</div>
	);
}

function formatSigned(value: number | undefined): string {
	if (value === undefined || Number.isNaN(value)) return "";
	return value >= 0 ? `+${value}` : String(value);
}

interface SignedNumberInputProps {
	id?: string;
	value: number | undefined;
	onChange: (value: number | undefined) => void;
	placeholder?: string;
	className?: string;
	ariaLabel?: string;
}

/** Número com sinal ("+1", "-2"); vazio = sem valor. */
export function SignedNumberInput({
	id,
	value,
	onChange,
	placeholder = "+0",
	className,
	ariaLabel,
}: SignedNumberInputProps) {
	const [text, setText] = useState(() => formatSigned(value));
	return (
		<Input
			id={id}
			inputMode="numeric"
			aria-label={ariaLabel}
			placeholder={placeholder}
			className={cn("tabular-nums", className)}
			value={text}
			onChange={(event) => {
				const next = event.target.value.replace(/[^\d+-]/g, "");
				setText(next);
				const parsed = Number.parseInt(next, 10);
				onChange(Number.isFinite(parsed) ? parsed : undefined);
			}}
			onBlur={() => setText(formatSigned(value))}
		/>
	);
}

export function HelpText({ children }: { children: ReactNode }) {
	return <p className="text-[12px] text-muted-foreground">{children}</p>;
}
