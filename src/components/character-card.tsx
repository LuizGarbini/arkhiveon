import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, Heart, Shield, Zap } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { CharacterImageDialog } from "@/components/character-image-dialog";
import { FramedImage } from "@/components/framed-image";
import { useToast } from "@/components/ui/toast";
import { resolveCharacterImageUrl } from "@/lib/character-images";
import { getCharacterPresetUrl } from "@/lib/character-presets";
import {
	type Character,
	formatModifier,
	systemLabel,
	useActiveCampaignRole,
	useImageAssetLookup,
	useRPGStore,
} from "@/lib/store";
import { EntityActions } from "./entity-actions";

interface CharacterCardProps {
	character?: Character;
	isLoading?: boolean;
}

export function CharacterCard({ character, isLoading }: CharacterCardProps) {
	const removeCharacter = useRPGStore((s) => s.removeCharacter);
	const updateCharacter = useRPGStore((s) => s.updateCharacter);
	const imageAssetLookup = useImageAssetLookup();
	const activeCampaignRole = useActiveCampaignRole();
	const navigate = useNavigate();
	const toast = useToast();
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

	if (isLoading || !character) {
		return (
			<div className="relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card-elevated shadow-sm animate-pulse">
				<div className="aspect-[5/4] w-full bg-muted/40 sm:aspect-[4/3]" />
				<div className="grid grid-cols-3 gap-1.5 px-3.5 pb-3.5 pt-3.5">
					{["ca", "ini", "hp"].map((key) => (
						<div
							key={key}
							className="h-11 rounded-xl bg-muted/35 ring-1 ring-border/40"
						/>
					))}
				</div>
			</div>
		);
	}

	const characterImageUrl = resolveCharacterImageUrl(
		character,
		imageAssetLookup,
		activeCampaignRole,
	);
	const hasCustomImage = Boolean(characterImageUrl);
	const characterName = character.characterName || "Sem nome";
	const imageUrl =
		characterImageUrl || getCharacterPresetUrl(character.class || "");
	const isViewer = activeCampaignRole === "viewer";
	const metaLine = [character.race || "Sem raça", character.class || null]
		.filter(Boolean)
		.join(" · ");

	const stats = [
		{
			value: character.armorClass || 10,
			label: "CA",
			full: "Defesa (CA)",
			Icon: Shield,
		},
		{
			value: formatModifier(character.initiative),
			label: "Ini",
			full: "Iniciativa",
			Icon: Zap,
		},
		{
			value: `${character.health}/${character.healthMax || 10}`,
			label: "PV",
			full: "Pontos de Vida",
			Icon: Heart,
		},
	] as const;

	function handleDeleteCharacter() {
		if (!character) return;
		removeCharacter(character.id);
		toast.success({
			title: "Personagem excluído com sucesso",
			description: `${characterName} foi removido da campanha.`,
		});
	}

	function openImageDialog(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		setIsImageDialogOpen(true);
	}

	return (
		<>
			<div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card-elevated shadow-sm shadow-black/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.985]">
				<Link
					to="/sheets/$characterId"
					params={{ characterId: character.id }}
					search={{ edit: !isViewer }}
					className="absolute inset-0 z-0 cursor-pointer"
					aria-label={
						isViewer
							? `Abrir ficha de ${characterName}`
							: `Editar ficha de ${characterName}`
					}
				/>

				<div className="pointer-events-auto relative z-30">
					<EntityActions
						onEdit={() =>
							void navigate({
								to: "/sheets/$characterId",
								params: { characterId: character.id },
								search: { edit: true },
							})
						}
						onDelete={handleDeleteCharacter}
						entityName={characterName}
						entityKindLabel="personagem"
					/>
				</div>

				<div className="pointer-events-none relative z-10 aspect-[5/4] w-full shrink-0 overflow-hidden bg-linear-to-br from-primary/20 via-primary/5 to-transparent sm:aspect-[4/3]">
					{hasCustomImage ? (
						<FramedImage
							src={imageUrl}
							alt={characterName}
							framing={character}
							loading="lazy"
							decoding="async"
							imgClassName="opacity-[0.92] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
						/>
					) : (
						<img
							src={imageUrl}
							alt=""
							aria-hidden
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover object-top opacity-[0.92] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
						/>
					)}

					<div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/55 via-black/20 to-transparent" />

					{!isViewer && (
						<button
							type="button"
							onClick={openImageDialog}
							className="pointer-events-auto absolute top-2.5 left-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-black/40 text-white/85 opacity-100 shadow-sm backdrop-blur-md transition duration-200 hover:border-primary/50 hover:text-primary md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
							aria-label={
								hasCustomImage
									? "Editar imagem do personagem"
									: "Adicionar imagem do personagem"
							}
							title={hasCustomImage ? "Editar imagem" : "Adicionar imagem"}
						>
							<Camera className="h-3.5 w-3.5" />
						</button>
					)}

					<div className="absolute inset-x-0 bottom-0 z-20 p-4 pt-12">
						<div className="relative min-w-0 max-w-[92%]">
							{/* Local elliptical shadow behind title + tags only */}
							<div
								aria-hidden
								className="absolute -left-6 -right-2 -top-8 -bottom-5 z-0"
								style={{
									background:
										"radial-gradient(ellipse 70% 95% at 12% 80%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 38%, rgba(0,0,0,0.12) 58%, transparent 74%)",
								}}
							/>
							<div className="relative z-10 space-y-2">
								<div className="min-w-0 pr-1">
									<h3
										className="font-display truncate text-[17px] font-bold tracking-tight text-white transition-colors duration-250 group-hover:text-primary"
										style={{
											textShadow:
												"0 1px 2px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.5)",
										}}
									>
										{characterName}
									</h3>
									<p
										className="mt-0.5 truncate text-xs text-white/85"
										style={{
											textShadow: "0 1px 3px rgba(0,0,0,0.85)",
										}}
									>
										{metaLine}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-1.5">
									<span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/30 backdrop-blur-sm">
										{systemLabel(character.system)}
									</span>
									<span className="font-mono rounded bg-black/45 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
										Nv. {character.level}
									</span>
									{character.playerName ? (
										<span className="truncate rounded bg-black/35 px-1.5 py-0.5 text-[9px] font-medium text-white/75 ring-1 ring-white/10 backdrop-blur-sm">
											{character.playerName}
										</span>
									) : null}
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="pointer-events-none relative z-10 grid grid-cols-3 gap-1.5 px-3.5 pb-3.5 pt-3.5">
					{stats.map((stat) => (
						<div
							key={stat.full}
							title={stat.full}
							className="flex items-center gap-1.5 rounded-xl bg-background/50 px-2 py-2 ring-1 ring-border/60 transition-colors duration-200 group-hover:ring-border/80"
						>
							<stat.Icon
								className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80"
								strokeWidth={1.75}
							/>
							<div className="min-w-0">
								<div className="font-mono truncate text-[11px] font-bold tabular-nums leading-none text-foreground">
									{stat.value}
								</div>
								<div className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
									{stat.label}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<CharacterImageDialog
				character={character}
				open={isImageDialogOpen}
				onOpenChange={setIsImageDialogOpen}
				onChange={(patch) => updateCharacter(character.id, patch)}
			/>
		</>
	);
}
