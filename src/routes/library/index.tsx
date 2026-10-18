import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LibraryBig, RotateCcw, Search, UploadCloud } from "lucide-react";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { EmptyState } from "@/components/empty-state";
import { LibraryFileRow } from "@/components/library/library-file-row";
import { UploadQueueList } from "@/components/library/upload-queue-list";
import { UploadReviewDialog } from "@/components/library/upload-review-dialog";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { filterByTitle, libraryCountLabel } from "@/lib/library/library-search";
import {
	canManageLibraryRole,
	checkPdfFile,
	deleteLibraryFile,
	type LibraryFile,
	listLibraryFiles,
	renameLibraryFile,
	uploadLibraryPdf,
} from "@/lib/library/library-storage";
import {
	classifyUploads,
	needsUploadReview,
	type UploadReview,
} from "@/lib/library/upload-dedupe";
import {
	clearFinished,
	enqueueFiles,
	hasActiveUploads,
	markDone,
	markError,
	markUploading,
	nextToStart,
	retryItem,
	setProgress,
	splitPdfCandidates,
	type UploadItem,
} from "@/lib/library/upload-queue";
import { useLibraryPilot } from "@/lib/library/use-library-pilot";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library/")({
	component: LibraryRoute,
});

function LibraryRoute() {
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const pilot = useLibraryPilot(activeCampaignId);
	// Fora do piloto: volta pra home da campanha sem mensagem.
	if (pilot === false) return <Navigate to="/dashboard" replace />;
	if (pilot === null || !activeCampaignId) return <LibrarySkeleton />;
	return <LibraryPage campaignId={activeCampaignId} />;
}

function LibrarySkeleton() {
	return (
		<div className="px-6 pt-5 sm:px-8 sm:pt-8">
			<div className="mx-auto w-full max-w-7xl space-y-5">
				<Skeleton className="h-24 w-full rounded-2xl" />
				<LibraryListSkeleton />
			</div>
		</div>
	);
}

const skeletonRows = [
	{ key: "s1", width: "58%" },
	{ key: "s2", width: "42%" },
	{ key: "s3", width: "66%" },
	{ key: "s4", width: "35%" },
	{ key: "s5", width: "50%" },
];

/** Mesma altura e colunas das linhas de verdade (sem pulo ao carregar). */
function LibraryListSkeleton() {
	return (
		<div
			className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card"
			aria-busy="true"
		>
			{skeletonRows.map((row) => (
				<div
					key={row.key}
					className="flex min-h-14 items-center gap-3 py-2 pl-4 pr-4 sm:min-h-12"
				>
					<Skeleton className="h-4 w-4 shrink-0 rounded" />
					<div className="min-w-0 flex-1 space-y-1.5">
						<Skeleton className="h-3.5 rounded" style={{ width: row.width }} />
						<Skeleton className="h-3 w-28 rounded sm:hidden" />
					</div>
					<Skeleton className="hidden h-3 w-14 rounded sm:block" />
					<Skeleton className="hidden h-3 w-20 rounded sm:ml-5 sm:mr-20 sm:block" />
				</div>
			))}
		</div>
	);
}

type LoadState =
	| { status: "loading" }
	| { status: "error" }
	| { status: "ready"; files: LibraryFile[] };

