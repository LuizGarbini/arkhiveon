import type { ContentShare, MembershipRole } from "./store/types";

export interface SharePerson {
	userId: string;
	email: string;
	role: MembershipRole;
}

export interface ShareSettings {
	share: ContentShare;
	sharedWith: string[];
}

export interface ContentViewer {
	userId?: string | null;
	role?: MembershipRole | null;
}

export const SHARE_OPTIONS: ReadonlyArray<{
	value: ContentShare;
	label: string;
	hint: string;
}> = [
	{
		value: "table",
		label: "Toda a mesa",
		hint: "Mestre, co-mestres e jogadores veem.",
	},
	{
		value: "staff",
		label: "Só co-mestres",
		hint: "Só o mestre e os co-mestres veem.",
	},
	{
		value: "players",
		label: "Só jogadores",
		hint: "Os jogadores veem. Os co-mestres não.",
	},
	{
		value: "chosen",
		label: "Pessoas escolhidas",
		hint: "Só as pessoas marcadas veem, além de você.",
	},
];

export function shareHint(share: ContentShare | undefined): string {
	return (
		SHARE_OPTIONS.find((option) => option.value === (share ?? "table"))?.hint ??
		SHARE_OPTIONS[0].hint
	);
}

export function membershipRoleLabel(role: MembershipRole): string {
	if (role === "owner") return "Mestre";
	if (role === "editor") return "Co-mestre";
	return "Jogador";
}

interface SharedRecord {
	share?: ContentShare;
	sharedWith?: string[];
	createdBy?: string;
}

/**
 * Ficha: ausente = toda a mesa. O mestre (`owner`) e quem criou sempre veem.
 * Co-mestre é `editor`. Jogador é `viewer`.
 */
export function canViewCharacter(
	character: SharedRecord,
	viewer: ContentViewer,
): boolean {
	if (viewer.role === "owner") return true;
	if (viewer.userId && character.createdBy === viewer.userId) return true;
	const share = character.share ?? "table";
	if (share === "table") return true;
	if (share === "staff") return viewer.role === "editor";
	if (share === "players") return viewer.role === "viewer";
	if (share === "chosen") {
		return (
			!!viewer.userId && (character.sharedWith ?? []).includes(viewer.userId)
		);
	}
	return false;
}
