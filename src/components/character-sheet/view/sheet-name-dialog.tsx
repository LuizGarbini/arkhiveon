import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import type { Character } from "@/lib/store";

export function CharacterNameDialog({
	character,
	open,
	onOpenChange,
	onSave,
}: {
	character: Character;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (characterName: string) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open && (
				<CharacterNameDialogForm
					key={`${character.id}-${character.characterName}`}
					initialName={character.characterName ?? ""}
					onCancel={() => onOpenChange(false)}
					onSave={(name) => {
						onSave(name);
						onOpenChange(false);
					}}
				/>
			)}
		</Dialog>
	);
}

function CharacterNameDialogForm({
	initialName,
	onCancel,
	onSave,
}: {
	initialName: string;
	onCancel: () => void;
	onSave: (name: string) => void;
}) {
	const [draftName, setDraftName] = useState(initialName);
	const canSave = draftName.trim().length > 0;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = draftName.trim();
		if (!trimmed) return;
		onSave(trimmed);
	}

	return (
		<DialogContent className="max-w-md!">
			<form onSubmit={handleSubmit} className="space-y-5">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">
						Renomear personagem
					</DialogTitle>
					<DialogDescription>
						Atualize o nome exibido no cabeçalho, nos cards e na ficha.
					</DialogDescription>
				</DialogHeader>

				<Field label="Nome do personagem">
					<Input
						value={draftName}
						onChange={(event) => setDraftName(event.target.value)}
						placeholder="Ex: Lyra Cinzal"
						autoFocus
						className="min-h-[44px]"
					/>
				</Field>

				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={onCancel}
						className="min-h-[44px] cursor-pointer"
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						disabled={!canSave}
						className="min-h-[44px] cursor-pointer"
					>
						Salvar nome
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
