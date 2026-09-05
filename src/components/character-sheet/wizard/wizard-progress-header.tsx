import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, type WizardStep } from "./types";

export function WizardProgressHeader({
	activeStep,
	onSelectStep,
	stepError,
}: {
	activeStep: WizardStep;
	onSelectStep: (step: WizardStep) => void;
	stepError?: string | null;
}) {
	const activeStepIndex = WIZARD_STEPS.findIndex(
		(step) => step.id === activeStep,
	);
	const progress = Math.round(
		((activeStepIndex + 1) / WIZARD_STEPS.length) * 100,
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between text-xs">
				<span className="font-semibold text-muted-foreground">
					Passo {activeStepIndex + 1} de {WIZARD_STEPS.length}:{" "}
					<strong className="text-foreground">
						{WIZARD_STEPS[activeStepIndex]?.label}
					</strong>
				</span>
				<span className="font-mono font-bold text-primary tabular-nums">
					{progress}% concluído
				</span>
			</div>

			<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
				<div
					className="h-full bg-primary transition-all duration-300 ease-out"
					style={{ width: `${progress}%` }}
				/>
			</div>

			<nav
				aria-label="Etapas de criação"
				className="flex items-center justify-between gap-1 overflow-x-auto pb-2 scrollbar-none"
			>
				{WIZARD_STEPS.map((step, idx) => {
					const isCurrent = step.id === activeStep;
					const isPast = idx < activeStepIndex;

					return (
						<button
							key={step.id}
							type="button"
							onClick={() => onSelectStep(step.id)}
							className={cn(
								"flex min-w-[120px] flex-1 items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all select-none cursor-pointer",
								isCurrent
									? "border-primary/60 bg-primary/10 ring-1 ring-primary/20"
									: isPast
										? "border-border/60 bg-card/40 hover:bg-card/80 hover:border-border"
										: "border-border/40 bg-background/20 opacity-60 hover:opacity-100",
							)}
						>
							<div
								className={cn(
									"flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
									isCurrent
										? "bg-primary text-white"
										: isPast
											? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
											: "bg-muted/40 text-muted-foreground",
								)}
							>
								{isPast ? <Check className="h-3.5 w-3.5" /> : idx + 1}
							</div>
							<div className="min-w-0">
								<p
									className={cn(
										"text-xs font-bold truncate",
										isCurrent ? "text-primary" : "text-foreground",
									)}
								>
									{step.label}
								</p>
								<p className="text-[10px] text-muted-foreground truncate hidden sm:block">
									{step.description}
								</p>
							</div>
						</button>
					);
				})}
			</nav>

			{stepError && (
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-semibold text-destructive animate-shake">
					{stepError}
				</div>
			)}
		</div>
	);
}
