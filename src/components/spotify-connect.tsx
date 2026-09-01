import { CheckCircle2, LogOut, Music } from "lucide-react";
import { redirectToSpotifyAuth } from "@/lib/spotify";
import { useRPGStore } from "@/lib/store";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";

export function SpotifyConnect() {
	const token = useRPGStore((s) => s.spotifyToken);
	const user = useRPGStore((s) => s.spotifyUser);
	const logoutSpotify = useRPGStore((s) => s.logoutSpotify);
	const toast = useToast();

	async function handleConnect() {
		try {
			await redirectToSpotifyAuth();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Não foi possível iniciar a conexão com o Spotify.";
			toast.error({
				title: "Configuração do Spotify",
				description: message,
			});
		}
	}

	if (token) {
		return (
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 pl-1 pr-3 py-1 text-[11px] font-medium text-emerald-400">
					{user?.image ? (
						<img
							src={user.image}
							alt={user.name}
							className="h-5 w-5 rounded-full object-cover"
						/>
					) : (
						<CheckCircle2 className="h-3.5 w-3.5 ml-1" />
					)}
					<span className="truncate max-w-[80px]">
						{user?.name || "Conectado"}
					</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => logoutSpotify()}
					className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-[0.98]"
					title="Desconectar Spotify"
				>
					<LogOut className="h-3.5 w-3.5" />
				</Button>
			</div>
		);
	}

	return (
		<Button
			onClick={() => void handleConnect()}
			variant="outline"
			className="h-8 gap-2 border-emerald-500/20 bg-emerald-500/5 px-3 text-[11px] text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors active:scale-[0.98]"
		>
			<Music className="h-3.5 w-3.5" />
			<span>Conectar Spotify</span>
		</Button>
	);
}
