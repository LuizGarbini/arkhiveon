import { Link, useNavigate } from "@tanstack/react-router";
import { Camera } from "lucide-react";
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
				<div className="relative z-10 pointer-events-none flex h-full flex-col justify-between">
					<div className="pointer-events-auto">
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

					{!isViewer && (
						<button
							type="button"
							onClick={openImageDialog}
							className="absolute bottom-36 right-3 z-20 flex h-8 w-8 pointer-events-auto items-center justify-center rounded-lg border border-white/15 bg-black/45 text-white opacity-100 backdrop-blur transition hover:border-primary/40 hover:text-primary md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
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

					<div className="p-4 pt-5">
						<h3 className="font-display truncate text-xl font-bold tracking-tight text-white drop-shadow-sm">
							{characterName}
						</h3>
						<div className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
							<span className="truncate">{character.race || "Sem raça"}</span>
							{character.class ? (
								<>
									<span className="opacity-50">·</span>
									<span className="truncate">{character.class}</span>
								</>
							) : null}
						</div>
						<div className="mt-2 flex items-center gap-2">
							<span className="rounded border border-primary/30 bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
								{systemLabel(character.system)}
							</span>
							<span className="text-[10px] text-white/50">
								Nv. {character.level}
							</span>
						</div>
					</div>

					<div className="space-y-4 p-4 pb-5">
						<div className="flex flex-col gap-3 border-t border-white/10 pt-4">
							<div className="grid grid-cols-3 gap-2 text-center">
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
									<div key={stat.label} className="flex flex-col">
										<span className="truncate text-base font-bold leading-none text-white">
											{stat.value}
										</span>
										<span className="mt-1.5 text-[8px] uppercase tracking-wider text-white/50">
											{stat.label}
										</span>
									</div>
								))}
							</div>

							<div className="pointer-events-auto">
								<span className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-white/10 bg-white/10 text-xs font-medium text-white backdrop-blur-md transition-colors duration-200 group-hover:border-white/15 group-hover:bg-white/15">
									Abrir ficha
								</span>
							</div>
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