function LibraryPage({ campaignId }: { campaignId: string }) {
	const toast = useToast();
	const role = useRPGStore(
		(s) => s.campaigns.find((c) => c.id === campaignId)?.myRole,
	);
	const canManage = canManageLibraryRole(role);
	const [state, setState] = useState<LoadState>({ status: "loading" });
	const [uploads, setUploadsState] = useState<UploadItem[]>([]);
	// Espelho síncrono da fila: os envios terminam fora do render.
	const uploadsRef = useRef<UploadItem[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [toDelete, setToDelete] = useState<LibraryFile | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [review, setReview] = useState<UploadReview<File> | null>(null);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const inputRef = useRef<HTMLInputElement>(null);

	const load = useCallback(async () => {
		setState({ status: "loading" });
		try {
			setState({ status: "ready", files: await listLibraryFiles(campaignId) });
		} catch {
			setState({ status: "error" });
		}
	}, [campaignId]);

	useEffect(() => {
		void load();
	}, [load]);

	/** Atualiza a lista sem voltar pro skeleton (depois de cada envio). */
	async function refreshQuietly() {
		try {
			setState({ status: "ready", files: await listLibraryFiles(campaignId) });
		} catch {
			// Mantém a lista atual; o próximo carregamento tenta de novo.
		}
	}

	function updateUploads(next: (items: UploadItem[]) => UploadItem[]) {
		uploadsRef.current = next(uploadsRef.current);
		setUploadsState(uploadsRef.current);
	}

	async function runUpload(id: string) {
		const item = uploadsRef.current.find((x) => x.id === id);
		if (!item) return;
		updateUploads((items) => markUploading(items, id));
		try {
			const check = await checkPdfFile(item.file);
			if (!check.ok) throw new Error(check.error);
			await uploadLibraryPdf(campaignId, item.file, check.title, (progress) =>
				updateUploads((items) => setProgress(items, id, progress)),
			);
			updateUploads((items) => markDone(items, id));
			void refreshQuietly();
		} catch (error) {
			updateUploads((items) =>
				markError(
					items,
					id,
					error instanceof Error && error.message
						? error.message
						: "Não deu pra enviar. Tente de novo.",
				),
			);
		} finally {
			pumpUploads();
		}
	}

	/** Começa os próximos da fila (no máximo 2 ao mesmo tempo). */
	function pumpUploads() {
		for (const id of nextToStart(uploadsRef.current)) void runUpload(id);
	}

	function handleFiles(list: FileList | null | undefined) {
		// Copia antes de limpar o input: o FileList esvazia junto.
		const picked = list ? Array.from(list) : [];
		if (inputRef.current) inputRef.current.value = "";
		if (picked.length === 0 || !canManage || !isReady) return;
		const { pdfs, ignored } = splitPdfCandidates(picked);
		if (ignored.length > 0) {
			toast.error({
				title:
					ignored.length === 1
						? "1 arquivo ignorado: só dá pra enviar PDF"
						: `${ignored.length} arquivos ignorados: só dá pra enviar PDF`,
				description: ignored.map((file) => file.name).join(", "),
			});
		}
		if (pdfs.length === 0) return;
		const existing = state.status === "ready" ? state.files : [];
		const next = classifyUploads(pdfs, existing);
		// Sem repetido nem grande demais: segue direto, como antes.
		if (!needsUploadReview(next)) {
			startUploads(next.fresh);
			return;
		}
		setReview(next);
	}

	function startUploads(picked: readonly File[]) {
		if (picked.length === 0) return;
		updateUploads((items) =>
			enqueueFiles(items, picked, () => crypto.randomUUID()),
		);
		pumpUploads();
	}

	function retryUpload(id: string) {
		updateUploads((items) => retryItem(items, id));
		pumpUploads();
	}

	async function confirmDelete() {
		if (!toDelete) return;
		setIsDeleting(true);
		try {
			await deleteLibraryFile(toDelete.id);
			toast.success({ title: "PDF apagado", description: toDelete.title });
			setToDelete(null);
			await load();
		} catch (error) {
			toast.error({
				title: "Não deu pra apagar",
				description: error instanceof Error ? error.message : undefined,
			});
		} finally {
			setIsDeleting(false);
		}
	}

	/** Salva o nome e troca só aquela linha (sem recarregar a lista). */
	async function renameFile(file: LibraryFile, title: string) {
		const saved = await renameLibraryFile(file.id, title);
		setState((prev) =>
			prev.status === "ready"
				? {
						status: "ready",
						files: prev.files.map((item) =>
							item.id === file.id ? { ...item, title: saved } : item,
						),
					}
				: prev,
		);
	}

	const isReady = state.status === "ready";
	const openPicker = () => inputRef.current?.click();
	const showClear =
		uploads.some((item) => item.status === "done") &&
		!hasActiveUploads(uploads);
	const files = useMemo(
		() => (state.status === "ready" ? state.files : []),
		[state],
	);
	const visibleFiles = useMemo(
		() => filterByTitle(files, deferredQuery),
		[files, deferredQuery],
	);
	const count =
		state.status === "ready"
			? libraryCountLabel(visibleFiles.length, files.length, deferredQuery)
			: undefined;
	const showSearch = !(state.status === "ready" && files.length === 0);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: área de soltar arquivo; o botão Enviar PDF é o caminho acessível.
		<div
			className="relative w-full"
			onDragOver={(event) => {
				if (
					!canManage ||
					!isReady ||
					!event.dataTransfer.types.includes("Files")
				)
					return;
				event.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={(event) => {
				if (event.currentTarget.contains(event.relatedTarget as Node)) return;
				setIsDragging(false);
			}}
			onDrop={(event) => {
				if (!canManage) return;
				event.preventDefault();
				setIsDragging(false);
				handleFiles(event.dataTransfer.files);
			}}
		>
			{/* Desktop/tablet: cabeçalho padrão das coleções. */}
			<div className="hidden sm:block">
				<PageHeader
					eyebrow="Mundo"
					title="Biblioteca"
					description="PDFs da campanha: livros, mapas e fichas para toda a mesa."
					Icon={LibraryBig}
					iconColor="text-primary"
					count={count}
					action={
						canManage ? (
							<Button
								onClick={openPicker}
								disabled={!isReady}
								className="min-h-11 active:scale-[0.98]"
							>
								<UploadCloud className="mr-2 h-4 w-4" />
								Enviar PDF
							</Button>
						) : null
					}
				/>
			</div>
			{/* Celular: cabeçalho compacto (título + enviar), sem o card grande. */}
			<header className="flex items-center justify-between gap-3 px-6 pb-4 pt-5 sm:hidden">
				<div className="flex min-w-0 items-center gap-2.5">
					<h1 className="font-display truncate text-2xl font-bold tracking-tight text-foreground">
						Biblioteca
					</h1>
					{count !== undefined ? (
						<span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold tabular-nums text-primary">
							{count}
						</span>
					) : null}
				</div>
				{canManage ? (
					<Button
						size="icon"
						onClick={openPicker}
						disabled={!isReady}
						aria-label="Enviar PDF"
						title="Enviar PDF"
						className="size-11 shrink-0 active:scale-[0.98]"
					>
						<UploadCloud className="h-5 w-5" />
					</Button>
				) : null}
			</header>
			<input
				ref={inputRef}
				type="file"
				accept="application/pdf,.pdf"
				multiple
				className="hidden"
				onChange={(event) => handleFiles(event.target.files)}
			/>

			<div className="px-6 pb-10 sm:px-8">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
					{uploads.length > 0 ? (
						<UploadQueueList
							items={uploads}
							onRetry={retryUpload}
							onClearFinished={
								showClear
									? () => updateUploads((items) => clearFinished(items))
									: undefined
							}
						/>
					) : null}

					{showSearch ? (
						<ListLayout
							searchValue={query}
							onSearch={setQuery}
							searchPlaceholder="Buscar PDF pelo nome…"
							hideFilters
						/>
					) : null}

					{state.status === "loading" ? (
						<LibraryListSkeleton />
					) : state.status === "error" ? (
						<div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card px-6 py-8 text-center">
							<p className="text-[13px] font-semibold text-foreground">
								Não deu pra carregar a Biblioteca.
							</p>
							<p className="-mt-1 text-[12px] text-muted-foreground">
								Confira a conexão e tente de novo.
							</p>
							<Button
								variant="outline"
								className="min-h-[44px] sm:min-h-9"
								onClick={() => void load()}
							>
								<RotateCcw className="mr-2 h-4 w-4" />
								Tentar de novo
							</Button>
						</div>
					) : files.length === 0 ? (
						<EmptyState
							Icon={LibraryBig}
							title="Nenhum PDF ainda"
							description={
								canManage
									? "Envie livros, mapas ou fichas em PDF (até 200 MB). Dá pra arrastar vários de uma vez pra cá."
									: "Quando o mestre enviar PDFs, eles aparecem aqui."
							}
							actionLabel={canManage ? "Enviar primeiro PDF" : undefined}
							onAction={canManage ? openPicker : undefined}
						/>
					) : visibleFiles.length === 0 ? (
						<EmptyState
							Icon={Search}
							title={`Nenhum PDF com "${deferredQuery.trim()}"`}
							description={`Confira a grafia ou limpe a busca para ver os ${files.length} PDFs.`}
							actionLabel="Limpar busca"
							onAction={() => setQuery("")}
						/>
					) : (
						<ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
							{visibleFiles.map((file) => (
								<LibraryFileRow
									key={file.id}
									file={file}
									canManage={canManage}
									onDelete={setToDelete}
									onRename={renameFile}
								/>
							))}
						</ul>
					)}
				</div>
			</div>

			<div
				className={cn(
					"pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl border-2 border-dashed border-primary/60 bg-background/90 transition-opacity duration-150",
					isDragging ? "opacity-100" : "opacity-0",
				)}
				aria-hidden={!isDragging}
			>
				<div className="flex flex-col items-center gap-2 text-primary">
					<UploadCloud className="h-8 w-8" />
					<span className="text-[13px] font-semibold">Solte os PDFs aqui</span>
				</div>
			</div>

			<UploadReviewDialog
				review={review}
				onCancel={() => setReview(null)}
				onConfirm={(picked) => {
					setReview(null);
					startUploads(picked);
				}}
			/>

			<Dialog
				open={!!toDelete}
				onOpenChange={(open) => !open && !isDeleting && setToDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Apagar PDF?</DialogTitle>
						<DialogDescription>
							"{toDelete?.title}" some da Biblioteca pra toda a mesa. Não dá pra
							desfazer.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setToDelete(null)}
							disabled={isDeleting}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => void confirmDelete()}
							disabled={isDeleting}
						>
							{isDeleting ? "Apagando…" : "Apagar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
