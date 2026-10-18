import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LibraryBig, RotateCcw, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LibraryFileRow } from "@/components/library/library-file-row";
import { UploadQueueList } from "@/components/library/upload-queue-list";
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
import {
	canManageLibraryRole,
	checkPdfFile,
	deleteLibraryFile,
	type LibraryFile,
	listLibraryFiles,
	uploadLibraryPdf,
} from "@/lib/library/library-storage";
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
		<div className="space-y-3" aria-busy="true">
			<Skeleton className="h-24 w-full rounded-2xl" />
			<Skeleton className="h-14 w-full rounded-2xl" />
			<Skeleton className="h-14 w-full rounded-2xl" />
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
		updateUploads((items) =>
			enqueueFiles(items, pdfs, () => crypto.randomUUID()),
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

	const isReady = state.status === "ready";
	const openPicker = () => inputRef.current?.click();
	const showClear =
		uploads.some((item) => item.status === "done") &&
		!hasActiveUploads(uploads);
	const files = state.status === "ready" ? state.files : [];
	const count = state.status === "ready" ? files.length : undefined;

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
					{typeof count === "number" ? (
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

					{state.status === "loading" ? (
						<div className="space-y-3" aria-busy="true">
							<Skeleton className="h-14 w-full rounded-2xl" />
							<Skeleton className="h-14 w-full rounded-2xl" />
							<Skeleton className="h-14 w-full rounded-2xl" />
						</div>
					) : state.status === "error" ? (
						<div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-center">
							<p className="text-[13px] font-semibold text-foreground">
								Não deu pra carregar a Biblioteca.
							</p>
							<Button variant="outline" onClick={() => void load()}>
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
									? "Envie livros, mapas ou fichas em PDF (até 50 MB). Dá pra arrastar vários de uma vez pra cá."
									: "Quando o mestre enviar PDFs, eles aparecem aqui."
							}
							actionLabel={canManage ? "Enviar primeiro PDF" : undefined}
							onAction={canManage ? openPicker : undefined}
						/>
					) : (
						<ul className="space-y-2">
							{files.map((file) => (
								<LibraryFileRow
									key={file.id}
									file={file}
									canManage={canManage}
									onDelete={setToDelete}
								/>
							))}
						</ul>
					)}
				</div>
			</div>

			<div
				className={cn(
					"pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl border-2 border-dashed border-primary/60 bg-background/80 backdrop-blur-md transition-opacity duration-150",
					isDragging ? "opacity-100" : "opacity-0",
				)}
				aria-hidden={!isDragging}
			>
				<div className="flex flex-col items-center gap-2 text-primary">
					<UploadCloud className="h-8 w-8" />
					<span className="text-[13px] font-semibold">Solte os PDFs aqui</span>
				</div>
			</div>

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
