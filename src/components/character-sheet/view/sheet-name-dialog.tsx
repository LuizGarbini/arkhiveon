import { type FormEvent, type RefObject, useId, useRef, useState } from "react";
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
import {
	clearDraft,
	persistDraft,
	readRestorableDraft,
} from "@/lib/form-draft";
import type { Character } from "@/lib/store";

const CHARACTER_NAME_DRAFT_FORM_ID = "character-name";
const CHARACTER_NAME_INPUT_ID = "character-name";

type CharacterNameDraft = { name: string };

type DismissSave = {
	run: () => void | Promise<void>;
};

function namePolicy(savedName: string) {
	return {
		saved: { name: savedName },
		required: ["name"] as const,
	};
}

function readCharacterNameDraft(characterId: string, savedName: string) {
	const stored = readRestorableDraft<CharacterNameDraft>(
		CHARACTER_NAME_DRAFT_FORM_ID,
		characterId,
		namePolicy(savedName),
	);
	if (stored && typeof stored.name === "string") {
		return { value: stored.name, fromDraft: true };
	}
	return { value: savedName, fromDraft: false };
}

function isPromiseLike(value: void | Promise<void>): value is Promise<void> {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof value.then === "function"
	);
}

/** O texto do servidor fica de fora: o campo mostra sempre esta frase. */
function saveErrorMessage(_error: unknown): string {
	return "Não foi possível salvar o nome. Tente de novo.";
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
	onSave: (characterName: string) => void | Promise<void>;
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
					key={character.id}
					characterId={character.id}
					savedName={savedName}
					dismissSaveRef={dismissSaveRef}
					onCommit={onSave}
					onCancel={() => {
						discardDraft();
						onOpenChange(false);
					}}
					onSaved={() => onOpenChange(false)}
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
	onSaved,
}: {
	characterId: string;
	savedName: string;
	dismissSaveRef: RefObject<DismissSave>;
	onCommit: (name: string) => void | Promise<void>;
	onCancel: () => void;
	onSaved: () => void;
}) {
	const [snapshot] = useState(() =>
		readCharacterNameDraft(characterId, savedName),
	);
	const [baselineName] = useState(savedName);
	const [draftName, setDraftName] = useState(snapshot.value);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const errorId = useId();
	const flight = useRef<Promise<void> | null>(null);
	const canSave = draftName.trim().length > 0;
	const initialValue = snapshot.value;

	function rememberDraft(name: string) {
		persistDraft(
			CHARACTER_NAME_DRAFT_FORM_ID,
			characterId,
			{ name },
			namePolicy(baselineName),
		);
	}

	function failSave(error: unknown, name: string): Promise<void> {
		rememberDraft(name);
		setSaveError(saveErrorMessage(error));
		setSaving(false);
		return Promise.reject(error);
	}

	function commit(trimmed: string): void | Promise<void> {
		if (flight.current) return flight.current;
		setSaveError(null);
		let result: void | Promise<void>;
		try {
			result = onCommit(trimmed);
		} catch (error) {
			return failSave(error, trimmed);
		}
		if (!isPromiseLike(result)) {
			clearDraft(CHARACTER_NAME_DRAFT_FORM_ID, characterId);
			return;
		}
		setSaving(true);
		const pending = Promise.resolve(result).then(
			() => {
				clearDraft(CHARACTER_NAME_DRAFT_FORM_ID, characterId);
			},
			(error: unknown) => failSave(error, trimmed),
		);
		flight.current = pending;
		void pending.then(
			() => {
				if (flight.current === pending) flight.current = null;
			},
			() => {
				if (flight.current === pending) flight.current = null;
			},
		);
		return pending;
	}

	dismissSaveRef.current.run = () => {
		const trimmed = draftName.trim();
		if (!trimmed || trimmed === baselineName.trim()) {
			clearDraft(CHARACTER_NAME_DRAFT_FORM_ID, characterId);
			return;
		}
		if (trimmed === initialValue.trim()) return;
		return commit(trimmed);
	};

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = draftName.trim();
		if (!trimmed || saving) return;
		const result = commit(trimmed);
		if (isPromiseLike(result)) {
			void Promise.resolve(result).then(
				() => onSaved(),
				() => {},
			);
			return;
		}
		onSaved();
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
					hint={
						saveError || !snapshot.fromDraft ? undefined : "Rascunho restaurado"
					}
				>
					<Input
						id={CHARACTER_NAME_INPUT_ID}
						value={draftName}
						onChange={(event) => {
							setDraftName(event.target.value);
							if (saveError) setSaveError(null);
						}}
						placeholder="Ex: Lyra Cinzal"
						autoFocus
						spellCheck={false}
						autoComplete="off"
						aria-invalid={saveError ? true : undefined}
						aria-describedby={saveError ? errorId : undefined}
						className="min-h-[44px]"
					/>
					{saveError ? (
						<p
							id={errorId}
							role="alert"
							className="text-[12px] leading-snug text-destructive"
						>
							{saveError}
						</p>
					) : null}
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
						disabled={!canSave || saving}
						className="min-h-[44px] cursor-pointer"
					>
						Salvar nome
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
