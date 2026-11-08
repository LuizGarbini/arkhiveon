import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
	membershipRoleLabel,
	SHARE_OPTIONS,
	type SharePerson,
	type ShareSettings,
	shareHint,
} from "@/lib/content-audience";
import { useRPGStore } from "@/lib/store";
import type { ContentShare } from "@/lib/store/types";

export function useCampaignPeople(enabled: boolean): {
	people: SharePerson[];
	status: "idle" | "loading" | "ready" | "error";
} {
	const campaignId = useRPGStore((state) => state.activeCampaignId);
	const loadCampaignMembersAndInvites = useRPGStore(
		(state) => state.loadCampaignMembersAndInvites,
	);
	const [people, setPeople] = useState<SharePerson[]>([]);
	const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
		"idle",
	);

	useEffect(() => {
		if (!enabled || !campaignId) {
			setPeople([]);
			setStatus("idle");
			return;
		}
		let cancelled = false;
		setStatus("loading");
		void loadCampaignMembersAndInvites(campaignId)
			.then((result) => {
				if (cancelled) return;
				setPeople(
					result.members
						.filter((member) => member.role !== "owner")
						.map((member) => ({
							userId: member.userId,
							email: member.email,
							role: member.role,
						})),
				);
				setStatus("ready");
			})
			.catch(() => {
				if (cancelled) return;
				setPeople([]);
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, [enabled, campaignId, loadCampaignMembersAndInvites]);

	return { people, status };
}

export function WhoCanSeeFields({
	share,
	sharedWith,
	people,
	peopleStatus = "ready",
	onChange,
	disabled = false,
}: {
	share: ContentShare;
	sharedWith: string[];
	people: SharePerson[];
	peopleStatus?: "idle" | "loading" | "ready" | "error";
	onChange: (next: ShareSettings) => void;
	disabled?: boolean;
}) {
	function togglePerson(userId: string) {
		const next = sharedWith.includes(userId)
			? sharedWith.filter((id) => id !== userId)
			: [...sharedWith, userId];
		onChange({ share: "chosen", sharedWith: next });
	}

	return (
		<div className="space-y-3 rounded-xl border border-border/70 bg-card-elevated/30 p-4">
			<div className="space-y-2">
				<Label>Quem pode ver</Label>
				<Select
					aria-label="Quem pode ver"
					value={share}
					disabled={disabled}
					onChange={(event) =>
						onChange({
							share: event.target.value as ContentShare,
							sharedWith,
						})
					}
				>
					{SHARE_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</Select>
				<p className="text-xs leading-relaxed text-muted-foreground">
					{shareHint(share)} Você sempre vê. Quem criou também vê.
				</p>
			</div>
			{share === "chosen" && (
				<div className="space-y-1">
					<p className="text-sm font-medium text-foreground">Pessoas</p>
					{peopleStatus === "loading" || peopleStatus === "idle" ? (
						<p className="text-xs text-muted-foreground">
							Carregando participantes…
						</p>
					) : peopleStatus === "error" ? (
						<p className="text-xs text-destructive" role="alert">
							Não foi possível listar a mesa.
						</p>
					) : people.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							Nenhum jogador ou co-mestre nesta mesa.
						</p>
					) : (
						<ul className="max-h-48 space-y-1 overflow-y-auto">
							{people.map((person) => {
								const checked = sharedWith.includes(person.userId);
								const inputId = `quem-ve-${person.userId}`;
								return (
									<li key={person.userId}>
										<label
											htmlFor={inputId}
											className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 select-none"
										>
											<input
												id={inputId}
												type="checkbox"
												className="size-4 accent-primary"
												checked={checked}
												disabled={disabled}
												onChange={() => togglePerson(person.userId)}
											/>
											<span className="min-w-0 flex-1 truncate text-sm text-foreground">
												{person.email || "Participante"}
											</span>
											<span className="shrink-0 text-xs text-muted-foreground">
												{membershipRoleLabel(person.role)}
											</span>
										</label>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}
