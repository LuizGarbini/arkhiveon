import {
	Check,
	ChevronLeft,
	Lock,
	NotebookPen,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	filterNotes,
	NOTE_BODY_MAX,
	NOTE_TITLE_MAX,
	noteSnippet,
	noteTitle,
	relativeTime,
	sortNotes,
	type VttNote,
} from "@/lib/vtt/notes";
import { type NoteSaveState, useNotesStore } from "@/lib/vtt/notes-store";
import {
	createNote,
	editNote,
	flushAllNotes,
	flushNote,
	loadNotes,
	removeNoteById,
} from "@/lib/vtt/notes-sync";
import { useVTTStore } from "@/lib/vtt/vtt-store";

/** Fecha a aba ou o navegador vai para o fundo: grava o que estiver pendente. */
function useFlushOnHide() {
	useEffect(() => {
		const flush = () => void flushAllNotes();
		const onVisibility = () => {
			if (document.visibilityState === "hidden") flush();
		};
		window.addEventListener("pagehide", flush);
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			window.removeEventListener("pagehide", flush);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, []);
}

const MISSING_TEXT =
	"As notas chegam quando a atualização do banco for aplicada.";

function SaveIndicator({
	state,
	onRetry,
}: {
	state: NoteSaveState | undefined;
	onRetry: () => void;
}) {
	if (state === "error") {
		return (
			<span className="flex items-center gap-2 text-xs text-destructive">
				Não salvou
				<button
					type="button"
					onClick={onRetry}
					className="min-h-11 cursor-pointer rounded-lg px-1.5 font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
				>
					Tentar de novo
				</button>
			</span>
		);
	}
	if (state === "saving" || state === "dirty") {
		return (
			<output className="text-xs text-muted-foreground" aria-live="polite">
				Salvando…
			</output>
		);
	}
	return (
		<output
			className="flex items-center gap-1 text-xs text-muted-foreground"
			aria-live="polite"
		>
			<Check className="size-3.5" aria-hidden />
			Salvo
		</output>
	);
}

function NoteEditor({ note }: { note: VttNote }) {
	const saveState = useNotesStore((s) => s.saveState[note.id]);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const back = () => {
		void flushNote(note.id);
		useNotesStore.getState().openNote(null);
	};
	const nearLimit = note.body.length > NOTE_BODY_MAX * 0.9;
	return (
		<form
			className="flex min-h-0 flex-1 flex-col gap-2.5"
			onSubmit={(event) => event.preventDefault()}
		>
			<div className="flex shrink-0 items-center gap-1">
				<button
					type="button"
					onClick={back}
					aria-label="Voltar às notas"
					className="flex min-h-11 cursor-pointer items-center gap-1 rounded-xl pr-2 pl-1 text-[13px] font-medium text-muted-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:text-foreground"
				>
					<ChevronLeft className="size-4" aria-hidden />
					Notas
				</button>
				<span className="flex-1" />
				<SaveIndicator
					state={saveState}
					onRetry={() => void flushNote(note.id)}
				/>
			</div>
			<Input
				value={note.title}
				onChange={(event) => editNote(note.id, { title: event.target.value })}
				onBlur={() => void flushNote(note.id)}
				maxLength={NOTE_TITLE_MAX}
				placeholder="Título"
				aria-label="Título da nota"
				autoComplete="off"
				spellCheck={false}
				className="h-11 font-display text-base font-semibold"
			/>
			<Textarea
				value={note.body}
				onChange={(event) => editNote(note.id, { body: event.target.value })}
				onBlur={() => void flushNote(note.id)}
				maxLength={NOTE_BODY_MAX}
				placeholder="Escreva aqui. Só você vê esta nota."
				aria-label="Texto da nota"
				className="min-h-40 flex-1 resize-none select-text leading-relaxed"
			/>
			<div className="flex shrink-0 items-center justify-between gap-2">
				<span
					className={cn(
						"text-[11px] tabular-nums text-muted-foreground",
						!nearLimit && "invisible",
					)}
				>
					{note.body.length}/{NOTE_BODY_MAX}
				</span>
				{confirmDelete ? (
					<div className="flex items-center gap-1.5">
						<Button
							type="button"
							variant="ghost"
							className="min-h-11"
							onClick={() => setConfirmDelete(false)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="destructive"
							className="min-h-11 gap-2"
							onClick={() => void removeNoteById(note.id)}
						>
							<Trash2 className="size-4" aria-hidden />
							Apagar de vez
						</Button>
					</div>
				) : (
					<Button
						type="button"
						variant="ghost"
						className="min-h-11 gap-2 text-muted-foreground"
						onClick={() => setConfirmDelete(true)}
					>
						<Trash2 className="size-4" aria-hidden />
						Apagar nota
					</Button>
				)}
			</div>
		</form>
	);
}

function NoteRow({ note, onOpen }: { note: VttNote; onOpen: () => void }) {
	const snippet = noteSnippet(note);
	return (
		<li>
			<button
				type="button"
				onClick={onOpen}
				className="flex min-h-14 w-full cursor-pointer flex-col gap-0.5 rounded-xl border border-transparent px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:border-border/70 [@media(hover:hover)]:hover:bg-muted/40"
			>
				<span className="flex items-baseline justify-between gap-2">
					<span className="truncate text-[13.5px] font-semibold">
						{noteTitle(note)}
					</span>
					<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
						{relativeTime(note.updatedAt)}
					</span>
				</span>
				{snippet ? (
					<span className="line-clamp-2 text-xs text-muted-foreground">
						{snippet}
					</span>
				) : null}
			</button>
		</li>
	);
}

function NotesList({ isGM }: { isGM: boolean }) {
	const searchId = useId();
	const notes = useNotesStore((s) => s.notes);
	const status = useNotesStore((s) => s.status);
	const query = useNotesStore((s) => s.query);
	const notice = useNotesStore((s) => s.notice);
	const campaignId = useNotesStore((s) => s.campaignId);
	const shown = useMemo(
		() => sortNotes(filterNotes(notes, query)),
		[notes, query],
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2.5">
			<div className="flex shrink-0 items-center gap-2">
				<div className="relative min-w-0 flex-1">
					<label htmlFor={searchId} className="sr-only">
						Buscar nas notas
					</label>
					<Search
						aria-hidden
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						id={searchId}
						type="search"
						value={query}
						onChange={(event) =>
							useNotesStore.getState().setQuery(event.target.value)
						}
						placeholder="Buscar…"
						autoComplete="off"
						spellCheck={false}
						className="h-11 pl-9"
					/>
				</div>
				<Button
					type="button"
					aria-label="Nova nota"
					className="size-11 shrink-0 p-0"
					disabled={status !== "ready"}
					onClick={() => void createNote()}
				>
					<Plus className="size-4" aria-hidden />
				</Button>
			</div>

			{notice ? (
				<p
					role="alert"
					className="shrink-0 rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive"
				>
					{notice}
				</p>
			) : null}

			<div className="min-h-0 flex-1 overflow-y-auto">
				{status === "loading" || status === "idle" ? (
					<div className="space-y-2" aria-busy>
						<span className="sr-only">Carregando notas…</span>
						<Skeleton className="h-14 w-full rounded-xl" />
						<Skeleton className="h-14 w-full rounded-xl" />
						<Skeleton className="h-14 w-full rounded-xl" />
					</div>
				) : status === "missing" ? (
					<p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
						{MISSING_TEXT}
					</p>
				) : status === "error" ? (
					<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 p-5 text-center">
						<p className="text-xs text-muted-foreground">
							Não deu para carregar as notas.
						</p>
						<Button
							type="button"
							variant="outline"
							className="min-h-11"
							onClick={() => campaignId && void loadNotes(campaignId)}
						>
							Tentar de novo
						</Button>
					</div>
				) : notes.length === 0 ? (
					<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center">
						<NotebookPen className="size-6 text-primary" aria-hidden />
						<div>
							<p className="text-sm font-semibold">Nenhuma nota ainda</p>
							<p className="mx-auto mt-1 max-w-[15rem] text-xs text-muted-foreground">
								{isGM
									? "Guarde aqui segredos, planos da sessão e lembretes."
									: "Anote o que importa: pistas, nomes e planos."}
							</p>
						</div>
						<Button
							type="button"
							className="min-h-11 gap-2"
							onClick={() => void createNote()}
						>
							<Plus className="size-4" aria-hidden />
							Criar a primeira nota
						</Button>
					</div>
				) : shown.length === 0 ? (
					<div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border/70 px-5 py-6 text-center">
						<p className="text-sm font-semibold">Nenhuma nota encontrada</p>
						<Button
							type="button"
							variant="outline"
							className="min-h-11"
							onClick={() => useNotesStore.getState().setQuery("")}
						>
							Limpar busca
						</Button>
					</div>
				) : (
					<ul className="space-y-0.5">
						{shown.map((note) => (
							<NoteRow
								key={note.id}
								note={note}
								onOpen={() => useNotesStore.getState().openNote(note.id)}
							/>
						))}
					</ul>
				)}
			</div>

			<p className="flex shrink-0 items-center gap-1.5 border-t border-border/60 pt-2 text-[11.5px] text-muted-foreground">
				<Lock className="size-3 shrink-0" aria-hidden />
				{isGM
					? "Só você vê estas notas. Os jogadores não têm acesso."
					: "Só você vê estas notas. Nem o mestre lê."}
			</p>
		</div>
	);
}

function NotesContent({ isGM }: { isGM: boolean }) {
	const active = useNotesStore((s) =>
		s.activeId ? (s.notes.find((n) => n.id === s.activeId) ?? null) : null,
	);
	return active ? <NoteEditor note={active} /> : <NotesList isGM={isGM} />;
}

/**
 * Notas privadas da mesa: o mestre usa para os segredos e o preparo da
 * sessão, o jogador para as próprias anotações. Cada um lê só as suas.
 */
export function VTTNotesPanel() {
	useFlushOnHide();
	const open = useNotesStore((s) => s.panelOpen);
	const isGM = useVTTStore((s) => s.isGM);
	const isMobile = useIsMobile();
	if (!open) return null;

	const title = isGM ? "Notas do mestre" : "Minhas notas";
	const close = () => {
		void flushAllNotes();
		useNotesStore.getState().setPanelOpen(false);
	};

	if (isMobile) {
		return (
			<BottomSheet
				open
				modal={false}
				onOpenChange={(next) => {
					if (!next) close();
				}}
				title={title}
				aria-label={title}
			>
				<div
					data-testid="notes-panel"
					className="flex h-[60dvh] min-h-0 flex-col"
				>
					<NotesContent isGM={isGM} />
				</div>
			</BottomSheet>
		);
	}

	return (
		<aside
			aria-label={title}
			data-testid="notes-panel"
			className="pointer-events-auto absolute top-32 right-3 bottom-20 z-30 flex min-h-0 w-80 flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-200"
		>
			<div className="flex shrink-0 items-center gap-2 border-b border-border/60 pb-2">
				<h2 className="flex min-w-0 flex-1 items-center gap-2 pl-1 font-display text-base font-semibold text-foreground">
					<NotebookPen className="size-4 text-primary" aria-hidden />
					{title}
				</h2>
				<button
					type="button"
					aria-label="Fechar notas"
					onClick={close}
					className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
				>
					<X className="size-4" />
				</button>
			</div>
			<NotesContent isGM={isGM} />
		</aside>
	);
}
