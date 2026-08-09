import { useEffect, useId, useState } from "react";
import { useRPGStore } from "@/lib/store";
import type { World } from "@/lib/store/types";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

interface WorldFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	world?: World | null;
	/** Called after the world is created and set as active. */
	onCreated?: (worldId: string) => void;
}

export function WorldForm({
	open,
	onOpenChange,
	world,
	onCreated,
}: WorldFormProps) {
	const createWorld = useRPGStore((s) => s.createWorld);
	const updateWorld = useRPGStore((s) => s.updateWorld);
	const switchWorld = useRPGStore((s) => s.switchWorld);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const nameId = useId();

	const isEditing = !!world;

	useEffect(() => {
		if (open) {
			setName(world?.name ?? "");
			setError(null);
		}
	}, [open, world?.name]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim() || isSaving) return;
		setError(null);
		setIsSaving(true);
		try {
			if (isEditing && world) {
				updateWorld(world.id, { name: name.trim() });
			} else {
				const createdWorld = await createWorld(name.trim());
				await switchWorld(createdWorld.id);
				onCreated?.(createdWorld.id);
			}
			onOpenChange(false);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: isEditing
						? "Erro ao atualizar Mundo."
						: "Erro ao criar Mundo.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="font-display">
						{isEditing ? "Editar Mundo" : "Novo Mundo"}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Altere o nome da ambientação do seu grupo."
							: "Uma ambientação compartilhada entre campanhas (grimório, facções e mural)."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<label
							htmlFor={nameId}
							className="text-[12px] font-semibold text-foreground"
						>
							Nome do Mundo *
						</label>
						<Input
							id={nameId}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ex: Faerûn, Eberron..."
							autoFocus
						/>
					</div>
					{error && (
						<p className="text-[11px] font-medium text-destructive">{error}</p>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							loading={isSaving}
							loadingText={isEditing ? "Salvando..." : "Criando..."}
							disabled={!name.trim()}
						>
							{isEditing ? "Salvar" : "Criar Mundo"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

