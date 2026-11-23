import { Link } from "@tanstack/react-router";
import {
	FileText,
	Loader2,
	MoreHorizontal,
	Pencil,
	Trash2,
} from "lucide-react";
import { type FormEvent, memo, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	clearDraft,
	persistDraft,
	readRestorableDraft,
} from "@/lib/form-draft";
import {
	checkTitleDraft,
	formatBytes,
	type LibraryFile,
} from "@/lib/library/library-storage";
import { cn } from "@/lib/utils";

const LIBRARY_TITLE_DRAFT_FORM_ID = "library-file-title";

function libraryTitlePolicy(title: string) {
	return {
		saved: { title },
		required: ["title"] as const,
	};
}

const dateParts = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "short",
	year: "numeric",
});

/** "18 out 2026" (sem "de" nem ponto, cabe na coluna). */
export function formatLibraryDate(iso: string): string {
	const parts = dateParts.formatToParts(new Date(iso));
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? "";
	return `${get("day")} ${get("month").replace(".", "")} ${get("year")}`;
}

interface LibraryFileRowProps {
	file: LibraryFile;
	canManage: boolean;
	onDelete: (file: LibraryFile) => void;
	/** Salva o novo nome. Se rejeitar, a linha mostra um aviso fixo. */
	onRename: (file: LibraryFile, title: string) => Promise<void>;
	/** URL assinada da capa (só quando `thumbStatus` é `ready`). */
	thumbUrl?: string;
	/** Capa pronta ainda aguardando o lote de URLs. */
	thumbLoading?: boolean;
}

type EditState =
	| { mode: "view" }
	| {
			mode: "edit";
			draft: string;
			focus: boolean;
			saving: boolean;
			error: string | null;
	  };

