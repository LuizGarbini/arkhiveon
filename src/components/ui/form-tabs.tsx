import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
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
	const containerRef = useRef<HTMLDivElement>(null);
	const [hasOverflow, setHasOverflow] = useState(false);
	const isDragging = useRef(false);
	const startX = useRef(0);
	const scrollLeftState = useRef(0);
	const dragDistance = useRef(0);

	const checkOverflow = () => {
		if (containerRef.current) {
			const { scrollWidth, clientWidth } = containerRef.current;
			setHasOverflow(scrollWidth > clientWidth);
		}
	};

	useEffect(() => {
		checkOverflow();
		window.addEventListener("resize", checkOverflow);
		return () => window.removeEventListener("resize", checkOverflow);
	}, [tabs]);

	const handleMouseDown = (e: React.MouseEvent) => {
		if (!containerRef.current) return;
		isDragging.current = true;
		startX.current = e.pageX - containerRef.current.offsetLeft;
		scrollLeftState.current = containerRef.current.scrollLeft;
		dragDistance.current = 0;
		containerRef.current.style.cursor = "grabbing";
		containerRef.current.style.userSelect = "none";
	};

	const handleMouseLeave = () => {
		if (!isDragging.current) return;
		isDragging.current = false;
		if (containerRef.current) {
			containerRef.current.style.cursor = "pointer";
			containerRef.current.style.userSelect = "";
		}
	};

	const handleMouseUp = () => {
		if (!isDragging.current) return;
		isDragging.current = false;
		if (containerRef.current) {
			containerRef.current.style.cursor = "pointer";
			containerRef.current.style.userSelect = "";
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging.current || !containerRef.current) return;
		e.preventDefault();
		const x = e.pageX - containerRef.current.offsetLeft;
		const walk = (x - startX.current) * 1.5;
		dragDistance.current += Math.abs(x - startX.current);
		containerRef.current.scrollLeft = scrollLeftState.current - walk;
	};

	const scrollRight = () => {
		if (containerRef.current) {
			containerRef.current.scrollBy({ left: 160, behavior: "smooth" });
		}
	};

	return (
		<div className="relative flex items-center w-full">
			<div
				ref={containerRef}
				onMouseDown={handleMouseDown}
				onMouseLeave={handleMouseLeave}
				onMouseUp={handleMouseUp}
				onMouseMove={handleMouseMove}
				className="flex-1 flex flex-nowrap gap-1 rounded-xl border border-border/50 bg-muted/30 p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-pointer"
			>
				{tabs.map((t) => {
					const active = t.id === value;
					return (
						<button
							key={t.id}
							type="button"
							onClick={(e) => {
								if (dragDistance.current > 8) {
									e.preventDefault();
									return;
								}
								onChange(t.id);
							}}
							className={cn(
								"flex-1 shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer text-center whitespace-nowrap",
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
			{hasOverflow && (
				<>
					{/* Gradiente sutil indicando mais abas */}
					<div className="absolute right-9 top-[2px] bottom-[2px] w-8 pointer-events-none bg-gradient-to-r from-transparent to-background/90" />
					<button
						type="button"
						onClick={scrollRight}
						className="ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border shadow-xs cursor-pointer active:scale-95 transition-all"
						aria-label="Ver mais abas"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
				</>
			)}
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
