import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LibraryBig, RotateCcw, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LibraryFileRow } from "@/components/library/library-file-row";
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
	const [upload, setUpload] = useState<{
		name: string;
		progress: number;
	} | null>(null);
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

	async function handleFile(file: File | undefined) {
		if (!file || upload || !canManage) return;
		const check = await checkPdfFile(file);
		if (!check.ok) {
			toast.error({ title: "Não deu pra enviar", description: check.error });
			return;
		}
		setUpload({ name: check.title, progress: 0 });
		try {
			await uploadLibraryPdf(campaignId, file, check.title, (progress) =>
				setUpload({ name: check.title, progress }),
			);
			toast.success({ title: "PDF enviado", description: check.title });
			await load();
		} catch (error) {
			toast.error({
				title: "Não deu pra enviar",
				description: error instanceof Error ? error.message : undefined,
			});
		} finally {
			setUpload(null);
			if (inputRef.current) inputRef.current.value = "";
		}
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

	const openPicker = () => inputRef.current?.click();
	const files = state.status === "ready" ? state.files : [];

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: área de soltar arquivo; o botão Enviar PDF é o caminho acessível.
		<div
			className="relative w-full"
			onDragOver={(event) => {
				if (!canManage || !event.dataTransfer.types.includes("Files")) return;
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
				void handleFile(event.dataTransfer.files[0]);
			}}
		>
			<PageHeader
				eyebrow="Mundo"
				title="Biblioteca"
				description="PDFs da campanha: livros, mapas e fichas para toda a mesa."
				Icon={LibraryBig}
				iconColor="text-primary"
				count={state.status === "ready" ? files.length : undefined}
				action={
					canManage ? (
						<Button
							onClick={openPicker}
							disabled={!!upload}
							className="min-h-11 active:scale-[0.98]"
						>
							<UploadCloud className="mr-2 h-4 w-4" />
							Enviar PDF
						</Button>
					) : null
				}
			/>
			<input
				ref={inputRef}
				type="file"
				accept="application/pdf,.pdf"
				className="hidden"
				onChange={(event) => void handleFile(event.target.files?.[0])}
			/>

			<div className="px-6 pb-10 sm:px-8">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
					{upload ? (
						<div
							className="rounded-2xl border border-primary/30 bg-primary/8 p-4"
							aria-live="polite"
						>
							<div className="flex items-center justify-between gap-3 text-[12px]">
								<span className="truncate font-semibold text-foreground">
									Enviando {upload.name}
								</span>
								<span className="tabular-nums text-muted-foreground">
									{Math.round(upload.progress * 100)}%
								</span>
							</div>
							<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-[width] duration-200"
									style={{ width: `${Math.round(upload.progress * 100)}%` }}
								/>
							</div>
						</div>
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
									? "Envie livros, mapas ou fichas em PDF (até 50 MB). Dá pra arrastar o arquivo pra cá."
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
					<span className="text-[13px] font-semibold">Solte o PDF aqui</span>
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
