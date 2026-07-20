import { useEffect, useId, useState } from "react";
import { useRPGStore } from "@/lib/store";
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
	/** Called after the world is created and set as active. */
	onCreated?: (worldId: string) => void;
}

export function WorldForm({ open, onOpenChange, onCreated }: WorldFormProps) {
	const createWorld = useRPGStore((s) => s.createWorld);
	const switchWorld = useRPGStore((s) => s.switchWorld);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const nameId = useId();

	useEffect(() => {
		if (open) {
			setName("");
			setError(null);
		}
	}, [open]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim() || isSaving) return;
		setError(null);
		setIsSaving(true);
		try {
			const world = await createWorld(name.trim());
			await switchWorld(world.id);
			onOpenChange(false);
			onCreated?.(world.id);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erro ao criar Mundo.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="font-display">Novo Mundo</DialogTitle>
					<DialogDescription>
						Uma ambientação compartilhada entre campanhas (grimório, facções e
						mural).
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
							loadingText="Criando..."
							disabled={!name.trim()}
						>
							Criar Mundo
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
