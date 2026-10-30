import {
	DropdownMenuCheckboxItem,
	DropdownMenuGroup,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { ImageAudience } from "@/lib/image-visibility";

export interface ImageVisibilityChange {
	isPrivate: boolean;
	audience: ImageAudience;
}

/**
 * Itens de menu "Quem vê": "Pública" liga/desliga a privacidade; quando privada,
 * co-mestres e jogadores são marcados livremente. O mestre sempre vê.
 */
export function ImageVisibilityMenuItems({
	isPrivate,
	audience,
	onChange,
}: {
	isPrivate: boolean;
	audience: ImageAudience;
	onChange: (next: ImageVisibilityChange) => void;
}) {
	return (
		<DropdownMenuGroup>
			<DropdownMenuLabel>Quem vê</DropdownMenuLabel>
			<DropdownMenuCheckboxItem
				checked={!isPrivate}
				closeOnClick={false}
				onCheckedChange={(checked) =>
					onChange({ isPrivate: !checked, audience })
				}
			>
				Pública
			</DropdownMenuCheckboxItem>
			<DropdownMenuCheckboxItem
				checked={isPrivate && audience.coGms}
				disabled={!isPrivate}
				closeOnClick={false}
				onCheckedChange={(checked) =>
					onChange({ isPrivate, audience: { ...audience, coGms: checked } })
				}
			>
				Co-mestres
			</DropdownMenuCheckboxItem>
			<DropdownMenuCheckboxItem
				checked={isPrivate && audience.players}
				disabled={!isPrivate}
				closeOnClick={false}
				onCheckedChange={(checked) =>
					onChange({ isPrivate, audience: { ...audience, players: checked } })
				}
			>
				Jogadores
			</DropdownMenuCheckboxItem>
			<DropdownMenuLabel className="font-normal">
				O mestre sempre vê.
			</DropdownMenuLabel>
		</DropdownMenuGroup>
	);
}
