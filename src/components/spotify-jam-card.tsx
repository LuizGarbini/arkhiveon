import {
	Check,
	Copy,
	ExternalLink,
	Music,
	Pause,
	Play,
	RefreshCw,
	Trash2,
	UsersRound,
	Volume1,
	Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentlyPlaying, setSpotifyVolume } from "@/lib/spotify";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SpotifyConnect } from "./spotify-connect";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// Usaremos uma API externa para gerar o QR Code e evitar erros de dependência não instalada
function QRCodePlaceholder({ value, size }: { value: string; size: number }) {
	const [loading, setLoading] = useState(true);
	const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

	return (
		<div className="relative" style={{ width: size, height: size }}>
			{loading && <Skeleton className="absolute inset-0 rounded-sm" />}
			<img
				src={qrUrl}
				alt="QR Code"
				width={size}
				height={size}
				draggable={false}
				className={cn(
					"rounded-sm transition-opacity duration-300",
					loading ? "opacity-0" : "opacity-100",
				)}
				onLoad={() => setLoading(false)}
			/>
		</div>
	);
}

interface SpotifyJamCardProps {
	isDM?: boolean;
}

export function SpotifyJamCard({ isDM = false }: SpotifyJamCardProps) {
	const jamLink = useRPGStore((s) => s.spotifyJamLink);
	const setSpotifyJam = useRPGStore((s) => s.setSpotifyJam);
	const clearSpotifyJam = useRPGStore((s) => s.clearSpotifyJam);

	const spotifyToken = useRPGStore((s) => s.spotifyToken);
	const currentTrack = useRPGStore((s) => s.currentTrack);
	const setCurrentTrack = useRPGStore((s) => s.setCurrentTrack);
	const logoutSpotify = useRPGStore((s) => s.logoutSpotify);

	const jamParticipants = useRPGStore((s) => s.jamParticipants);

	const [inputLink, setInputLink] = useState("");
	const [copied, setCopied] = useState(false);
	const [isLoadingTrack, setIsLoadingTrack] = useState(true);
	const [volume, setVolume] = useState(50);
	const [volumeError, setVolumeError] = useState<string | null>(null);
	const [playbackMessage, setPlaybackMessage] = useState<string | null>(null);
	const volumeTimeoutRef = useRef<number | null>(null);

	const refreshTrack = useCallback(async () => {
		if (!spotifyToken) {
			setIsLoadingTrack(false);
			setCurrentTrack(null);
			setPlaybackMessage(
				"Conecte seu Spotify para mostrar a música da sua Jam.",
			);
			return;
		}

		const accessToken = spotifyToken;

		setIsLoadingTrack(true);
		setPlaybackMessage(null);

		try {
			const data = await getCurrentlyPlaying(accessToken);
			if (!data?.item) {
				setCurrentTrack(null);
				setPlaybackMessage(
					"Não encontrei reprodução ativa. Entre na Jam pelo Spotify e dê play no mesmo usuário conectado aqui.",
				);
				return;
			}

			setCurrentTrack({
				title: data.item.name,
				artist: data.item.artists
					.map((artist: { name: string }) => artist.name)
					.join(", "),
				albumArt: data.item.album.images[0]?.url,
				isPlaying: data.is_playing,
			});
			if (typeof data.device?.volume_percent === "number") {
				setVolume(data.device.volume_percent);
			}
		} catch (error) {
			if (error instanceof Error && error.message === "SPOTIFY_UNAUTHORIZED") {
				logoutSpotify();
				return;
			}
			setCurrentTrack(null);
			setPlaybackMessage(
				"Não consegui ler o playback do Spotify. Reconecte o Spotify e tente novamente.",
			);
			console.error("Erro ao buscar música:", error);
		} finally {
			setIsLoadingTrack(false);
		}
	}, [logoutSpotify, spotifyToken, setCurrentTrack]);

	// Polling para a música atual
	useEffect(() => {
		void refreshTrack();

		if (!spotifyToken) {
			return;
		}

		const interval = setInterval(() => {
			void refreshTrack();
		}, 10000);

		return () => clearInterval(interval);
	}, [refreshTrack, spotifyToken]);

	useEffect(() => {
		if (!spotifyToken && isLoadingTrack) {
			setIsLoadingTrack(false);
		}
	}, [isLoadingTrack, spotifyToken]);

	useEffect(() => {
		return () => {
			if (volumeTimeoutRef.current) {
				window.clearTimeout(volumeTimeoutRef.current);
			}
		};
	}, []);

	function handleVolumeChange(nextVolume: number) {
		setVolume(nextVolume);
		setVolumeError(null);

		if (!spotifyToken) return;
		if (volumeTimeoutRef.current) {
			window.clearTimeout(volumeTimeoutRef.current);
		}

		volumeTimeoutRef.current = window.setTimeout(async () => {
			try {
				await setSpotifyVolume(spotifyToken, nextVolume);
			} catch (error) {
				if (
					error instanceof Error &&
					error.message === "SPOTIFY_UNAUTHORIZED"
				) {
					logoutSpotify();
					return;
				}
				setVolumeError("Abra o Spotify em um dispositivo ativo para ajustar.");
			}
		}, 250);
	}

	function handleSaveJam() {
		if (inputLink.trim()) {
			setSpotifyJam(inputLink.trim());
			setInputLink("");
			void refreshTrack();
		}
	}

	function handleCopy() {
		if (jamLink) {
			navigator.clipboard.writeText(jamLink);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-border/70 bg-card-elevated shadow-xl shadow-black/10">
			<div className="flex items-center justify-between border-b border-border/60 bg-muted/25 px-4 py-3">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
						<Music className="h-4 w-4" />
					</div>
					<div>
						<h3 className="font-display text-sm font-bold text-foreground">
							Spotify Jam
						</h3>
						<p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
							Miniplayer local
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{spotifyToken && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => void refreshTrack()}
							disabled={isLoadingTrack}
							className="h-8 w-8 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400"
							title="Atualizar música"
						>
							<RefreshCw
								className={cn("h-3.5 w-3.5", isLoadingTrack && "animate-spin")}
							/>
						</Button>
					)}
					<SpotifyConnect />
				</div>
			</div>

			<div className="border-b border-border/60 bg-linear-to-br from-emerald-500/10 via-card-elevated to-card-elevated p-4">
				{isLoadingTrack && spotifyToken ? (
					<div className="flex items-center gap-3">
						<Skeleton className="h-14 w-14 rounded-xl shadow-md" />
						<div className="min-w-0 flex-1 space-y-2">
							<Skeleton className="h-2 w-24" />
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-2 w-28" />
						</div>
					</div>
				) : currentTrack ? (
					<div className="flex items-center gap-3">
						<div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-background/60 shadow-md">
							{currentTrack.albumArt ? (
								<img
									src={currentTrack.albumArt}
									alt=""
									className="h-full w-full object-cover"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center text-emerald-400">
									<Music className="h-5 w-5" />
								</div>
							)}
							<div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-emerald-400 ring-1 ring-border/60">
								{currentTrack.isPlaying ? (
									<Play className="h-3 w-3 fill-current" />
								) : (
									<Pause className="h-3 w-3" />
								)}
							</div>
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5">
								<span className="relative flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
								</span>
								<span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500/80">
									Tocando agora
								</span>
							</div>
							<h4 className="mt-1 truncate text-[13px] font-bold leading-tight text-foreground">
								{currentTrack.title}
							</h4>
							<p className="truncate text-[11px] text-muted-foreground">
								{currentTrack.artist}
							</p>
						</div>
					</div>
				) : (
					<div className="rounded-xl border border-dashed border-border/70 bg-background/35 px-4 py-5 text-center">
						<p className="text-[12px] font-bold text-foreground">
							Nada tocando agora
						</p>
						<p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
							{playbackMessage ??
								"Abra o Spotify em um dispositivo para sincronizar o miniplayer."}
						</p>
					</div>
				)}

				<div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border/60 bg-background/45 p-3">
					<div className="min-w-0">
						<div className="mb-2 flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 text-[11px] font-bold text-foreground">
								{volume > 0 ? (
									<Volume2 className="h-3.5 w-3.5 text-emerald-400" />
								) : (
									<Volume1 className="h-3.5 w-3.5 text-muted-foreground" />
								)}
								<span>Volume local</span>
							</div>
							<span className="font-mono text-[10px] text-muted-foreground">
								{volume}%
							</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							value={volume}
							disabled={!spotifyToken}
							onChange={(event) =>
								handleVolumeChange(Number(event.currentTarget.value))
							}
							className="h-1.5 w-full cursor-pointer accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
							aria-label="Volume local do Spotify"
						/>
						{volumeError && (
							<p className="mt-1.5 text-[10px] font-medium text-amber-300">
								{volumeError}
							</p>
						)}
					</div>

					<div className="flex flex-col items-end gap-1">
						<div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
							<UsersRound className="h-3 w-3 text-emerald-400" />
							<span>{jamParticipants.length}</span>
						</div>
						<AvatarGroup className="shrink-0">
							{jamParticipants.slice(0, 3).map((participant) => (
								<Avatar key={participant.id} size="sm" title={participant.name}>
									<AvatarImage src={participant.image} alt={participant.name} />
									<AvatarFallback className="bg-zinc-800 text-[8px] font-bold text-muted-foreground">
										{participant.name
											? participant.name.charAt(0).toUpperCase()
											: "?"}
									</AvatarFallback>
								</Avatar>
							))}
							{jamParticipants.length === 0 && (
								<div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-zinc-800 text-[8px] font-bold text-muted-foreground shadow-sm">
									-
								</div>
							)}
						</AvatarGroup>
					</div>
				</div>
			</div>

			<div className="p-4">
				{!jamLink ? (
					<div className="space-y-4">
						<p className="text-balance text-[12px] leading-relaxed text-muted-foreground">
							{isDM
								? "Inicie uma Jam no Spotify e cole o link aqui para compartilhar a trilha com seus jogadores."
								: "Nenhuma Jam ativa no momento. Aguarde o Mestre iniciar uma sessão musical."}
						</p>

						{isDM && (
							<div className="flex gap-2">
								<Input
									placeholder="https://spotify.link/jam/..."
									value={inputLink}
									onChange={(event) => setInputLink(event.target.value)}
									className="h-9 text-xs"
								/>
								<Button size="sm" onClick={handleSaveJam} className="shrink-0">
									Salvar
								</Button>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center justify-between gap-3">
							<div className="min-w-0">
								<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
									Jam ativa
								</span>
								<span className="block max-w-[250px] truncate text-xs text-muted-foreground">
									{jamLink}
								</span>
							</div>
							{isDM && (
								<Button
									variant="ghost"
									size="icon"
									onClick={clearSpotifyJam}
									className="h-8 w-8 shrink-0 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</div>

						<div className="grid grid-cols-[auto_1fr] gap-4 rounded-xl border border-border/50 bg-background/50 p-3">
							<div className="flex items-center justify-center rounded-lg bg-white p-2 shadow-xl">
								<QRCodePlaceholder value={jamLink} size={92} />
							</div>
							<div className="flex min-w-0 flex-col justify-center gap-3">
								<p className="text-[11px] leading-relaxed text-muted-foreground">
									Escaneie para entrar na Jam ou abra direto no Spotify.
								</p>
								<div className="grid grid-cols-2 gap-2">
									<Button
										variant="outline"
										size="sm"
										className="gap-2 text-[11px]"
										onClick={handleCopy}
									>
										{copied ? (
											<Check className="h-3.5 w-3.5" />
										) : (
											<Copy className="h-3.5 w-3.5" />
										)}
										{copied ? "Copiado" : "Copiar"}
									</Button>
									<a href={jamLink} target="_blank" rel="noopener noreferrer">
										<Button
											variant="secondary"
											size="sm"
											className="w-full gap-2 text-[11px]"
										>
											<ExternalLink className="h-3.5 w-3.5" />
											Abrir
										</Button>
									</a>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
