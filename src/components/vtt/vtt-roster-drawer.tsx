import { Link } from "@tanstack/react-router";
import {
	Crosshair,
	FileText,
	Maximize2,
	Plus,
	Search,
	Skull,
	Users,
	X,
} from "lucide-react";
import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import { ImageViewer } from "@/components/images/image-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	useMapUpload,
	VTTMapDropzone,
	type VTTMapImage,
} from "@/components/vtt/vtt-map-dropzone";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
	characterSheetOwnsHp,
	resolveTokenHp,
	selectSheetHealth,
	selectSheetHealthMax,
	visibleHpLabel,
} from "@/lib/vtt/character-hp";
import { findFreeCell } from "@/lib/vtt/grid-math";
import { dragHasFiles } from "@/lib/vtt/map-upload";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { canViewScopedContent } from "@/lib/worldbuilding/visibility";

interface Props {
	scene: VTTScene | null;
	onSpawnToken: (data: Partial<VTTToken>) => Promise<void>;
	onFocusPoint: (x: number, y: number) => void;
	onSetSceneMap: (sceneId: string, map: VTTMapImage) => Promise<void>;
}
export function VTTRosterDrawer({
	scene,
	onSpawnToken,
	onFocusPoint,
	onSetSceneMap,
}: Props) {
	const open = useVTTStore((s) => s.showRosterDrawer);
	const close = useVTTStore((s) => s.setShowRosterDrawer);
	const isGM = useVTTStore((s) => s.isGM);
	const tokens = useVTTStore((s) => s.tokens);
	const characters = useRPGStore((s) => s.characters);
	const npcs = useRPGStore((s) => s.npcs);
	const campaigns = useRPGStore((s) => s.campaigns);
	const campaignId = useRPGStore((s) => s.activeCampaignId);
	const campaign = campaigns.find((c) => c.id === scene?.campaignId);
	const [tab, setTab] = useState<
		"scene" | "characters" | "npcs" | "custom" | "map"
	>("scene");
	const [query, setQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const term = query.trim();
	const clearSearch = () => {
		setQuery("");
		searchInputRef.current?.focus();
	};
	const searchEmpty = <SearchEmpty term={term} onClear={clearSearch} />;
	const search = useDeferredValue(query.trim().toLocaleLowerCase());
	const [pending, setPending] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const formId = useId();
	const [name, setName] = useState("");
	const [hp, setHp] = useState(25);
	const [size, setSize] = useState(1);
	const visibleCharacters = useMemo(
		() =>
			campaignId === scene?.campaignId
				? characters.filter((c) =>
						c.characterName.toLocaleLowerCase().includes(search),
					)
				: [],
		[characters, campaignId, scene?.campaignId, search],
	);
	const visibleNpcs = useMemo(
		() =>
			npcs.filter(
				(n) =>
					canViewScopedContent(n, campaign, campaign?.myRole, campaigns) &&
					n.name.toLocaleLowerCase().includes(search),
			),
		[npcs, campaign, campaigns, search],
	);
	const visibleTokens = useMemo(
		() =>
			tokens.filter(
				(t) =>
					(isGM || (!t.isHidden && t.layer !== "gm")) &&
					t.name.toLocaleLowerCase().includes(search),
			),
		[tokens, isGM, search],
	);
	if (!open || !scene) return null;

	async function spawn(id: string, data: Partial<VTTToken>) {
		if (!scene || !isGM || pending) return;
		setPending(id);
		setError(null);
		const { viewport, tokens: sceneTokens } = useVTTStore.getState();
		const sizeCells = data.sizeCells ?? 1;
		const position = findFreeCell(
			{
				x: Math.max(
					scene.gridSize,
					Math.min(
						(window.innerWidth / 2 - viewport.x) / viewport.scale,
						scene.width - scene.gridSize,
					),
				),
				y: Math.max(
					scene.gridSize,
					Math.min(
						(window.innerHeight / 2 - viewport.y) / viewport.scale,
						scene.height - scene.gridSize,
					),
				),
			},
			sceneTokens.filter((t) => t.sceneId === scene.id),
			{
				gridType: scene.gridType,
				gridSize: scene.gridSize,
				sizeCells,
				bounds: { width: scene.width, height: scene.height },
			},
		);
		try {
			await onSpawnToken({
				...data,
				...position,
				sceneId: scene.id,
				layer: "token",
			});
			if (id === "custom") setName("");
			setTab("scene");
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Não foi possível colocar o token. Tente novamente.",
			);
		} finally {
			setPending(null);
		}
	}
	const tabs: { id: typeof tab; label: string }[] = [
		{ id: "scene", label: "Na cena" },
		{ id: "characters", label: "Fichas" },
		...(isGM
			? [
					{ id: "npcs" as const, label: "NPCs" },
					{ id: "custom" as const, label: "Criar" },
					{ id: "map" as const, label: "Mapa" },
				]
			: []),
	];
	return (
		<aside
			aria-label="Biblioteca da mesa"
			data-vtt-overlay="open"
			onDragEnter={(event) => {
				// A file dragged over the library opens the map tab, where it lands.
				if (isGM && tab !== "map" && dragHasFiles(event.dataTransfer.types)) {
					setTab("map");
					setError(null);
				}
			}}
			className="absolute right-3 top-32 bottom-20 z-40 flex w-[min(24rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-xl backdrop-blur-md"
		>
			<div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
						Sua campanha, à mão
					</p>
					<h2 className="mt-1 font-display text-lg font-bold">
						Biblioteca da mesa
					</h2>
				</div>
				<Button
					variant="ghost"
					aria-label="Fechar biblioteca"
					className="size-11 shrink-0 px-0"
					onClick={() => close(false)}
				>
					<X className="size-4" />
				</Button>
			</div>
			<nav
				aria-label="Conteúdo da biblioteca"
				className="flex gap-1 border-b border-border/70 p-2"
			>
				{tabs.map((item) => (
					<button
						type="button"
						key={item.id}
						aria-pressed={tab === item.id}
						onClick={() => {
							setTab(item.id);
							setError(null);
						}}
						className={cn(
							"min-h-11 flex-1 rounded-xl px-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]",
							tab === item.id
								? "bg-primary/15 text-primary"
								: "text-muted-foreground hover:bg-accent",
						)}
					>
						{item.label}
					</button>
				))}
			</nav>
			{error && (
				<p role="alert" className="px-4 pt-3 text-sm text-destructive">
					{error}
				</p>
			)}
			{tab !== "custom" && tab !== "map" && (
				<div className="relative m-4">
					<Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
					<Input
						ref={searchInputRef}
						aria-label="Buscar na biblioteca"
						placeholder="Buscar na biblioteca…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="h-11 pl-9 text-base"
					/>
				</div>
			)}
			<div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
				{tab === "scene" && (
					<>
						<p className="mb-3 text-xs leading-relaxed text-muted-foreground">
							Encontre um token no mapa ou abra sua ficha.{" "}
							<span className="sm:hidden">
								Toque no token para selecionar e editar.
							</span>
							<span className="hidden sm:inline">
								Clique duas vezes ou use o botão direito no token para editar.
							</span>
						</p>
						{visibleTokens.map((token) => (
							<div
								key={token.id}
								className="flex items-center gap-2 rounded-xl border border-border/70 bg-card-elevated p-2"
							>
								<button
									type="button"
									onClick={() => {
										onFocusPoint(token.x, token.y);
										close(false);
									}}
									aria-label={`Localizar ${token.name}`}
									className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-primary"
								>
									<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-primary">
										{token.name.slice(0, 2).toUpperCase()}
									</span>
									<span className="min-w-0">
										<span className="block truncate text-sm font-semibold">
											{token.name}
										</span>
										<span className="text-xs tabular-nums text-muted-foreground">
											{rosterHpText(token, characters, isGM)}
											{token.layer === "gm" || token.isHidden
												? " · Oculto"
												: ""}
										</span>
									</span>
									<Crosshair className="ml-auto size-4 shrink-0 text-muted-foreground" />
								</button>
								{token.characterId && (
									<Link
										to="/sheets/$characterId"
										params={{ characterId: token.characterId }}
										target="_blank"
										rel="noopener noreferrer"
										aria-label={`Abrir ficha de ${token.name} em outra aba`}
										className="flex size-11 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-accent focus-visible:ring-2"
									>
										<FileText className="size-4" />
									</Link>
								)}
							</div>
						))}
						{visibleTokens.length === 0 && term ? searchEmpty : null}
						{visibleTokens.length === 0 && !term && (
							<div className="rounded-xl border border-dashed border-border/70 p-5 text-center">
								<Users className="mx-auto mb-3 size-7 text-primary" />
								<p className="text-sm font-medium">
									A cena está pronta para seu grupo
								</p>
								<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
									{isGM
										? "Coloque personagens da campanha ou crie um token para começar."
										: "Aguarde o mestre colocar os personagens na cena."}
								</p>
								{isGM && (
									<Button
										variant="outline"
										className="mt-4 h-11"
										onClick={() => setTab("characters")}
									>
										Escolher personagens
									</Button>
								)}
							</div>
						)}
					</>
				)}
				{tab === "characters" && (
					<>
						{visibleCharacters.map((char) => (
							<div
								key={char.id}
								className="rounded-xl border border-border/70 bg-card-elevated p-3"
							>
								<div className="flex items-center gap-3">
									<Users className="size-5 shrink-0 text-primary" />
									<div className="min-w-0">
										<h3 className="truncate text-sm font-semibold">
											{char.characterName}
										</h3>
										<p className="text-xs text-muted-foreground">
											{char.class} · {char.health ?? "—"}/
											{char.healthMax ?? "—"} PV
										</p>
									</div>
								</div>
								<div className="mt-3 flex gap-2">
									<Link
										to="/sheets/$characterId"
										params={{ characterId: char.id }}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border/70 text-xs font-medium focus-visible:ring-2"
									>
										<FileText className="size-4" />
										Abrir ficha ↗
									</Link>
									{isGM && (
										<Button
											disabled={pending !== null}
											className="h-11"
											onClick={() => {
												const ownsSheet = characterSheetOwnsHp(char);
												void spawn(char.id, {
													characterId: char.id,
													name: char.characterName,
													avatarUrl: char.imageUrl,
													hpCurrent: ownsSheet ? null : char.health,
													hpMax: ownsSheet ? null : char.healthMax,
												});
											}}
										>
											<Plus className="size-4" />
											Colocar
										</Button>
									)}
								</div>
							</div>
						))}
						{visibleCharacters.length === 0 && term ? searchEmpty : null}
						{visibleCharacters.length === 0 && !term && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								Nenhuma ficha disponível nesta campanha.
							</p>
						)}
					</>
				)}
				{tab === "npcs" && isGM && (
					<>
						{visibleNpcs.map((npc) => (
							<div
								key={npc.id}
								className="flex items-center gap-3 rounded-xl border border-border/70 bg-card-elevated p-3"
							>
								<Skull className="size-5 shrink-0 text-primary" />
								<div className="min-w-0 flex-1">
									<h3 className="truncate text-sm font-semibold">{npc.name}</h3>
									<p className="truncate text-xs text-muted-foreground">
										{npc.role || npc.kind}
									</p>
								</div>
								<Button
									disabled={pending !== null}
									className="h-11"
									onClick={() =>
										void spawn(npc.id, {
											npcId: npc.id,
											name: npc.name,
											avatarUrl: npc.imageUrl,
										})
									}
								>
									Colocar
								</Button>
							</div>
						))}
						{visibleNpcs.length === 0 && term ? searchEmpty : null}
						{visibleNpcs.length === 0 && !term && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								Nenhum NPC disponível nesta campanha.
							</p>
						)}
					</>
				)}
				{tab === "map" && isGM && (
					<SceneMapTab scene={scene} onSetSceneMap={onSetSceneMap} />
				)}
				{tab === "custom" && isGM && (
					<form
						className="space-y-4 pt-4"
						onSubmit={(e) => {
							e.preventDefault();
							if (name.trim())
								void spawn("custom", {
									name: name.trim(),
									hpCurrent: hp,
									hpMax: hp,
									sizeCells: size,
								});
						}}
					>
						<p className="text-sm leading-relaxed text-muted-foreground">
							Crie um figurante ou criatura para este encontro.
						</p>
						<div className="space-y-2">
							<label htmlFor={`${formId}-name`} className="text-sm font-medium">
								Nome
							</label>
							<Input
								id={`${formId}-name`}
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								className="h-11 text-base"
								placeholder="Ex.: Guardião das ruínas"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<label htmlFor={`${formId}-hp`} className="text-sm">
									Pontos de vida
								</label>
								<Input
									id={`${formId}-hp`}
									type="number"
									min={1}
									required
									value={hp}
									onChange={(e) => setHp(Number(e.target.value))}
									className="h-11 text-base"
								/>
							</div>
							<div className="space-y-2">
								<label htmlFor={`${formId}-size`} className="text-sm">
									Tamanho (células)
								</label>
								<Input
									id={`${formId}-size`}
									type="number"
									min={0.5}
									max={10}
									step={0.5}
									required
									value={size}
									onChange={(e) => setSize(Number(e.target.value))}
									className="h-11 text-base"
								/>
							</div>
						</div>
						<Button
							type="submit"
							disabled={pending !== null}
							className="h-11 w-full"
						>
							<Plus className="size-4" />
							{pending ? "Colocando…" : "Colocar na cena"}
						</Button>
					</form>
				)}
			</div>
			<p className="border-t border-border/70 px-4 py-3 text-[11px] text-muted-foreground">
				{scene.name} · {isGM ? "Visão do mestre" : "Visão do jogador"}
			</p>
		</aside>
	);
}

