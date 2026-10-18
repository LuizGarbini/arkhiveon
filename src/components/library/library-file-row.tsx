import { Link } from "@tanstack/react-router";
import {
	FileText,
	Loader2,
	MoreHorizontal,
	Pencil,
	Trash2,
} from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	checkTitleDraft,
	formatBytes,
	type LibraryFile,
} from "@/lib/library/library-storage";

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
	/** Salva o novo nome; rejeita com a mensagem de erro pra mostrar na linha. */
	onRename: (file: LibraryFile, title: string) => Promise<void>;
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

export function LibraryFileRow({
	file,
	canManage,
	onDelete,
	onRename,
}: LibraryFileRowProps) {
	const [edit, setEdit] = useState<EditState>({ mode: "view" });
	const errorId = useId();
	const hintId = useId();

	function startEdit(focus: boolean) {
		setEdit({
			mode: "edit",
			draft: file.title,
			focus,
			saving: false,
			error: null,
		});
	}

	function cancelEdit() {
		setEdit({ mode: "view" });
	}

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (edit.mode !== "edit" || edit.saving) return;
		const check = checkTitleDraft(edit.draft);
		if (!check.ok) {
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
			setEdit({ mode: "view" });
		} catch (error) {
			setEdit({
				...edit,
				saving: false,
				error:
					error instanceof Error && error.message
						? error.message
						: "Não deu pra salvar o nome. Tente de novo.",
			});
		}
	}

	if (edit.mode === "edit") {
		return (
			<li className="px-3 py-3 sm:px-4 sm:py-2">
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

	return (
		<li className="group flex min-h-14 items-center transition-colors duration-150 hover:bg-muted/40 focus-within:bg-muted/40 sm:min-h-12">
			<Link
				to="/library/$fileId"
				params={{ fileId: file.id }}
				aria-label={`Abrir ${file.title}`}
				className="flex min-h-14 min-w-0 flex-1 select-none items-center gap-3 py-2 pl-4 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-12"
			>
				<FileText
					className="h-4 w-4 shrink-0 text-muted-foreground"
					strokeWidth={1.8}
					aria-hidden
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[13px] font-medium text-foreground">
						{file.title}
					</p>
					<p className="text-[12px] tabular-nums text-muted-foreground sm:hidden">
						{size} · {date}
					</p>
				</div>
				<span className="hidden w-20 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground sm:block">
					{size}
				</span>
				<span className="hidden w-28 shrink-0 pl-5 text-[12px] tabular-nums text-muted-foreground sm:block">
					{date}
				</span>
			</Link>
			{canManage ? (
				<>
					{/* Desktop: ações aparecem no hover/foco da linha. */}
					<div className="hidden w-20 shrink-0 justify-end gap-1 pr-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:flex">
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
					{/* Celular: menu … de 44×44 px (rem aqui = 14,5 px, por isso o valor fixo). */}
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label={`Ações de ${file.title}`}
							className="mr-1 flex size-[44px] shrink-0 select-none items-center justify-center rounded-xl text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
						>
							<MoreHorizontal className="h-[18px] w-[18px]" />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							finalFocus={false}
							className="w-44"
						>
							<DropdownMenuItem
								className="min-h-[44px]"
								onClick={() => startEdit(false)}
							>
								<Pencil />
								Renomear
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								className="min-h-[44px]"
								onClick={() => onDelete(file)}
							>
								<Trash2 />
								Apagar
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</>
			) : null}
		</li>
	);
}
