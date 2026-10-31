import { type FormEvent, type RefObject, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	isDialogDismissSaveReason,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { clearDraft, readDraft, writeDraft } from "@/lib/form-draft";
import type { Character } from "@/lib/store";

const CHARACTER_NAME_DRAFT_FORM_ID = "character-name";
const CHARACTER_NAME_INPUT_ID = "character-name";

type CharacterNameDraft = { name: string };

type DismissSave = {
	run: () => void;
};

function readCharacterNameDraft(characterId: string, savedName: string) {
	const stored = readDraft<Partial<CharacterNameDraft>>(
		CHARACTER_NAME_DRAFT_FORM_ID,
		characterId,
	);
	if (stored && typeof stored.name === "string") {
		return { value: stored.name, fromDraft: true };
	}
	return { value: savedName, fromDraft: false };
}

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
	const dismissSaveRef = useRef<DismissSave>({ run: () => {} });
	if (!open) dismissSaveRef.current.run = () => {};
	const savedName = character.characterName ?? "";

	function discardDraft() {
		clearDraft(CHARACTER_NAME_DRAFT_FORM_ID, character.id);
	}

	return (
		<Dialog
			open={open}
			onDismissSave={() => dismissSaveRef.current.run()}
			onOpenChange={(next, details) => {
				if (!next && !isDialogDismissSaveReason(details.reason)) {
					discardDraft();
				}
				onOpenChange(next);
			}}
		>
			{open ? (
				<CharacterNameDialogForm
					key={`${character.id}-${savedName}`}
					characterId={character.id}
					savedName={savedName}
					dismissSaveRef={dismissSaveRef}
					onCommit={onSave}
					onCancel={() => {
						discardDraft();
						onOpenChange(false);
					}}
					onSave={(name) => {
						discardDraft();
						onSave(name);
						onOpenChange(false);
					}}
				/>
			) : null}
		</Dialog>
	);
}

function CharacterNameDialogForm({
	characterId,
	savedName,
	dismissSaveRef,
	onCommit,
	onCancel,
	onSave,
}: {
	characterId: string;
	savedName: string;
	dismissSaveRef: RefObject<DismissSave>;
	onCommit: (name: string) => void;
	onCancel: () => void;
	onSave: (name: string) => void;
}) {
	const [snapshot] = useState(() =>
		readCharacterNameDraft(characterId, savedName),
	);
	const [draftName, setDraftName] = useState(snapshot.value);
	const canSave = draftName.trim().length > 0;
	const initialValue = snapshot.value;

	dismissSaveRef.current.run = () => {
		const trimmed = draftName.trim();
		if (!trimmed) {
			writeDraft(CHARACTER_NAME_DRAFT_FORM_ID, characterId, {
				name: draftName,
			});
			return;
		}
		if (trimmed !== initialValue.trim()) {
			clearDraft(CHARACTER_NAME_DRAFT_FORM_ID, characterId);
			onCommit(trimmed);
		}
	};

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

				<Field
					label="Nome do personagem"
					htmlFor={CHARACTER_NAME_INPUT_ID}
					hint={snapshot.fromDraft ? "Rascunho restaurado" : undefined}
				>
					<Input
						id={CHARACTER_NAME_INPUT_ID}
						value={draftName}
						onChange={(event) => setDraftName(event.target.value)}
						placeholder="Ex: Lyra Cinzal"
						autoFocus
						spellCheck={false}
						autoComplete="off"
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