export function SceneMapTab({
	scene,
	onSetSceneMap,
}: {
	scene: VTTScene;
	onSetSceneMap: Props["onSetSceneMap"];
}) {
	const [applied, setApplied] = useState<string | null>(null);
	const isGM = useVTTStore((s) => s.isGM);
	const [viewerOpen, setViewerOpen] = useState(false);
	const viewerOpenerRef = useRef<HTMLElement | null>(null);
	const openViewer = (opener: HTMLElement) => {
		viewerOpenerRef.current = opener;
		setViewerOpen(true);
	};
	const upload = useMapUpload(scene.campaignId, async (map) => {
		setApplied(null);
		await onSetSceneMap(scene.id, map);
		setApplied(map.name);
	});
	const current: VTTMapImage | null = scene.mapImageUrl
		? {
				url: scene.mapImageUrl,
				width: scene.width,
				height: scene.height,
				name: "Mapa atual",
			}
		: null;
	return (
		<div className="space-y-4 pt-4">
			<p className="text-sm leading-relaxed text-muted-foreground">
				{current
					? `Troque o mapa de “${scene.name}”. Os tokens ficam onde estão.`
					: `“${scene.name}” ainda não tem mapa. Envie uma imagem para começar.`}
			</p>
			<VTTMapDropzone
				campaignId={scene.campaignId}
				upload={upload}
				value={current}
				label={`Enviar mapa da cena ${scene.name}`}
				// Tela cheia do mapa cru: só o mestre (ignora névoa e camada gm).
				onViewFullscreen={isGM ? openViewer : undefined}
				viewName={scene.name}
			/>
			{isGM && current && (
				<>
					<Button
						type="button"
						variant="outline"
						onClick={(event) => openViewer(event.currentTarget)}
						aria-haspopup="dialog"
						className="h-[48px] w-full justify-start gap-2 rounded-xl text-xs font-semibold"
					>
						<Maximize2 className="h-3.5 w-3.5 text-primary" aria-hidden />
						Ver mapa em tela cheia
					</Button>
					<ImageViewer
						open={viewerOpen}
						onOpenChange={setViewerOpen}
						src={current.url}
						alt={`Mapa de ${scene.name}`}
						title={scene.name}
						finalFocus={viewerOpenerRef}
					/>
				</>
			)}
			{applied && upload.state.status === "idle" && (
				<output className="block text-sm text-primary">
					Mapa aplicado na cena.
				</output>
			)}
		</div>
	);
}

