import { Keyboard } from "lucide-react";
import {
	getPrimaryModifierLabel,
	NAVIGATION_SHORTCUTS,
} from "@/lib/keyboard-shortcuts";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

interface KeyboardShortcutsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
	open,
	onOpenChange,
}: KeyboardShortcutsDialogProps) {
	const primaryModifier = getPrimaryModifierLabel();
	const generalShortcuts = [
		{ keys: [primaryModifier, "K"], label: "Pesquisa global" },
		{ keys: [primaryModifier, "/"], label: "Abrir atalhos" },
		{ keys: ["Alt", "S"], label: "Filtrar lista atual" },
		{ keys: ["Alt", "N"], label: "Novo registro da página" },
		{ keys: ["Alt", "M"], label: "Ir para o conteúdo principal" },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl overflow-hidden p-0">
				<DialogHeader className="border-b border-border/70 px-5 pb-4 pt-5">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
							<Keyboard className="h-5 w-5" />
						</div>
						<div>
							<DialogTitle className="font-display text-lg">
								Atalhos de teclado
							</DialogTitle>
							<DialogDescription>
								Comandos rápidos para navegar sem tirar as mãos do teclado.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
					<ShortcutGroup title="Gerais" shortcuts={generalShortcuts} />
					<ShortcutGroup
						title="Navegação"
						shortcuts={NAVIGATION_SHORTCUTS.map((shortcut) => ({
							keys: ["Alt", shortcut.key],
							label: shortcut.label,
						}))}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ShortcutGroup({
	title,
	shortcuts,
}: {
	title: string;
	shortcuts: Array<{ keys: string[]; label: string }>;
}) {
	return (
		<section>
			<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{title}
			</h3>
			<div className="mt-3 space-y-2">
				{shortcuts.map((shortcut) => (
					<div
						key={`${shortcut.label}-${shortcut.keys.join("-")}`}
						className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/55 px-3 py-2"
					>
						<span className="min-w-0 text-[12px] font-semibold text-foreground">
							{shortcut.label}
						</span>
						<div className="flex shrink-0 items-center gap-1">
							{shortcut.keys.map((key) => (
								<kbd
									key={key}
									className="min-w-6 rounded-md border border-border/80 bg-muted/70 px-1.5 py-1 text-center font-mono text-[10px] font-bold text-muted-foreground shadow-xs"
								>
									{key}
								</kbd>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
