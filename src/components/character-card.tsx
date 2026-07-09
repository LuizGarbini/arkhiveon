import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CharacterImageDialog } from "@/components/character-image-dialog";
import { useToast } from "@/components/ui/toast";
import { resolveCharacterImageUrl } from "@/lib/character-images";
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

const getPresetUrl = (charClass: string) => {
	const c = charClass.toLowerCase();
	if (
		c.includes("warrior") ||
		c.includes("guerreiro") ||
		c.includes("fighter") ||
		c.includes("barbarian") ||
		c.includes("paladin")
	)
		return "/presets/warrior.png";
	if (
		c.includes("mage") ||
		c.includes("mago") ||
		c.includes("wizard") ||
		c.includes("sorcerer") ||
		c.includes("warlock")
	)
		return "/presets/mage.png";
	if (
		c.includes("rogue") ||
		c.includes("ladino") ||
		c.includes("ranger") ||
		c.includes("assassin")
	)
		return "/presets/rogue.png";
	if (
		c.includes("cleric") ||
		c.includes("clérigo") ||
		c.includes("priest") ||
		c.includes("druid") ||
		c.includes("monk")
	)
		return "/presets/cleric.png";
	if (
		c.includes("vampire") ||
		c.includes("vampiro") ||
		c.includes("necromancer")
	)
		return "/presets/vampire.png";
	if (
		c.includes("detective") ||
		c.includes("detetive") ||
		c.includes("investigator")
	)
		return "/presets/detective.png";
	return "/presets/warrior.png"; // default fallback
};

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
			<div className="relative flex h-[360px] flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-5 shadow-lg animate-pulse">
				{/* Top header skeleton */}
				<div className="space-y-2.5 pt-1">
					<div className="h-5 w-1/2 rounded-md bg-white/10" />
					<div className="h-3 w-1/3 rounded-md bg-white/5" />
					<div className="h-4 w-1/4 rounded-md bg-white/5 mt-1" />
				</div>
				{/* Bottom stats skeleton */}
				<div className="flex items-center justify-between border-t border-white/5 pt-4">
					<div className="flex gap-4">
						<div className="space-y-1">
							<div className="h-5 w-8 rounded bg-white/10" />
							<div className="h-2 w-10 rounded bg-white/5" />
						</div>
						<div className="space-y-1">
							<div className="h-5 w-8 rounded bg-white/10" />
							<div className="h-2 w-10 rounded bg-white/5" />
						</div>
						<div className="space-y-1">
							<div className="h-5 w-12 rounded bg-white/10" />
							<div className="h-2 w-10 rounded bg-white/5" />
						</div>
					</div>
					<div className="h-7 w-20 rounded-full bg-white/15" />
				</div>
			</div>
		);
	}

	const currentCharacter = character;

	const characterImageUrl = resolveCharacterImageUrl(
		currentCharacter,
		imageAssetLookup,
		activeCampaignRole,
	);
	const characterName = currentCharacter.characterName || "Sem nome";

	function handleDeleteCharacter() {
		removeCharacter(currentCharacter.id);
		toast.success({
			title: "Personagem excluído com sucesso",
			description: `${characterName} foi removido da campanha.`,
		});
	}

	const imageUrl = characterImageUrl || getPresetUrl(currentCharacter.class || "");

	return (
		<>
			<Link
				to="/sheets/$characterId"
				params={{ characterId: character.id }}
				className="group relative flex h-[360px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-purple-500/40 hover:shadow-purple-500/10 active:scale-[0.985]"
			>
				{/* Imagem de Fundo (Full Bleed) */}
				<div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
					<img
						src={imageUrl}
						alt={characterName}
						loading="lazy"
						className="h-full w-full object-cover object-center opacity-70 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
					/>
					{/* Gradiente superior para o cabeçalho */}
					<div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
					{/* Gradiente inferior para as estatísticas */}
					<div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/70 to-transparent" />
				</div>

				{/* Ações (Editar/Excluir) */}
				<div className="absolute right-2 top-2 z-20">
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

				{/* Cabeçalho do Card */}
				<div className="p-4 pt-5">
					<h3 className="font-display truncate text-xl font-bold tracking-tight text-white drop-shadow-sm">
						{characterName}
					</h3>
					<div className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
						<span className="truncate">{currentCharacter.race || "Sem raça"}</span>
						{currentCharacter.class && (
							<>
								<span className="opacity-50">·</span>
								<span className="truncate">{currentCharacter.class}</span>
							</>
						)}
					</div>
					<div className="mt-2 flex items-center gap-2">
						<span className="rounded bg-purple-500/25 border border-purple-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-200">
							{systemLabel(character.system)}
						</span>
						<span className="text-[10px] text-white/50">
							Lv {character.level}
						</span>
					</div>
				</div>

				{/* Estatísticas e Botão na Base (Inspirado na imagem) */}
				<div className="p-4 pb-5 space-y-4">
					<div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4">
						{/* Estatísticas */}
						<div className="flex gap-4">
							<div className="flex flex-col">
								<span className="text-lg font-bold text-white leading-none">
									{character.armorClass || 10}
								</span>
								<span className="text-[9px] text-white/50 uppercase tracking-wider mt-1">
									Defesa (CA)
								</span>
							</div>
							<div className="flex flex-col">
								<span className="text-lg font-bold text-white leading-none">
									{formatModifier(character.initiative)}
								</span>
								<span className="text-[9px] text-white/50 uppercase tracking-wider mt-1">
									Iniciativa
								</span>
							</div>
							<div className="flex flex-col">
								<span className="text-lg font-bold text-white leading-none">
									{character.health}/{character.healthMax || 10}
								</span>
								<span className="text-[9px] text-white/50 uppercase tracking-wider mt-1">
									Pontos Vida
								</span>
							</div>
						</div>

						{/* Botão de Ação */}
						<button
							type="button"
							className="rounded-full bg-white/85 px-4 py-1.5 text-xs font-semibold text-black shadow-md backdrop-blur-md transition-all hover:bg-white hover:shadow-lg active:scale-95 whitespace-nowrap"
						>
							Abrir Ficha
						</button>
					</div>
				</div>
			</Link>

			<CharacterImageDialog
				character={currentCharacter}
				open={isImageDialogOpen}
				onOpenChange={setIsImageDialogOpen}
				onChange={(patch) => updateCharacter(currentCharacter.id, patch)}
			/>
		</>
	);
}
