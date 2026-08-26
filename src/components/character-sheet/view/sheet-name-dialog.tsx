import { type FormEvent, useEffect, useState } from "react";
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
	const [draftName, setDraftName] = useState(character.characterName ?? "");
	const canSave = draftName.trim().length > 0;

	useEffect(() => {
		if (open) setDraftName(character.characterName ?? "");
	}, [character.characterName, open]);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const characterName = draftName.trim();
		if (!characterName) return;
		onSave(characterName);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
						/>
					</Field>

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={!canSave}>
							Salvar nome
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
