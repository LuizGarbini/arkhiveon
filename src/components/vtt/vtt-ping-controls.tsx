import { Radio } from "lucide-react";
import {
	Kbd,
	segmentClass,
	VTTOptionsBar,
	VTTSegmented,
} from "@/components/vtt/vtt-options-bar";
import { cn } from "@/lib/utils";
import { pingKindInfo, pingKindsFor } from "@/lib/vtt/ping-kinds";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { PING_KIND_ICON, PING_KIND_TEXT_CLASS } from "./ping-kind-ui";

/**
 * Painel da ferramenta Ping: escolhe o tipo do próximo ping (atenção, perigo, a
 * caminho, ajuda, destacar personagem e, só para o mestre, "Todos aqui", que leva a
 * câmera de todos). Mostra também os atalhos: Alt + clique usa o tipo escolhido e
 * Ctrl + apertar e arrastar no mapa abre a roda com todos os tipos.
 */
export function VTTPingControls() {
	const activeTool = useVTTStore((s) => s.activeTool);
	const kind = useVTTStore((s) => s.pingKind);
	const setPingKind = useVTTStore((s) => s.setPingKind);
	const setActiveTool = useVTTStore((s) => s.setActiveTool);
	const canManage = useVTTStore((s) => s.isGM || s.isCoGM);

	if (activeTool !== "ping") return null;
	const kinds = pingKindsFor(canManage);
	const chosen = pingKindInfo(kind);

	return (
		<VTTOptionsBar
			label="Ping"
			icon={Radio}
			closeLabel="Fechar ferramenta de ping"
			onClose={() => setActiveTool("select")}
			wrapOnPhone
			compactLabel
			footer={
				<p className="pointer-events-none flex flex-wrap items-center justify-center gap-x-3 gap-y-1 self-center rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
					<span>{chosen.hint}</span>
					<span className="[@media(hover:hover)]:hidden">
						Toque no mapa para pingar · segure o botão de ping e arraste para
						trocar o tipo
					</span>
					<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
						<Kbd>Alt</Kbd> + clique usa o tipo escolhido
					</span>
					<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
						<Kbd>Ctrl</Kbd> + apertar e arrastar no mapa abre a roda
					</span>
				</p>
			}
		>
			<VTTSegmented legend="Tipo do ping" className="max-sm:w-full">
				{kinds.map((info) => {
					const Icon = PING_KIND_ICON[info.id];
					return (
						<button
							type="button"
							key={info.id}
							title={`${info.label}: ${info.hint}`}
							aria-label={info.label}
							aria-pressed={kind === info.id}
							onClick={() => setPingKind(info.id)}
							className={cn(
								segmentClass(kind === info.id),
								"min-w-11 max-sm:flex-1",
							)}
						>
							<Icon
								aria-hidden
								className={cn("size-4", PING_KIND_TEXT_CLASS[info.id])}
							/>
							<span className="hidden 2xl:inline">{info.label}</span>
						</button>
					);
				})}
			</VTTSegmented>
		</VTTOptionsBar>
	);
}
