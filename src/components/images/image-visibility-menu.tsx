import {
	DropdownMenuCheckboxItem,
	DropdownMenuGroup,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { membershipRoleLabel, type SharePerson } from "@/lib/content-audience";
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
	people,
	onChange,
}: {
	isPrivate: boolean;
	audience: ImageAudience;
	people?: SharePerson[];
	onChange: (next: ImageVisibilityChange) => void;
}) {
	const userIds = audience.userIds ?? [];
	function togglePerson(userId: string, checked: boolean) {
		const next = checked
			? [...userIds, userId]
			: userIds.filter((id) => id !== userId);
		onChange({ isPrivate, audience: { ...audience, userIds: next } });
	}

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
			{people && people.length > 0 && (
				<>
					<DropdownMenuLabel>Uma pessoa</DropdownMenuLabel>
					{people.map((person) => (
						<DropdownMenuCheckboxItem
							key={person.userId}
							checked={isPrivate && userIds.includes(person.userId)}
							disabled={!isPrivate}
							closeOnClick={false}
							onCheckedChange={(checked) =>
								togglePerson(person.userId, checked)
							}
						>
							{person.email || "Participante"} ·{" "}
							{membershipRoleLabel(person.role)}
						</DropdownMenuCheckboxItem>
					))}
				</>
			)}
			<DropdownMenuLabel className="font-normal">
				O mestre sempre vê.
			</DropdownMenuLabel>
			{people && (
				<DropdownMenuLabel className="font-normal">
					Uma pessoa marcada vê mesmo com os grupos desligados.
				</DropdownMenuLabel>
			)}
		</DropdownMenuGroup>
	);
}
