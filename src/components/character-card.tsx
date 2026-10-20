import { Link, useNavigate } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { CharacterImageDialog } from "@/components/character-image-dialog";
import { FramedImage } from "@/components/framed-image";
import { EntityImageViewer } from "@/components/images/entity-image-viewer";
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
	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
	const imageAssetLookup = useImageAssetLookup();
	const activeCampaignRole = useActiveCampaignRole();
	const navigate = useNavigate();
	const toast = useToast();
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
	const isSystemMismatch = Boolean(
		activeCampaign?.system &&
			character &&
			character.system !== activeCampaign.system,
	);

	if (isLoading || !character) {
		return (
			<div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card-elevated p-5 shadow-sm animate-pulse">
				<div className="space-y-2.5 pt-1">
					<div className="h-5 w-1/2 rounded-md bg-white/10" />
					<div className="h-3 w-1/3 rounded-md bg-white/5" />
					<div className="mt-1 h-4 w-1/4 rounded-md bg-white/5" />
				</div>
				<div className="space-y-3 border-t border-white/5 pt-4">
					<div className="grid grid-cols-3 gap-2 text-center">
						{["ca", "ini", "hp"].map((key) => (
							<div key={key} className="space-y-1">
								<div className="mx-auto h-4 w-8 rounded bg-white/10" />
								<div className="mx-auto h-2 w-10 rounded bg-white/5" />
							</div>
						))}
					</div>
					<div className="h-8 w-full rounded-full bg-white/10" />
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
			<div className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-black/40 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0">
				{/* Accessible anchor covering the entire card background */}
				<Link
					to="/sheets/$characterId"
					params={{ characterId: character.id }}
					className="absolute inset-0 z-0 cursor-pointer"
					aria-label={`Abrir ficha de ${characterName}`}
				/>

				{/* Card Portrait / Preset Image */}
				<div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
					{hasCustomImage ? (
						<FramedImage
							src={imageUrl}
							alt={characterName}
							framing={character}
							loading="lazy"
							decoding="async"
							imgClassName="opacity-70 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
						/>
					) : (
						<img
							src={imageUrl}
							alt=""
							aria-hidden
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover object-center opacity-70 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
						/>
					)}
					<div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/80 via-black/40 to-transparent" />
					<div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-black via-black/70 to-transparent" />
				</div>

				{/* Card Interactive Content Area */}
				<div className="relative z-10 pointer-events-none flex flex-1 flex-col justify-between">
					{/* Top Section: Badges, Actions, Name, Race & Class */}
					<div className="p-4 pt-3.5">
						<div className="pointer-events-auto flex items-start justify-between gap-2">
							<div className="flex flex-wrap items-center gap-1.5">
								<span className="rounded border border-primary/30 bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
									{systemLabel(character.system)}
								</span>
								{isSystemMismatch && (
									<span
										className="rounded border border-amber-500/40 bg-amber-950/70 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 flex items-center gap-1 shadow-xs"
										title={`Mesa configurada para ${systemLabel(activeCampaign?.system ?? "dnd5e")}`}
									>
										⚠️ Sistema diferente
									</span>
								)}
								<span className="text-[10px] text-white/70 font-semibold">
									Nv. {character.level}
								</span>
							</div>

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
								extraActions={
									<>
										<EntityImageViewer
											variant="corner"
											src={characterImageUrl || undefined}
											name={characterName}
										/>
										{!isViewer && (
											<button
												type="button"
												onClick={openImageDialog}
												className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
												aria-label={
													hasCustomImage
														? "Editar imagem do personagem"
														: "Adicionar imagem do personagem"
												}
												title={
													hasCustomImage ? "Editar imagem" : "Adicionar imagem"
												}
											>
												<Camera className="h-3.5 w-3.5" />
											</button>
										)}
									</>
								}
							/>
						</div>

						<div className="mt-2.5">
							<h3 className="font-display truncate text-xl font-bold tracking-tight text-white drop-shadow-md">
								{characterName}
							</h3>
							<div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80 drop-shadow-sm">
								<span className="truncate">{character.race || "Sem raça"}</span>
								{character.class ? (
									<>
										<span className="opacity-50">·</span>
										<span className="truncate">{character.class}</span>
									</>
								) : null}
							</div>
						</div>
					</div>

					{/* Bottom Section: Stats matrix pinned firmly to the bottom */}
					<div className="p-3.5 pb-3.5 bg-linear-to-t from-black/95 via-black/85 to-transparent pt-8">
						<div className="grid grid-cols-3 gap-1.5 text-center">
							{[
								{
									value: character.armorClass || 10,
									label: "Defesa (CA)",
								},
								{
									value: formatModifier(character.initiative),
									label: "Iniciativa",
								},
								{
									value: `${character.health}/${character.healthMax || 10}`,
									label: "Pontos de Vida",
								},
							].map((stat) => (
								<div
									key={stat.label}
									className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur-md shadow-xs transition group-hover:border-white/20"
								>
									<span className="truncate text-sm sm:text-base font-extrabold leading-none text-white drop-shadow-sm">
										{stat.value}
									</span>
									<span className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/60 leading-none">
										{stat.label}
									</span>
								</div>
							))}
						</div>
					</div>
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
