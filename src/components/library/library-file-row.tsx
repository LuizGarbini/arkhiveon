import { Link } from "@tanstack/react-router";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, type LibraryFile } from "@/lib/library/library-storage";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "short",
	year: "numeric",
});

interface LibraryFileRowProps {
	file: LibraryFile;
	canManage: boolean;
	onDelete: (file: LibraryFile) => void;
}

export function LibraryFileRow({
	file,
	canManage,
	onDelete,
}: LibraryFileRowProps) {
	return (
		<li className="flex min-h-14 items-center gap-1 rounded-2xl border border-border/70 bg-card/70 pr-2 backdrop-blur-md transition-colors duration-150 has-[a:hover]:border-primary/40">
			<Link
				to="/library/$fileId"
				params={{ fileId: file.id }}
				aria-label={`Abrir ${file.title}`}
				className="flex min-h-14 min-w-0 flex-1 select-none items-center gap-3 rounded-2xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
			>
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
					<FileText className="h-5 w-5" strokeWidth={1.7} />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[13px] font-semibold text-foreground">
						{file.title}
					</p>
					<p className="text-[11px] tabular-nums text-muted-foreground">
						{formatBytes(file.sizeBytes)} ·{" "}
						{dateFormat.format(new Date(file.createdAt))}
					</p>
				</div>
			</Link>
			{canManage ? (
				<Button
					variant="ghost"
					size="icon"
					className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
					aria-label={`Apagar ${file.title}`}
					onClick={() => onDelete(file)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			) : null}
		</li>
	);
}
