import { useRouterState } from "@tanstack/react-router";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Aviso discreto fixo no rodapé, "Nova versão disponível", com ações
 * (Atualizar/Depois). Usado pelo APK (Android) e pela web. Na mesa (VTT) vai
 * para o canto (desktop) ou sobe acima das barras do rodapé (celular) para
 * não cobrir o zoom/tela cheia.
 */
export function UpdateNotice({
	label,
	description,
	descriptionTone = "muted",
	actions,
}: {
	label: string;
	description: ReactNode;
	descriptionTone?: "muted" | "error";
	actions: ReactNode;
}) {
	const onVtt = useRouterState({
		select: (state) => /\/vtt\/?$/.test(state.location.pathname),
	});
	return (
		<section
			aria-label={label}
			aria-live="polite"
			className={cn(
				"fixed inset-x-3 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg",
				onVtt
					? "bottom-36 sm:bottom-3 sm:left-auto sm:right-3 sm:mx-0 sm:w-[22rem]"
					: "bottom-3",
			)}
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
		</section>
	);
}
