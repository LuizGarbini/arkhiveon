import { Download, X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Aviso discreto fixo no rodapé, "Nova versão disponível", com ações
 * (Atualizar/Depois). Usado pelo APK (Android) e pela web.
 */
export function UpdateNotice({
	label,
	description,
	descriptionTone = "muted",
	actions,
	onClose,
	closeDisabled,
}: {
	label: string;
	description: ReactNode;
	descriptionTone?: "muted" | "error";
	actions: ReactNode;
	onClose: () => void;
	closeDisabled?: boolean;
}) {
	return (
		<section
			aria-label={label}
			aria-live="polite"
			className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg"
			style={{ marginBottom: "env(safe-area-inset-bottom)" }}
		>
			<Download
				className="mt-0.5 size-4 shrink-0 text-muted-foreground"
				aria-hidden
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">Nova versão disponível</p>
				<p
					className={
						descriptionTone === "error"
							? "text-xs text-destructive"
							: "text-xs text-muted-foreground"
					}
				>
					{description}
				</p>
				<div className="mt-2 flex gap-2">{actions}</div>
			</div>
			<button
				type="button"
				aria-label="Fechar"
				onClick={onClose}
				disabled={closeDisabled}
				className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
			>
				<X className="size-4" />
			</button>
		</section>
	);
}
