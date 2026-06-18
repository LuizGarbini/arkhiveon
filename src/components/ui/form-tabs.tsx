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
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<label
				htmlFor={htmlFor}
				className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{label}
				{required ? (
					<span className="ml-1 text-destructive" aria-hidden="true">
						*
					</span>
				) : null}
			</label>
			{children}
			{error ? (
				<span className="text-[10.5px] text-destructive font-medium leading-none mt-0.5">{error}</span>
			) : hint ? (
				<span className="text-[10px] text-muted-foreground/70">{hint}</span>
			) : null}
		</div>
	);
}
