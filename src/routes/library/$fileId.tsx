import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, RotateCcw } from "lucide-react";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { FontSizeControl } from "@/components/library/font-size-control";
import type { PdfViewerHandle } from "@/components/library/pdf-viewer";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
	type FormValues,
	loadFormValues,
	type SaveStatus,
	saveFormValues,
	saveStatusLabel,
} from "@/lib/library/library-forms";
import {
	downloadLibraryPdf,
	getLibraryFile,
	type LibraryFile,
} from "@/lib/library/library-storage";
import {
	type FontSizes,
	mergeStoredValues,
	type PreparedPdf,
	preparePdfWithFontSizes,
	splitStoredValues,
} from "@/lib/library/pdf-font-sizes";
import { useLibraryPilot } from "@/lib/library/use-library-pilot";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// EmbedPDF + pdfium.wasm só baixam quando alguém abre um PDF.
const PdfViewer = lazy(() => import("@/components/library/pdf-viewer"));

export const Route = createFileRoute("/library/$fileId")({
	component: LibraryViewerRoute,
});

function LibraryViewerRoute() {
	const { fileId } = Route.useParams();
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const pilot = useLibraryPilot(activeCampaignId);
	// Fora do piloto: volta pra home da campanha sem mensagem.
	if (pilot === false) return <Navigate to="/dashboard" replace />;
	if (pilot === null || !activeCampaignId) return <ViewerSkeleton />;
	return (
		<LibraryViewerPage
			key={fileId}
			fileId={fileId}
			campaignId={activeCampaignId}
		/>
	);
}

function ViewerSkeleton() {
	return (
		<div className="space-y-3" aria-busy="true">
			<Skeleton className="h-14 w-full rounded-2xl" />
			<Skeleton className="h-[70vh] w-full rounded-2xl" />
		</div>
	);
}

type ViewerState =
	| { status: "loading" }
	| { status: "missing" }
	| { status: "error" }
	| {
			status: "ready";
			file: LibraryFile;
			/** PDF original (do R2), nunca alterado. */
			original: ArrayBuffer;
			/** Original com os tamanhos de fonte aplicados (o que o viewer abre). */
			prepared: PreparedPdf;
			values: FormValues;
			sizes: FontSizes;
			/** Muda quando os tamanhos mudam: reabre o viewer com os novos bytes. */
			revision: number;
	  };

