import { getAttributeFullName } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Tab {
	id: string;
	label: string;
	hint?: string;
}

interface FormTabsProps {
	tabs: Tab[];
	value: string;
	onChange: (id: string) => void;
}

export function FormTabs({ tabs, value, onChange }: FormTabsProps) {
	return (
		<div className="flex flex-wrap gap-1 rounded-xl border border-border/50 bg-muted/30 p-1">
			{tabs.map((t) => {
				const active = t.id === value;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => onChange(t.id)}
						className={cn(
							"flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer text-center",
							active
								? "bg-card text-foreground border border-border/70 shadow-xs"
								: "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent",
						)}
					>
						{t.label}
					</button>
				);
			})}
		</div>
	);
}

interface FormSectionProps {
	title: string;
	description?: string;
	children: React.ReactNode;
}

export function FormSection({
	title,
	description,
	children,
}: FormSectionProps) {
	return (
		<section className="space-y-3">
			<div>
				<h4 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground heading-rule">
					{title}
				</h4>
				{description && (
					<p className="mt-2 text-[12px] text-muted-foreground">
						{description}
					</p>
				)}
			</div>
			<div className="space-y-3">{children}</div>
		</section>
	);
}

interface FieldProps {
	label: string;
	htmlFor?: string;
	hint?: string;
	error?: string;
	required?: boolean;
	className?: string;
	children: React.ReactNode;
}

export function Field({
	label,
	htmlFor,
	hint,
	error,
	required,
	className,
	children,
}: FieldProps) {
	const fullName = getAttributeFullName(label);
	const hasTooltip = fullName !== label;

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div className="group/tooltip relative flex items-center">
				<label
					htmlFor={htmlFor}
					className={cn(
						"text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors",
						hasTooltip &&
							"cursor-help underline decoration-dotted underline-offset-2 decoration-muted-foreground/45 hover:decoration-primary/60 hover:text-foreground",
					)}
				>
					{label}
					{required ? (
						<span className="ml-1 text-destructive" aria-hidden="true">
							*
						</span>
					) : null}
				</label>
				{hasTooltip && (
					<div className="pointer-events-none absolute -top-8 left-0 z-30 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-9 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
						{fullName}
					</div>
				)}
			</div>
			{children}
			{error ? (
				<span className="text-[10.5px] text-destructive font-medium leading-none mt-0.5">
					{error}
				</span>
			) : hint ? (
				<span className="text-[10px] text-muted-foreground/70">{hint}</span>
			) : null}
		</div>
	);
}
