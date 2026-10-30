import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tokenImageForViewer } from "@/lib/vtt/permissions";
import type { VTTToken } from "@/lib/vtt/types";

type PortraitToken = Pick<VTTToken, "avatarUrl" | "layer" | "isHidden">;

/**
 * Foto da linha de iniciativa. Sem imagem visível para quem olha, não desenha
 * o avatar: a linha fica só com o nome. A URL passa por `tokenImageForViewer`,
 * então token oculto ou da camada do mestre não chega ao jogador.
 */
export function InitiativePortrait({
	name,
	token,
	isGM,
}: {
	name: string;
	token: PortraitToken | undefined;
	isGM: boolean;
}) {
	const src = token ? tokenImageForViewer(token, isGM) : undefined;
	if (!src) return null;
	return (
		<Avatar aria-hidden="true">
			<AvatarImage src={src} alt="" />
			<AvatarFallback className="overflow-hidden px-0.5 text-center text-[10px] leading-tight">
				{name}
			</AvatarFallback>
		</Avatar>
	);
}
