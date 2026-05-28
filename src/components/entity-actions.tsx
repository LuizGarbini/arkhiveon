import { Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

interface EntityActionsProps {
	onEdit: () => void;
	onDelete: () => void;
	entityName: string;
	entityKindLabel: string;
}

/**
 * Botões flutuantes (canto top-right) para editar/excluir uma entidade.
 * Aparecem com hover sobre o card. Pra cliques em mobile, usa um leve
 * padding pra ser tocável.
 */
export function EntityActions({
	onEdit,
	onDelete,
	entityName,
	entityKindLabel,
}: EntityActionsProps) {
	const [confirmOpen, setConfirmOpen] = useState(false);

	function handleConfirmDelete() {
		onDelete();
		setConfirmOpen(false);
	}

	return (
		<>
			<div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-100 md:opacity-0 transition-opacity duration-200 md:group-hover:opacity-100 focus-within:opacity-100">
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onEdit();
					}}
					className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
					aria-label={`Editar ${entityKindLabel}`}
					title="Editar"
				>
					<Pencil className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setConfirmOpen(true);
					}}
					className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:border-rose-500/40 hover:text-rose-300"
					aria-label={`Excluir ${entityKindLabel}`}
					title="Excluir"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>

			<ConfirmDeleteDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={`Excluir ${entityKindLabel}?`}
				description={
					<>
						Tem certeza que deseja excluir{" "}
						<span className="font-semibold text-foreground">{entityName}</span>?
						Esta ação não pode ser desfeita.
					</>
				}
				onConfirm={handleConfirmDelete}
			/>
		</>
	);
}

interface ConfirmDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: ReactNode;
	onConfirm: () => void;
}

function ConfirmDeleteDialog({
	open,
	onOpenChange,
	title,
	description,
	onConfirm,
}: ConfirmDeleteDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-md"
				onClick={(event) => event.stopPropagation()}
			>
				<DialogHeader>
					<DialogTitle className="font-display text-base">{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="ghost"
						size="sm"
						type="button"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onOpenChange(false);
						}}
					>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						size="sm"
						type="button"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onConfirm();
						}}
					>
						<Trash2 className="h-3.5 w-3.5" />
						Excluir
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
