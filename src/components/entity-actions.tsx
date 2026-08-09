import { Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useActiveCampaignRole, useIsWorldStaff } from "@/lib/store";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

interface EntityActionsProps {
	onEdit: () => void;
	onDelete: () => void;
	entityName: string;
	entityKindLabel: string;
	/** Grimório do Mundo: exige staff em qualquer campanha do mesmo worldId. */
	worldStaffOnly?: boolean;
	/** Quando definido, substitui a checagem de role/staff. */
	canManage?: boolean;
	/** Ações adicionais renderizadas antes de Editar e Excluir. */
	extraActions?: ReactNode;
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
	worldStaffOnly = false,
	canManage: canManageProp,
	extraActions,
}: EntityActionsProps) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const role = useActiveCampaignRole();
	const isWorldStaff = useIsWorldStaff();
	const canManage =
		canManageProp ??
		(worldStaffOnly
			? isWorldStaff
			: role === "owner" || role === "editor");

	function handleConfirmDelete() {
		onDelete();
		setConfirmOpen(false);
	}

	return (
		<>
			<div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5 opacity-100 md:opacity-0 transition-opacity duration-200 md:group-hover:opacity-100 focus-within:opacity-100">
				{extraActions}
				{!canManage ? (
					<div className="group/tooltip relative">
						<div className="pointer-events-none absolute -top-8 right-0 z-30 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-9 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
							Sem permissão para editar
						</div>
						<button
							type="button"
							disabled
							className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md border border-border bg-background/50 text-muted-foreground/30 backdrop-blur"
							aria-label={`Editar ${entityKindLabel}`}
						>
							<Pencil className="h-3.5 w-3.5" />
						</button>
					</div>
				) : (
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
				)}

				{!canManage ? (
					<div className="group/tooltip relative">
						<div className="pointer-events-none absolute -top-8 right-0 z-30 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-9 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
							Sem permissão para excluir
						</div>
						<button
							type="button"
							disabled
							className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md border border-border bg-background/50 text-muted-foreground/30 backdrop-blur"
							aria-label={`Excluir ${entityKindLabel}`}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</button>
					</div>
				) : (
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
				)}
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
				className="sm:max-w-md overflow-hidden p-0"
				onClick={(event) => event.stopPropagation()}
			>
				<DialogHeader className="border-b border-border/70 px-6 pb-4 pt-6">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400">
							<Trash2 className="h-5 w-5" />
						</div>
						<div>
							<DialogTitle className="font-display text-base uppercase tracking-wider text-foreground">
								{title}
							</DialogTitle>
						</div>
					</div>
				</DialogHeader>

				<div className="px-6 py-5">
					<DialogDescription className="text-[13px] text-muted-foreground leading-relaxed">
						{description}
					</DialogDescription>
				</div>

				<div className="flex items-center justify-end gap-2 border-t border-border/70 bg-card-elevated/40 px-6 py-3">
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
				</div>
			</DialogContent>
		</Dialog>
	);
}