function rosterHpText(
	token: VTTToken,
	characters: Parameters<typeof selectSheetHealth>[0]["characters"],
	isGM: boolean,
): string {
	const hp = resolveTokenHp({
		tokenHpCurrent: token.hpCurrent,
		tokenHpMax: token.hpMax,
		sheetHealth: selectSheetHealth({ characters }, token.characterId),
		sheetHealthMax: selectSheetHealthMax({ characters }, token.characterId),
	});
	if (!hp.fromSheet && token.hpCurrent == null && token.hpMax == null) {
		return "— / — PV";
	}
	return `${visibleHpLabel(hp.current, hp.max, isGM || !hp.fromSheet)} PV`;
}

/**
 * Busca sem resultado (ref. paleta de comandos do Linear): diz o termo e
 * oferece limpar a busca, em vez do vazio de "cena sem tokens".
 */
function SearchEmpty({ term, onClear }: { term: string; onClear: () => void }) {
	return (
		<output className="block rounded-xl border border-dashed border-border/70 p-5 text-center">
			<Search className="mx-auto mb-3 size-7 text-muted-foreground" />
			<p className="break-words text-sm font-medium">
				Nada encontrado para "{term}"
			</p>
			<Button variant="outline" className="mt-4 h-11" onClick={onClear}>
				Limpar busca
			</Button>
		</output>
	);
}
