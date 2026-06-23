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
		if (!supabase || !jamLink || !spotifyUser || !user) {
			setJamParticipants([]);
			return;
		}

		// Criar um nome de canal único baseado no link da Jam
		// Usamos uma sanitização simples para o link
		const safeLink = jamLink.replace(/[^a-z0-9]/gi, "-").substring(0, 50);
		const channelName = `jam:${safeLink}`;
		const channel = supabase.channel(channelName);

		channel
			.on("presence", { event: "sync" }, () => {
				const newState = channel.presenceState();
				const participants: any[] = [];

				for (const id in newState) {
					const presence = newState[id] as any;
					if (presence[0]) {
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
						name: spotifyUser.name,
						image: spotifyUser.image,
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
