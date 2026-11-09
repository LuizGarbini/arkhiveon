import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export type TokenRemovalKind = "character" | "npc" | "token";

export interface TokenRemovalRequest {
	name: string;
	tokenIds: string[];
	kind: TokenRemovalKind;
}

export function tokenRemovalKind(token: {
	characterId?: string | null;
	npcId?: string | null;
}): TokenRemovalKind {
	if (token.characterId) return "character";
	if (token.npcId) return "npc";
	return "token";
}

export function tokenRemovalDetail(
	kind: TokenRemovalKind,
	count: number,
): string {
	const leaving =
		count === 1
			? "O token sai desta cena."
			: `Os ${count} tokens saem desta cena.`;
	if (kind === "character") return `${leaving} A ficha continua na campanha.`;
	if (kind === "npc") return `${leaving} O NPC continua na campanha.`;
	return `${leaving} Não dá para desfazer.`;
}

export function VTTRemoveTokenDialog({
	request,
	pending,
	error,
	onOpenChange,
	onConfirm,
}: {
	request: TokenRemovalRequest | null;
	pending: boolean;
	error: string | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	const count = request?.tokenIds.length ?? 0;
	return (
		<Dialog
			open={request !== null}
			onOpenChange={(open) => {
				if (!open && !pending) onOpenChange(false);
			}}
		>
			<DialogContent className="vtt-dialog max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 pr-12 font-display text-lg">
						<Trash2 className="size-5 shrink-0 text-destructive" />
						<span className="min-w-0 break-words">
							Remover “{request?.name}” da mesa?
						</span>
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground">
						{request ? tokenRemovalDetail(request.kind, count) : ""}
					</DialogDescription>
				</DialogHeader>
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				<div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
					<Button
						type="button"
						variant="ghost"
						className="h-11 px-4"
						disabled={pending}
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						variant="destructive"
						className="h-11 gap-1.5 px-4"
						disabled={pending || count === 0}
						onClick={onConfirm}
					>
						<Trash2 className="size-3.5" />
						{pending ? "Removendo…" : "Remover da mesa"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
