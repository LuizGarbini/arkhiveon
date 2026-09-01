import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

export function JamPresenceSync() {
	const { user } = useAuth();
	const spotifyUser = useRPGStore((s) => s.spotifyUser);
	const jamLink = useRPGStore((s) => s.spotifyJamLink);
	const setJamParticipants = useRPGStore((s) => s.setJamParticipants);

	useEffect(() => {
		const supabase = getSupabase();
		if (!supabase || !jamLink || !user) {
			setJamParticipants([]);
			return;
		}

		const participantName =
			spotifyUser?.name ||
			(typeof user.user_metadata?.name === "string" &&
			user.user_metadata.name.trim()
				? user.user_metadata.name
				: user.email?.split("@")[0] || "Aventureiro");

		const participantImage =
			spotifyUser?.image ||
			(typeof user.user_metadata?.avatar_url === "string"
				? user.user_metadata.avatar_url
				: typeof user.user_metadata?.picture === "string"
					? user.user_metadata.picture
					: undefined);

		// Criar um nome de canal único baseado no link da Jam
		// Usamos uma sanitização simples para o link
		const safeLink = jamLink.replace(/[^a-z0-9]/gi, "-").substring(0, 50);
		const channelName = `jam:${safeLink}`;
		const channel = supabase.channel(channelName);

		channel
			.on("presence", { event: "sync" }, () => {
				const newState = channel.presenceState();
				const participants: { id: string; name: string; image?: string }[] = [];

				for (const id in newState) {
					const presence = newState[id] as unknown as Array<{
						user_id?: string;
						name?: string;
						image?: string;
					}>;
					if (presence?.[0]?.user_id && presence[0]?.name) {
						participants.push({
							id: presence[0].user_id,
							name: presence[0].name,
							image: presence[0].image,
						});
					}
				}

				// Remover duplicatas (Supabase Presence pode ter múltiplas instâncias por usuário)
				const uniqueParticipants = Array.from(
					new Map(participants.map((p) => [p.id, p])).values(),
				);

				setJamParticipants(uniqueParticipants);
			})
			.subscribe(async (status) => {
				if (status === "SUBSCRIBED") {
					await channel.track({
						user_id: user.id,
						name: participantName,
						image: participantImage,
						online_at: new Date().toISOString(),
					});
				}
			});

		return () => {
			channel.unsubscribe();
		};
	}, [jamLink, spotifyUser, user, setJamParticipants]);

	return null;
}
