import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { getSpotifyToken, getUserProfile } from "@/lib/spotify";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/spotify-callback")({
	component: SpotifyCallback,
});

function SpotifyCallback() {
	const navigate = useNavigate();
	const setSpotifyAuth = useRPGStore((s) => s.setSpotifyAuth);
	const toast = useToast();
	const processedRef = useRef(false);

	useEffect(() => {
		if (processedRef.current) return;

		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get("code");
		const state = urlParams.get("state");
		const authError = urlParams.get("error");
		const storedState = window.localStorage.getItem("spotify_auth_state");

		if (authError) {
			console.error("Spotify recusou a autorização:", authError);
			toast.error({
				title: "Acesso Negado",
				description: "Você recusou a conexão com o Spotify.",
			});
			void navigate({ to: "/dashboard" });
			return;
		}

		if (!code || state !== storedState) {
			console.error("Callback Spotify inválido ou origem diferente.");
			void navigate({ to: "/dashboard" });
			return;
		}
		const authCode = code;

		async function handleAuth() {
			if (processedRef.current) return;
			processedRef.current = true;

			try {
				const data = await getSpotifyToken(authCode);
				const profile = await getUserProfile(data.access_token);

				setSpotifyAuth(data.access_token, {
					name: profile.display_name,
					email: profile.email,
					image: profile.images?.[0]?.url,
				});

				window.localStorage.removeItem("spotify_auth_state");
				window.localStorage.removeItem("spotify_code_verifier");
				window.localStorage.removeItem("spotify_redirect_uri");

				toast.success({
					title: "Spotify Conectado",
					description: `Bem-vindo, ${profile.display_name}!`,
				});

				void navigate({ to: "/dashboard" });
			} catch (error: unknown) {
				console.error("Erro no fluxo de auth Spotify:", error);

				const errorMessage =
					error instanceof Error ? error.message : String(error);
				const isForbidden = errorMessage.includes("403");

				toast.error({
					title: "Erro na Conexão",
					description: isForbidden
						? "O Spotify negou o acesso. Verifique se sua conta está na whitelist do desenvolvedor."
						: "Não foi possível sincronizar com o Spotify.",
				});

				void navigate({ to: "/dashboard" });
			}
		}
		void handleAuth();
	}, [navigate, setSpotifyAuth, toast]);

	return (
		<div className="flex h-screen w-full items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-4">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<p className="text-sm font-medium text-muted-foreground">
					Sincronizando com o Arkhiveon Musical...
				</p>
			</div>
		</div>
	);
}
