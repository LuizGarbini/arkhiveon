/**
 * Viewer da Biblioteca (Fatias 1c + 2) — EmbedPDF v2 (pin 2.15.1).
 * Carregado só sob demanda (React.lazy na rota), junto com o pdfium.wasm,
 * que vai embutido no build (funciona offline no APK, sem CDN).
 * Preenche campos AcroForm; cada mudança agenda o autosave da pessoa.
 */
import { Capacitor } from "@capacitor/core";
import pdfiumWasmUrl from "@embedpdf/pdfium/pdfium.wasm?url";
import { PDFViewer, type PluginRegistry } from "@embedpdf/react-pdf-viewer";
import { useEffect, useMemo, useRef } from "react";
import {
	createAutosaver,
	exportFileName,
	type FormValues,
	type SaveStatus,
	saveFormValues,
} from "@/lib/library/library-forms";

// Formas mínimas das capacidades que usamos (os tipos do snippet são preact).
interface TaskLike<T> {
	toPromise: () => Promise<T>;
}
interface Hook<E> {
	(listener: (event: E) => void): () => void;
}
interface DocumentManagerCap {
	openDocumentBuffer: (opts: {
		buffer: ArrayBuffer;
		name: string;
		documentId?: string;
	}) => TaskLike<{ documentId: string; task: TaskLike<unknown> }>;
}
interface FormCap {
	getFormValues: (documentId?: string) => FormValues;
	setFormValues: (values: FormValues, documentId?: string) => TaskLike<boolean>;
	onFormReady: Hook<{ documentId: string }>;
	onFieldValueChange: Hook<{ documentId: string }>;
}
interface ExportCap {
	saveAsCopy: () => TaskLike<ArrayBuffer>;
}

function capability<T>(registry: PluginRegistry, id: string): T | null {
	const plugin = (
		registry as unknown as {
			getPlugin: (id: string) => { provides?: () => T } | null;
		}
	).getPlugin(id);
	return plugin?.provides?.() ?? null;
}

export interface PdfViewerHandle {
	exportFilled: () => Promise<void>;
}

interface PdfViewerProps {
	fileId: string;
	title: string;
	buffer: ArrayBuffer;
	initialValues: FormValues;
	onStatus: (status: SaveStatus) => void;
	onError: () => void;
	handleRef: React.MutableRefObject<PdfViewerHandle | null>;
}

async function deliverPdf(bytes: ArrayBuffer, name: string) {
	const file = new File([bytes], name, { type: "application/pdf" });
	// No app (WebView) não existe download de blob: usa o compartilhar do sistema.
	if (
		Capacitor.isNativePlatform() &&
		typeof navigator.canShare === "function" &&
		navigator.canShare({ files: [file] })
	) {
		await navigator.share({ files: [file], title: name });
		return;
	}
	const url = URL.createObjectURL(file);
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function PdfViewer({
	fileId,
	title,
	buffer,
	initialValues,
	onStatus,
	onError,
	handleRef,
}: PdfViewerProps) {
	const statusRef = useRef(onStatus);
	statusRef.current = onStatus;
	const saver = useMemo(
		() =>
			createAutosaver({
				save: (values) => saveFormValues(fileId, values),
				onStatus: (status) => statusRef.current(status),
			}),
		[fileId],
	);
	const cleanups = useRef<(() => void)[]>([]);

	// Ao sair da tela: grava o que faltou e solta os listeners do viewer.
	useEffect(
		() => () => {
			void saver.flush();
			for (const off of cleanups.current) off();
			cleanups.current = [];
		},
		[saver],
	);

	// O app é escuro por padrão; só usa claro se o tema claro estiver ativo.
	const isDark =
		typeof document === "undefined" ||
		!document.documentElement.classList.contains("light");

	const config = useMemo(
		() => ({
			// Absoluto: o worker do pdfium roda em blob: e não resolve caminho relativo.
			wasmUrl: new URL(pdfiumWasmUrl, window.location.href).href,
			tabBar: "never" as const,
			theme: { preference: isDark ? ("dark" as const) : ("light" as const) },
			// Só ler e preencher: sem anotar, redigir, criar campo, assinar ou trocar modo.
			disabledCategories: [
				"annotation",
				"redaction",
				"form",
				"mode",
				"insert",
				"stamp",
				"security",
				"comment",
				"panel-comment",
			],
			export: { defaultFileName: exportFileName(title) },
		}),
		[isDark, title],
	);

	async function handleReady(registry: PluginRegistry) {
		const docs = capability<DocumentManagerCap>(registry, "document-manager");
		const form = capability<FormCap>(registry, "form");
		const exporter = capability<ExportCap>(registry, "export");
		if (!docs) {
			onError();
			return;
		}
		let documentId: string = fileId;
		let restoring = false;
		if (form) {
			cleanups.current.push(
				form.onFormReady(async (event) => {
					if (event.documentId !== documentId) return;
					if (Object.keys(initialValues).length > 0) {
						restoring = true;
						try {
							await form.setFormValues(initialValues, documentId).toPromise();
						} finally {
							restoring = false;
						}
					}
					saver.markSaved(form.getFormValues(documentId));
				}),
				form.onFieldValueChange((event) => {
					if (restoring || event.documentId !== documentId) return;
					saver.schedule(form.getFormValues(documentId));
				}),
			);
		}
		handleRef.current = {
			exportFilled: async () => {
				if (!exporter) throw new Error("export");
				await saver.flush();
				const bytes = await exporter.saveAsCopy().toPromise();
				await deliverPdf(bytes, exportFileName(title));
			},
		};
		try {
			const opened = await docs
				.openDocumentBuffer({
					buffer: buffer.slice(0),
					name: title,
					documentId: fileId,
				})
				.toPromise();
			documentId = opened.documentId;
			await opened.task.toPromise();
		} catch {
			onError();
		}
	}

	return (
		<PDFViewer
			config={config}
			className="h-full w-full"
			onReady={(registry) => void handleReady(registry)}
		/>
	);
}
