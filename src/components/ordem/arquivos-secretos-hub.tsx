import {
	BookOpen,
	Download,
	Eye,
	FileText,
	Image as ImageIcon,
	MapPin,
	Music,
	Pause,
	Play,
	Skull,
	Volume2,
} from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import {
	ARQUIVOS_SECRETOS_MEDIA,
	ARQUIVOS_SECRETOS_TOKENS,
	type ArquivosSecretosMedia,
	ORDEM_AMEACAS_SEED,
} from "@/lib/ordem/presets";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

const FALLBACK_ASSET_IMAGE = "/presets/detective.png";

export type ArquivosSecretosTab =
	| "suplementos"
	| "tokens"
	| "mapas"
	| "audio"
	| "bestiario";

interface ArquivosSecretosHubProps {
	initialTab?: ArquivosSecretosTab;
}

export function ArquivosSecretosHub({
	initialTab = "suplementos",
}: ArquivosSecretosHubProps) {
	const [activeTab, setActiveTab] = useState<ArquivosSecretosTab>(initialTab);
	const [selectedPdf, setSelectedPdf] = useState<ArquivosSecretosMedia | null>(
		null,
	);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
	const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
		null,
	);
	const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
	const [availableAssets, setAvailableAssets] = useState<
		Record<string, boolean>
	>({});

	useEffect(() => {
		setActiveTab(initialTab);
	}, [initialTab]);

	useEffect(() => {
		return () => {
			currentAudio?.pause();
		};
	}, [currentAudio]);

	useEffect(() => {
		if (typeof fetch !== "function") return;

		let cancelled = false;
		const paths = Array.from(
			new Set(ARQUIVOS_SECRETOS_MEDIA.map((m) => m.path)),
		);

		void Promise.all(
			paths.map(async (path) => {
				try {
					const response = await fetch(encodeURI(path), { method: "HEAD" });
					return [path, response.ok] as const;
				} catch {
					return [path, false] as const;
				}
			}),
		).then((entries) => {
			if (cancelled) return;
			setAvailableAssets(Object.fromEntries(entries));
		});

		return () => {
			cancelled = true;
		};
	}, []);

	function isAssetAvailable(path: string) {
		return availableAssets[path] === true;
	}

	function handleImageFallback(event: SyntheticEvent<HTMLImageElement>) {
		if (event.currentTarget.src.endsWith(FALLBACK_ASSET_IMAGE)) return;
		event.currentTarget.src = FALLBACK_ASSET_IMAGE;
	}

	function toggleAudio(item: ArquivosSecretosMedia) {
		if (!isAssetAvailable(item.path)) return;

		if (playingAudioId === item.id) {
			currentAudio?.pause();
			setPlayingAudioId(null);
			return;
		}

		if (currentAudio) {
			currentAudio.pause();
		}

		const audio = new Audio(encodeURI(item.path));
		void audio.play().catch(() => {
			setCurrentAudio(null);
			setPlayingAudioId(null);
		});
		setCurrentAudio(audio);
		setPlayingAudioId(item.id);

		audio.onended = () => {
			setPlayingAudioId(null);
		};
	}

	const pdfs = ARQUIVOS_SECRETOS_MEDIA.filter(
		(m) => m.type === "pdf" || m.type === "hq",
	);
	const audioTracks = ARQUIVOS_SECRETOS_MEDIA.filter((m) => m.type === "audio");
	const mapas = ARQUIVOS_SECRETOS_MEDIA.filter((m) => m.type === "mapa");

	return (
		<div className="space-y-6">
			{/* Cabeçalho */}
			<div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card-elevated/40 p-6 backdrop-blur-md">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
						<BookOpen className="h-5 w-5" />
					</div>
					<div>
						<h2 className="font-display text-xl font-bold tracking-tight text-foreground">
							Central Arquivos Secretos (AS1 - AS7)
						</h2>
						<p className="text-xs text-muted-foreground">
							Suplementos oficiais, HQs, mapas de combate, trilhas sonoras,
							ameaças paranormais e tokens de Ordem Paranormal.
						</p>
					</div>
				</div>

				{/* Abas */}
				<div className="flex flex-wrap gap-2 pt-4 border-t border-border/60">
					<Button
						variant={activeTab === "suplementos" ? "default" : "outline"}
						size="sm"
						onClick={() => setActiveTab("suplementos")}
						className="gap-2 text-xs"
					>
						<FileText className="h-3.5 w-3.5" />
						Suplementos & HQs ({pdfs.length})
					</Button>
					<Button
						variant={activeTab === "tokens" ? "default" : "outline"}
						size="sm"
						onClick={() => setActiveTab("tokens")}
						className="gap-2 text-xs"
					>
						<ImageIcon className="h-3.5 w-3.5" />
						Tokens & Avatares ({ARQUIVOS_SECRETOS_TOKENS.length})
					</Button>
					<Button
						variant={activeTab === "mapas" ? "default" : "outline"}
						size="sm"
						onClick={() => setActiveTab("mapas")}
						className="gap-2 text-xs"
					>
						<MapPin className="h-3.5 w-3.5" />
						Mapas de Combate ({mapas.length})
					</Button>
					<Button
						variant={activeTab === "bestiario" ? "default" : "outline"}
						size="sm"
						onClick={() => setActiveTab("bestiario")}
						className="gap-2 text-xs"
					>
						<Skull className="h-3.5 w-3.5" />
						Bestiário & Ameaças ({ORDEM_AMEACAS_SEED.length})
					</Button>
					<Button
						variant={activeTab === "audio" ? "default" : "outline"}
						size="sm"
						onClick={() => setActiveTab("audio")}
						className="gap-2 text-xs"
					>
						<Music className="h-3.5 w-3.5" />
						Trilhas Sonoras ({audioTracks.length})
					</Button>
				</div>
			</div>

			{/* Conteúdo: Suplementos */}
			{activeTab === "suplementos" && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{pdfs.map((pdf) => {
						const available = isAssetAvailable(pdf.path);
						return (
							<div
								key={pdf.id}
								className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
							>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary border border-primary/20">
											{pdf.edition}
										</span>
										<span className="text-[11px] text-muted-foreground capitalize">
											{pdf.type === "hq" ? "Quadrinho / HQ" : "Suplemento PDF"}
										</span>
									</div>
									<h3 className="font-display text-sm font-semibold text-foreground line-clamp-1">
										{pdf.title}
									</h3>
									{!available ? (
										<p className="text-[11px] leading-relaxed text-muted-foreground">
											Arquivo oficial não encontrado no pacote local.
										</p>
									) : null}
								</div>

								<div className="flex gap-2 pt-4 border-t border-border/40 mt-4">
									<Button
										variant="secondary"
										size="sm"
										className="flex-1 text-xs gap-1.5"
										disabled={!available}
										onClick={() => setSelectedPdf(pdf)}
									>
										<Eye className="h-3.5 w-3.5" />
										{available ? "Ler PDF" : "Indisponível"}
									</Button>
									{available ? (
										<a
											href={encodeURI(pdf.path)}
											download
											target="_blank"
											rel="noreferrer"
											className={cn(
												buttonVariants({ variant: "outline", size: "sm" }),
												"text-xs",
											)}
											aria-label={`Baixar ${pdf.title}`}
										>
											<Download className="h-3.5 w-3.5" />
										</a>
									) : (
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="text-xs"
											disabled
											aria-label={`Download indisponível para ${pdf.title}`}
										>
											<Download className="h-3.5 w-3.5" />
										</Button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Conteúdo: Tokens */}
			{activeTab === "tokens" && (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
					{ARQUIVOS_SECRETOS_TOKENS.map((token) => (
						<div
							key={token.id}
							className="group relative flex flex-col items-center rounded-xl border border-border/70 bg-card p-3 text-center transition-all hover:border-primary/50 hover:bg-card-elevated/80"
						>
							<div className="relative mb-2 h-20 w-20 overflow-hidden rounded-full border-2 border-primary/40 bg-background/80 shadow-inner group-hover:scale-105 transition-transform">
								<img
									src={encodeURI(token.imageUrl)}
									alt={token.name}
									className="h-full w-full object-cover"
									loading="lazy"
									onError={handleImageFallback}
								/>
							</div>
							<span className="font-display text-xs font-semibold text-foreground line-clamp-1">
								{token.name}
							</span>
							<span className="text-[10px] text-muted-foreground uppercase tracking-wider">
								{token.edition} • {token.category}
							</span>

							<Button
								variant="ghost"
								size="sm"
								className="mt-2 w-full text-[11px] h-7 gap-1"
								onClick={() => setSelectedImage(token.imageUrl)}
							>
								<Eye className="h-3 w-3" />
								Ampliar
							</Button>
						</div>
					))}
				</div>
			)}

			{/* Conteúdo: Mapas */}
			{activeTab === "mapas" && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{mapas.map((mapa) => (
						<div
							key={mapa.id}
							className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:border-primary/50"
						>
							<div className="relative h-48 w-full overflow-hidden bg-background">
								<img
									src={encodeURI(mapa.path)}
									alt={mapa.title}
									className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
									onError={handleImageFallback}
								/>
								<div
									className="pointer-events-none absolute inset-0 opacity-55 mix-blend-screen"
									style={{
										backgroundImage:
											"linear-gradient(rgba(251, 113, 133, 0.42) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 113, 133, 0.42) 1px, transparent 1px)",
										backgroundSize: "32px 32px",
									}}
								/>
								<span className="absolute left-3 top-3 rounded-md border border-rose-200/25 bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-50 backdrop-blur">
									Grid ativo
								</span>
							</div>
							<div className="flex items-center justify-between p-4 bg-card-elevated/50">
								<div>
									<h4 className="font-display text-sm font-semibold text-foreground">
										{mapa.title}
									</h4>
									<span className="text-[10px] text-muted-foreground uppercase">
										{mapa.edition} {mapa.variant ? `• ${mapa.variant}` : ""}
									</span>
								</div>
								<Button
									variant="secondary"
									size="sm"
									className="text-xs gap-1.5"
									onClick={() => setSelectedImage(mapa.path)}
								>
									<Eye className="h-3.5 w-3.5" />
									Ver Mapa
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Conteúdo: Bestiário */}
			{activeTab === "bestiario" && (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{ORDEM_AMEACAS_SEED.map((entry) => (
						<div
							key={entry.id}
							className="group overflow-hidden rounded-xl border border-rose-500/25 bg-[linear-gradient(135deg,rgba(24,24,27,0.92),rgba(76,5,25,0.62))] shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300/55"
						>
							<div className="relative h-40 overflow-hidden bg-black/35">
								<img
									src={encodeURI(entry.imageUrl)}
									alt={entry.name}
									className="h-full w-full object-cover opacity-75 transition-transform duration-300 group-hover:scale-105"
									loading="lazy"
									onError={handleImageFallback}
								/>
								<div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/85 to-transparent" />
								<span className="absolute left-3 top-3 rounded-md border border-rose-200/25 bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-50 backdrop-blur">
									VD {entry.vd}
								</span>
							</div>
							<div className="space-y-3 p-4">
								<div>
									<h3 className="font-display text-sm font-bold text-white">
										{entry.name}
									</h3>
									<p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-100/72">
										{entry.elemento} - {entry.tipo}
									</p>
								</div>
								<p className="text-[12px] leading-relaxed text-rose-50/70">
									{entry.description}
								</p>
								<div className="grid grid-cols-3 gap-2 rounded-lg bg-black/25 p-2 text-center text-[10px]">
									<span>
										PV <strong>{entry.pv}</strong>
									</span>
									<span>
										DEF <strong>{entry.defesa}</strong>
									</span>
									<span>
										RD <strong>{entry.rd}</strong>
									</span>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="w-full border-rose-200/25 bg-white/5 text-xs text-rose-50 hover:bg-rose-500/15 hover:text-white"
									onClick={() => setSelectedImage(entry.imageUrl)}
								>
									<Eye className="h-3.5 w-3.5" />
									Ver token
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Conteúdo: Trilhas Sonoras */}
			{activeTab === "audio" && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{audioTracks.map((track) => {
						const isPlaying = playingAudioId === track.id;
						const available = isAssetAvailable(track.path);
						return (
							<div
								key={track.id}
								className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
									isPlaying
										? "border-primary bg-primary/10 shadow-sm"
										: "border-border/70 bg-card hover:border-primary/40"
								}`}
							>
								<div className="flex items-center gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
										<Volume2 className="h-4 w-4" />
									</div>
									<div>
										<h4 className="font-display text-xs font-semibold text-foreground">
											{track.title}
										</h4>
										<span className="text-[10px] text-muted-foreground uppercase">
											{track.edition} •{" "}
											{available ? "Áudio de Mesa" : "Arquivo local ausente"}
										</span>
									</div>
								</div>

								<Button
									variant={isPlaying ? "default" : "outline"}
									size="sm"
									className="h-8 w-8 rounded-full p-0"
									disabled={!available}
									onClick={() => toggleAudio(track)}
								>
									{isPlaying ? (
										<Pause className="h-4 w-4" />
									) : (
										<Play className="h-4 w-4 ml-0.5" />
									)}
								</Button>
							</div>
						);
					})}
				</div>
			)}

			{/* Modal de Leitura de PDF */}
			<Dialog
				open={Boolean(selectedPdf)}
				onOpenChange={() => setSelectedPdf(null)}
			>
				<DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col">
					<DialogHeader className="border-b border-border px-6 py-4">
						<DialogTitle className="font-display text-base flex items-center justify-between">
							<span>{selectedPdf?.title}</span>
							<a
								href={encodeURI(selectedPdf?.path || "")}
								download
								target="_blank"
								rel="noreferrer"
								className={cn(
									buttonVariants({ variant: "ghost", size: "sm" }),
									"gap-1.5",
								)}
							>
								<Download className="h-4 w-4" /> Download PDF
							</a>
						</DialogTitle>
					</DialogHeader>
					<div className="flex-1 bg-background/95">
						{selectedPdf && (
							<iframe
								src={encodeURI(selectedPdf.path)}
								title={selectedPdf.title}
								className="h-full w-full border-none"
							/>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Modal de Zoom de Imagem/Mapa */}
			<Dialog
				open={Boolean(selectedImage)}
				onOpenChange={() => setSelectedImage(null)}
			>
				<DialogContent className="max-w-4xl max-h-[90vh] p-2 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden">
					{selectedImage && (
						<img
							src={encodeURI(selectedImage)}
							alt="Visualização"
							className="max-h-[80vh] w-auto rounded-lg object-contain"
							onError={handleImageFallback}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