export const LibraryFileRow = memo(function LibraryFileRow({
	file,
	canManage,
	onDelete,
	onRename,
	thumbUrl,
	thumbLoading = false,
}: LibraryFileRowProps) {
	const [edit, setEdit] = useState<EditState>({ mode: "view" });
	const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
	const errorId = useId();
	const hintId = useId();

	function startEdit(focus: boolean) {
		const restored = readRestorableDraft<{ title: string }>(
			LIBRARY_TITLE_DRAFT_FORM_ID,
			file.id,
			libraryTitlePolicy(file.title),
		);
		setEdit({
			mode: "edit",
			draft:
				restored && typeof restored.title === "string"
					? restored.title
					: file.title,
			focus,
			saving: false,
			error: null,
		});
	}

	function cancelEdit() {
		clearDraft(LIBRARY_TITLE_DRAFT_FORM_ID, file.id);
		setEdit({ mode: "view" });
	}

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (edit.mode !== "edit" || edit.saving) return;
		const check = checkTitleDraft(edit.draft);
		const policy = libraryTitlePolicy(file.title);
		if (!check.ok) {
			persistDraft(
				LIBRARY_TITLE_DRAFT_FORM_ID,
				file.id,
				{ title: edit.draft },
				policy,
			);
			setEdit({ ...edit, error: check.error });
			return;
		}
		if (check.title === file.title) {
			cancelEdit();
			return;
		}
		setEdit({ ...edit, saving: true, error: null });
		try {
			await onRename(file, check.title);
			clearDraft(LIBRARY_TITLE_DRAFT_FORM_ID, file.id);
			setEdit({ mode: "view" });
		} catch {
			persistDraft(
				LIBRARY_TITLE_DRAFT_FORM_ID,
				file.id,
				{ title: check.title },
				policy,
			);
			setEdit({
				...edit,
				saving: false,
				error: "Não deu pra salvar o nome. Tente de novo.",
			});
		}
	}

	if (edit.mode === "edit") {
		return (
			<li className="px-3 py-3 group-data-[view=grid]/lib:px-0 sm:px-4 sm:py-2">
				<form
					onSubmit={(event) => void save(event)}
					className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3"
					aria-label={`Renomear ${file.title}`}
				>
					<FileText
						className="mt-2.5 hidden h-4 w-4 shrink-0 text-muted-foreground sm:block"
						strokeWidth={1.8}
						aria-hidden
					/>
					<div className="min-w-0 flex-1">
						<Input
							value={edit.draft}
							onChange={(event) =>
								setEdit({ ...edit, draft: event.target.value, error: null })
							}
							onKeyDown={(event) => {
								if (event.key === "Escape" && !edit.saving) {
									event.preventDefault();
									cancelEdit();
								}
							}}
							onFocus={(event) => event.currentTarget.select()}
							// Foco só quando veio do lápis (desktop); no celular o menu não abre teclado sozinho.
							autoFocus={edit.focus}
							disabled={edit.saving}
							aria-label="Novo nome do PDF"
							aria-invalid={edit.error ? true : undefined}
							aria-describedby={edit.error ? errorId : hintId}
							spellCheck={false}
							autoComplete="off"
							enterKeyHint="done"
							className="h-[44px] font-medium sm:h-9"
						/>
						{edit.error ? (
							<p
								id={errorId}
								role="alert"
								className="mt-1.5 text-[12px] leading-snug text-destructive"
							>
								{edit.error}
							</p>
						) : null}
					</div>
					<span
						id={hintId}
						className="hidden shrink-0 select-none self-center whitespace-nowrap text-[12px] text-muted-foreground lg:inline"
					>
						Enter salva · Esc cancela
					</span>
					<div className="flex shrink-0 justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={cancelEdit}
							disabled={edit.saving}
							className="h-[44px] px-4 sm:h-9"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={edit.saving}
							className="h-[44px] min-w-24 px-4 sm:h-9"
						>
							{edit.saving ? (
								<>
									<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
									Salvando…
								</>
							) : (
								"Salvar"
							)}
						</Button>
					</div>
				</form>
			</li>
		);
	}

	const size = formatBytes(file.sizeBytes);
	const date = formatLibraryDate(file.createdAt);
	const thumbStatus = file.thumbStatus ?? "pending";
	const imageFailed = brokenUrl === thumbUrl;
	const showImage = thumbStatus === "ready" && !!thumbUrl && !imageFailed;
	const showCoverSkeleton =
		thumbStatus === "ready" && !imageFailed && (thumbLoading || !thumbUrl);

	return (
		<li
			className={cn(
				"group/item relative min-w-0",
				"flex min-h-14 items-center transition-colors duration-150",
				"hover:bg-muted/40 focus-within:bg-muted/40 sm:min-h-12",
				"group-data-[view=grid]/lib:block group-data-[view=grid]/lib:min-h-0",
				"group-data-[view=grid]/lib:hover:bg-transparent group-data-[view=grid]/lib:focus-within:bg-transparent",
				"group-data-[view=grid]/lib:[content-visibility:auto] group-data-[view=grid]/lib:[contain-intrinsic-size:auto_320px]",
			)}
		>
			<Link
				to="/library/$fileId"
				params={{ fileId: file.id }}
				aria-label={`Abrir ${file.title}`}
				className={cn(
					"flex min-h-14 min-w-0 flex-1 select-none items-center gap-3 py-2 pl-4 pr-2 outline-none",
					"focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-12",
					"group-data-[view=grid]/lib:block group-data-[view=grid]/lib:min-h-0 group-data-[view=grid]/lib:gap-0",
					"group-data-[view=grid]/lib:py-0 group-data-[view=grid]/lib:pl-0 group-data-[view=grid]/lib:pr-0",
					"group-data-[view=grid]/lib:rounded-xl group-data-[view=grid]/lib:focus-visible:ring-0",
				)}
			>
				<div
					className={cn(
						"relative hidden aspect-[3/4] w-full overflow-hidden rounded-xl border border-border/70 bg-muted transition-[border-color] duration-150",
						"[@media(hover:hover)]:group-hover/item:border-primary/35",
						"group-data-[view=grid]/lib:block",
						"group-data-[view=grid]/lib:group-has-[:focus-visible]/item:ring-2 group-data-[view=grid]/lib:group-has-[:focus-visible]/item:ring-primary/60",
					)}
				>
					{showImage ? (
						<img
							src={thumbUrl}
							alt=""
							width={400}
							height={600}
							loading="lazy"
							decoding="async"
							className="absolute inset-0 size-full object-cover object-top"
							onError={() => setBrokenUrl(thumbUrl ?? null)}
						/>
					) : showCoverSkeleton ? (
						<Skeleton className="absolute inset-0 rounded-none" />
					) : (
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
							<FileText
								className="size-8 text-muted-foreground"
								strokeWidth={1.8}
								aria-hidden
							/>
							<span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
								PDF
							</span>
						</div>
					)}
				</div>
				<FileText
					className="h-4 w-4 shrink-0 text-muted-foreground group-data-[view=grid]/lib:hidden"
					strokeWidth={1.8}
					aria-hidden
				/>
				<div className="min-w-0 flex-1 group-data-[view=grid]/lib:hidden">
					<p className="truncate text-[13px] font-medium text-foreground">
						{file.title}
					</p>
					<p className="text-[12px] tabular-nums text-muted-foreground sm:hidden">
						{size} · {date}
					</p>
				</div>
				<span className="hidden w-20 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground sm:block group-data-[view=grid]/lib:hidden">
					{size}
				</span>
				<span className="hidden w-28 shrink-0 pl-5 text-[12px] tabular-nums text-muted-foreground sm:block group-data-[view=grid]/lib:hidden">
					{date}
				</span>
				<p className="mt-2 hidden line-clamp-2 break-words text-[13px] font-medium leading-snug text-foreground [overflow-wrap:anywhere] group-data-[view=grid]/lib:block">
					{file.title}
				</p>
				<p className="mt-0.5 hidden text-[11px] tabular-nums text-muted-foreground group-data-[view=grid]/lib:block">
					{size} · {date}
				</p>
			</Link>
			{canManage ? (
				<>
					{/* Desktop (lista): ações aparecem no hover/foco da linha. */}
					<div className="hidden w-20 shrink-0 justify-end gap-1 pr-2 opacity-0 transition-opacity duration-150 group-hover/item:opacity-100 group-focus-within/item:opacity-100 sm:flex group-data-[view=grid]/lib:hidden">
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-foreground"
							aria-label={`Renomear ${file.title}`}
							title="Renomear"
							onClick={() => startEdit(true)}
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-destructive"
							aria-label={`Apagar ${file.title}`}
							title="Apagar"
							onClick={() => onDelete(file)}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
					{/* Celular (lista): menu … de 44×44 px. */}
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label={`Ações de ${file.title}`}
							className="mr-1 flex size-[44px] shrink-0 select-none items-center justify-center rounded-xl text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:hidden group-data-[view=grid]/lib:hidden"
						>
							<MoreHorizontal className="h-[18px] w-[18px]" />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							finalFocus={false}
							className="w-44"
						>
							<FileActions
								onRename={() => startEdit(false)}
								onDelete={() => onDelete(file)}
							/>
						</DropdownMenuContent>
					</DropdownMenu>
					{/* Grade: … no canto da capa (44px no toque; no desktop some até o hover/foco). */}
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label={`Ações de ${file.title}`}
							className="absolute right-1 top-1 hidden size-11 select-none items-center justify-center sm:size-9 group-data-[view=grid]/lib:inline-flex sm:opacity-0 sm:group-hover/item:opacity-100 sm:group-focus-within/item:opacity-100"
						>
							<span className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/90 text-muted-foreground">
								<MoreHorizontal className="h-4 w-4" />
							</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							finalFocus={false}
							className="w-44"
						>
							<FileActions
								onRename={() => startEdit(false)}
								onDelete={() => onDelete(file)}
							/>
						</DropdownMenuContent>
					</DropdownMenu>
				</>
			) : null}
		</li>
	);
});

function FileActions({
	onRename,
	onDelete,
}: {
	onRename: () => void;
	onDelete: () => void;
}) {
	return (
		<>
			<DropdownMenuItem className="min-h-[44px]" onClick={onRename}>
				<Pencil />
				Renomear
			</DropdownMenuItem>
			<DropdownMenuItem
				variant="destructive"
				className="min-h-[44px]"
				onClick={onDelete}
			>
				<Trash2 />
				Apagar
			</DropdownMenuItem>
		</>
	);
}
