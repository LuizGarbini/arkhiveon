import { Ban, Copy, FilePlus2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { formatBytes } from "@/lib/library/library-storage";
import type { UploadReview } from "@/lib/library/upload-dedupe";

interface UploadReviewDialogProps {
	/** null = fechado. */
	review: UploadReview<File> | null;
	onCancel: () => void;
	onConfirm: (files: File[]) => void;
}

/**
 * Antes de enviar um lote com PDF repetido ou grande demais: novos marcados,
 * os que já estão na Biblioteca desmarcados, os acima de 200 MB só listados.
 */
export function UploadReviewDialog({
	review,
	onCancel,
	onConfirm,
}: UploadReviewDialogProps) {
	return (
		<Dialog open={review !== null} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="sm:max-w-lg">
				{review ? (
					<ReviewBody
						review={review}
						onCancel={onCancel}
						onConfirm={onConfirm}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function ReviewBody({
	review,
	onCancel,
	onConfirm,
}: {
	review: UploadReview<File>;
	onCancel: () => void;
	onConfirm: (files: File[]) => void;
}) {
	// Montado a cada lote (o Dialog desmonta o conteúdo ao fechar), então o
	// estado inicial já é a seleção padrão: só os novos.
	const [selected, setSelected] = useState<ReadonlySet<File>>(
		() => new Set(review.fresh),
	);
	const toSend = [...review.fresh, ...review.duplicates].filter((file) =>
		selected.has(file),
	);
	const toggle = (file: File, checked: boolean) =>
		setSelected((prev) => {
			const next = new Set(prev);
			if (checked) next.add(file);
			else next.delete(file);
			return next;
		});

	return (
		<>
			<DialogHeader>
				<DialogTitle>Conferir antes de enviar</DialogTitle>
				<DialogDescription>
					{review.duplicates.length > 0
						? "Alguns PDFs já estão na Biblioteca. Marque só o que quer enviar de novo."
						: "Alguns PDFs passam do limite de 200 MB e ficam de fora."}
				</DialogDescription>
			</DialogHeader>
			<div className="-mx-2 flex max-h-[55vh] flex-col gap-4 overflow-y-auto px-2">
				{review.fresh.length > 0 ? (
					<ReviewSection
						icon={<FilePlus2 className="size-3.5" />}
						title="Novos"
						count={review.fresh.length}
					>
						{review.fresh.map((file, index) => (
							<SelectableRow
								key={`n-${index}-${file.name}`}
								file={file}
								checked={selected.has(file)}
								onChange={(checked) => toggle(file, checked)}
							/>
						))}
					</ReviewSection>
				) : null}
				{review.duplicates.length > 0 ? (
					<ReviewSection
						icon={<Copy className="size-3.5" />}
						title="Já na Biblioteca"
						count={review.duplicates.length}
						hint="Mesmo nome e tamanho. Marque para enviar de novo."
					>
						{review.duplicates.map((file, index) => (
							<SelectableRow
								key={`d-${index}-${file.name}`}
								file={file}
								checked={selected.has(file)}
								onChange={(checked) => toggle(file, checked)}
							/>
						))}
					</ReviewSection>
				) : null}
				{review.tooLarge.length > 0 ? (
					<ReviewSection
						icon={<Ban className="size-3.5" />}
						title="Acima de 200 MB"
						count={review.tooLarge.length}
						hint="Não dá pra enviar. Divida ou comprima o PDF."
					>
						{review.tooLarge.map((file, index) => (
							<li
								key={`g-${index}-${file.name}`}
								className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 text-muted-foreground"
							>
								<span className="min-w-0 flex-1 truncate text-[13px]">
									{file.name}
								</span>
								<span className="shrink-0 text-[12px] font-semibold tabular-nums text-destructive">
									{formatBytes(file.size)}
								</span>
							</li>
						))}
					</ReviewSection>
				) : null}
			</div>
			<DialogFooter>
				<Button
					variant="ghost"
					className="min-h-[44px] sm:min-h-9"
					onClick={onCancel}
				>
					Cancelar
				</Button>
				<Button
					className="min-h-[44px] sm:min-h-9"
					disabled={toSend.length === 0}
					onClick={() => onConfirm(toSend)}
				>
					Enviar {toSend.length}
				</Button>
			</DialogFooter>
		</>
	);
}

function ReviewSection({
	icon,
	title,
	count,
	hint,
	children,
}: {
	icon: ReactNode;
	title: string;
	count: number;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<section aria-label={title} className="flex flex-col gap-1">
			<h3 className="flex items-center gap-1.5 px-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
				{icon}
				{title}
				<span className="tabular-nums">· {count}</span>
			</h3>
			{hint ? (
				<p className="px-2 text-[12px] text-muted-foreground">{hint}</p>
			) : null}
			<ul className="flex flex-col">{children}</ul>
		</section>
	);
}

function SelectableRow({
	file,
	checked,
	onChange,
}: {
	file: File;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<li>
			{/* biome-ignore lint/a11y/noLabelWithoutControl: o Checkbox do DS é o controle dentro do label. */}
			<label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted/50">
				<Checkbox
					checked={checked}
					onCheckedChange={(value) => onChange(value === true)}
				/>
				<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
					{file.name}
				</span>
				<span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
					{formatBytes(file.size)}
				</span>
			</label>
		</li>
	);
}