function LibraryViewerPage({
	fileId,
	campaignId,
}: {
	fileId: string;
	campaignId: string;
}) {
	const toast = useToast();
	const [state, setState] = useState<ViewerState>({ status: "loading" });
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const [isExporting, setIsExporting] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const [selectedField, setSelectedField] = useState<string | null>(null);
	const handleRef = useRef<PdfViewerHandle | null>(null);

	const load = useCallback(async () => {
		setState({ status: "loading" });
		try {
			const file = await getLibraryFile(fileId);
			if (!file || file.campaignId !== campaignId) {
				setState({ status: "missing" });
				return;
			}
			const [original, stored] = await Promise.all([
				downloadLibraryPdf(fileId),
				loadFormValues(fileId).catch(() => ({})),
			]);
			const { values, sizes } = splitStoredValues(stored);
			const prepared = await preparePdfWithFontSizes(original, sizes);
			setState({
				status: "ready",
				file,
				original,
				prepared,
				values,
				sizes,
				revision: 0,
			});
		} catch {
			setState({ status: "error" });
		}
	}, [fileId, campaignId]);

	useEffect(() => {
		void load();
	}, [load]);

	async function handleExport() {
		if (!handleRef.current) return;
		setIsExporting(true);
		try {
			await handleRef.current.exportFilled();
		} catch (error) {
			if ((error as { name?: string })?.name === "AbortError") return;
			toast.error({
				title: "Não deu pra exportar",
				description: "Tente de novo em alguns segundos.",
			});
		} finally {
			setIsExporting(false);
		}
	}

	async function handleSizesChange(next: FontSizes) {
		if (state.status !== "ready" || isResizing) return;
		const current = state;
		setIsResizing(true);
		try {
			// Pega o que a pessoa digitou até agora antes de reabrir o PDF.
			const values = (await handleRef.current?.snapshot()) ?? current.values;
			setSaveStatus("saving");
			const prepared = await preparePdfWithFontSizes(current.original, next);
			setState({
				...current,
				prepared,
				values,
				sizes: next,
				revision: current.revision + 1,
			});
			try {
				await saveFormValues(fileId, mergeStoredValues(values, next));
				setSaveStatus("saved");
			} catch {
				setSaveStatus("error");
			}
		} finally {
			setIsResizing(false);
		}
	}

	if (state.status === "missing") return <Navigate to="/library" replace />;

	const title = state.status === "ready" ? state.file.title : "";
	const label = saveStatusLabel(saveStatus);

	return (
		<div className="flex h-[calc(100dvh-7rem)] min-h-[480px] flex-col gap-3">
			<header className="flex min-h-14 items-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-2 py-2 backdrop-blur-md">
				<Link
					to="/library"
					aria-label="Voltar pra Biblioteca"
					className={cn(
						buttonVariants({ variant: "ghost", size: "icon" }),
						"h-11 w-11 shrink-0",
					)}
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<FileText
					className="hidden h-4 w-4 shrink-0 text-primary sm:block"
					strokeWidth={1.7}
				/>
				<div className="min-w-0 flex-1">
					{state.status === "ready" ? (
						<h1 className="truncate text-[14px] font-semibold text-foreground">
							{title}
						</h1>
					) : (
						<Skeleton className="h-4 w-40 rounded-md" />
					)}
					<p
						className={cn(
							"h-4 text-[11px] tabular-nums transition-opacity duration-150",
							saveStatus === "error"
								? "text-destructive"
								: saveStatus === "saved"
									? "text-primary"
									: "text-muted-foreground",
							label ? "opacity-100" : "opacity-0",
						)}
						aria-live="polite"
					>
						{label}
					</p>
				</div>
				{state.status === "ready" && (
					<FontSizeControl
						fields={state.prepared.fields}
						sizes={state.sizes}
						selectedField={selectedField}
						onSelectField={setSelectedField}
						onChange={(next) => void handleSizesChange(next)}
						busy={isResizing}
					/>
				)}
				<Button
					variant="outline"
					onClick={() => void handleExport()}
					disabled={state.status !== "ready" || isExporting}
					className="min-h-11 shrink-0 active:scale-[0.98]"
				>
					<Download className="h-4 w-4 sm:mr-2" />
					<span className="hidden sm:inline">
						{isExporting ? "Exportando…" : "Exportar PDF"}
					</span>
					<span className="sr-only sm:hidden">Exportar PDF</span>
				</Button>
			</header>

			<div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-card/40">
				{state.status === "error" ? (
					<ViewerError onRetry={() => void load()} />
				) : state.status === "loading" ? (
					<ViewerLoading />
				) : (
					<Suspense fallback={<ViewerLoading />}>
						<PdfViewer
							key={state.revision}
							fileId={fileId}
							title={state.file.title}
							buffer={state.prepared.buffer}
							initialValues={state.values}
							fontSizes={state.sizes}
							onFieldTouched={setSelectedField}
							onStatus={setSaveStatus}
							onError={() => setState({ status: "error" })}
							handleRef={handleRef}
						/>
					</Suspense>
				)}
			</div>
		</div>
	);
}

function ViewerLoading() {
	return (
		<div
			className="flex h-full flex-col items-center justify-center gap-3 p-6"
			aria-busy="true"
		>
			<Skeleton className="h-[60%] w-full max-w-md rounded-xl" />
			<p className="text-[12px] text-muted-foreground">Abrindo o PDF…</p>
		</div>
	);
}

function ViewerError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
			<p className="text-[13px] font-semibold text-foreground">
				Não deu pra abrir o PDF.
			</p>
			<p className="text-[12px] text-muted-foreground">
				Confira a conexão e tente de novo.
			</p>
			<Button variant="outline" onClick={onRetry} className="min-h-11">
				<RotateCcw className="mr-2 h-4 w-4" />
				Tentar de novo
			</Button>
		</div>
	);
}
