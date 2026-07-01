import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, Heart, Shield, Sparkles, User, Zap } from "lucide-react";
import { useState } from "react";
import { CharacterImageDialog } from "@/components/character-image-dialog";
import { FramedImage } from "@/components/framed-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { resolveCharacterImageUrl } from "@/lib/character-images";
import {
	abilityModifier,
	type Character,
	formatModifier,
	systemLabel,
	useActiveCampaignRole,
	useImageAssetLookup,
	useRPGStore,
} from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { EntityActions } from "./entity-actions";

interface CharacterCardProps {
	character?: Character;
	isLoading?: boolean;
}

const abilitySkeletonKeys = ["str", "dex", "con", "int", "wis", "cha"];

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
			<div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card-elevated p-0">
				<Skeleton className="h-28 w-full rounded-none" />
				<div className="flex flex-1 flex-col p-4 space-y-4">
					<div className="space-y-2">
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-1.5 w-full rounded-full" />
					</div>
					<div className="grid grid-cols-3 gap-1.5">
						<Skeleton className="h-10 w-full rounded-md" />
						<Skeleton className="h-10 w-full rounded-md" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
					<div className="grid grid-cols-6 gap-1 border-t border-border/60 pt-3">
						{abilitySkeletonKeys.map((key) => (
							<div key={key} className="flex flex-col items-center gap-1">
								<Skeleton className="h-2 w-4" />
								<Skeleton className="h-3 w-6" />
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	const currentCharacter = character;
	const hpPercent = currentCharacter.healthMax
		? Math.min(
				100,
				Math.round(
					(currentCharacter.health / currentCharacter.healthMax) * 100,
				),
			)
		: 0;

	const sysConfig =
		SYSTEM_CONFIG[currentCharacter.system] ?? SYSTEM_CONFIG.dnd5e;
	const isStandardKey = (key: string) =>
		[
			"strength",
			"dexterity",
			"constitution",
			"intelligence",
			"wisdom",
			"charisma",
			"power",
			"size",
			"education",
		].includes(key);

	const abilities = (sysConfig.attributes || []).map((attr) => {
		const val = isStandardKey(attr.key)
			? (currentCharacter as any)[attr.key]
			: (currentCharacter.systemAttributes?.[attr.key] ?? 0);
		return { label: attr.label, value: Number(val) || 0 };
	});

	const characterImageUrl = resolveCharacterImageUrl(
		currentCharacter,
		imageAssetLookup,
		activeCampaignRole,
	);
	const hasImage = !!characterImageUrl;
	const characterName = currentCharacter.characterName || "Sem nome";

	function handleDeleteCharacter() {
		removeCharacter(currentCharacter.id);
		toast.success({
			title: "Personagem excluído com sucesso",
			description: `${characterName} foi removido da campanha.`,
		});
	}

	return (
		<>
			<Link
				to="/sheets/$characterId"
				params={{ characterId: character.id }}
				className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 bg-card-elevated shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0"
			>
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

				{/* Banner com imagem ou padrão */}
				<div className="relative h-28 w-full shrink-0 overflow-hidden bg-linear-to-br from-primary/15 via-fuchsia-500/10 to-transparent">
					{hasImage ? (
						<FramedImage
							src={characterImageUrl}
							alt={character.characterName}
							framing={currentCharacter}
							loading="lazy"
							decoding="async"
							imgClassName="opacity-90 transition-transform duration-500 group-hover:scale-105"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-primary/30">
							<User className="h-12 w-12" strokeWidth={1.4} />
						</div>
					)}
					{/* Camera overlay button */}
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setIsImageDialogOpen(true);
						}}
						className={`absolute inset-0 flex items-center justify-center text-white transition focus:outline-none ${
							hasImage
								? "bg-black/0 opacity-0 hover:bg-black/50 hover:opacity-100 focus:bg-black/50 focus:opacity-100"
								: "bg-black/0 opacity-0 hover:bg-black/40 hover:opacity-100 focus:bg-black/40 focus:opacity-100"
						}`}
						aria-label="Editar imagem do personagem"
					>
						<Camera className="h-6 w-6 drop-shadow" />
					</button>
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-card to-transparent" />
					{/* Persistent camera hint when no image */}
					{!hasImage && (
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setIsImageDialogOpen(true);
							}}
							className="absolute bottom-8 right-2 flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1 text-[10px] font-semibold text-muted-foreground backdrop-blur transition hover:border-primary/40 hover:text-primary"
							aria-label="Adicionar imagem"
						>
							<Camera className="h-3 w-3" />
							Adicionar foto
						</button>
					)}
					<div className="absolute right-2 bottom-2 flex h-8 min-w-8 items-center justify-center rounded-xl bg-background/85 px-1.5 backdrop-blur ring-1 ring-border/70">
						<span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
							Lv
						</span>
						<span className="ml-1 font-display text-[13px] font-extrabold leading-none text-foreground">
							{character.level}
						</span>
					</div>
				</div>

				<div className="flex flex-1 flex-col p-4">
					<div className="min-w-0">
						<h3 className="font-display truncate text-[15px] font-bold leading-tight text-foreground">
							{character.characterName || "Sem nome"}
						</h3>
						<div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
							{character.race && <span>{character.race}</span>}
							{character.class && (
								<>
									<span className="text-primary/40">·</span>
									<span>{character.class}</span>
								</>
							)}
							{character.subclass && (
								<>
									<span className="text-primary/40">·</span>
									<span className="truncate">{character.subclass}</span>
								</>
							)}
						</div>
						<div className="mt-1.5 flex items-center gap-1.5">
							<span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary ring-1 ring-primary/15">
								{systemLabel(character.system)}
							</span>
							{character.alignment && (
								<span className="text-[10px] text-muted-foreground/80">
									{character.alignment}
								</span>
							)}
						</div>
					</div>

					{/* HP */}
					<div className="mt-3">
						<div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
							<span className="flex items-center gap-1">
								<Heart className="h-2.5 w-2.5 text-rose-400" />
								HP
							</span>
							<span className="font-mono tabular-nums text-foreground/80">
								{character.health}/{character.healthMax}
							</span>
						</div>
						<div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								className="absolute inset-y-0 left-0 rounded-full bg-rose-400 transition-all duration-500"
								style={{ width: `${hpPercent}%` }}
							/>
						</div>
					</div>

					{/* Quick stats */}
					<div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
						<MiniStat
							Icon={Shield}
							color="text-blue-300"
							label="CA"
							value={character.armorClass}
						/>
						<MiniStat
							Icon={Zap}
							color="text-amber-300"
							label="INI"
							value={formatModifier(character.initiative)}
						/>
						<MiniStat
							Icon={Sparkles}
							color="text-violet-300"
							label="XP"
							value={character.xp}
						/>
					</div>

					{/* Abilities row */}
					<div
						className={`mt-3 grid gap-1 border-t border-border/60 pt-3 ${abilities.length >= 8 ? "grid-cols-4 sm:grid-cols-4" : abilities.length === 9 ? "grid-cols-3" : "grid-cols-6"}`}
					>
						{abilities.map((a) => {
							const mod = abilityModifier(a.value);
							return (
								<div
									key={a.label}
									className="flex flex-col items-center"
									title={`${a.label} ${a.value}`}
								>
									<span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
										{a.label}
									</span>
									<span className="font-mono text-[11px] font-bold tabular-nums text-foreground">
										{a.value}
									</span>
									<span className="font-mono text-[9px] tabular-nums text-primary">
										{formatModifier(mod)}
									</span>
								</div>
							);
						})}
					</div>

					{character.background && (
						<p className="mt-3 line-clamp-2 border-t border-border/60 pt-2.5 text-[11px] italic text-muted-foreground">
							"{character.background}"
						</p>
					)}
				</div>
			</Link>
			<CharacterImageDialog
				character={character}
				open={isImageDialogOpen}
				onOpenChange={setIsImageDialogOpen}
				onChange={(patch) => updateCharacter(character.id, patch)}
			/>
		</>
	);
}

interface MiniStatProps {
	Icon: React.ComponentType<{ className?: string }>;
	color: string;
	label: string;
	value: string | number;
}

function MiniStat({ Icon, color, label, value }: MiniStatProps) {
	return (
		<div className="flex flex-col items-center gap-0.5 rounded-xl bg-background/45 py-1.5 ring-1 ring-border/60">
			<Icon className={`h-3 w-3 ${color}`} />
			<span className="text-[8px] uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<span className="font-mono text-[11px] font-bold tabular-nums leading-none">
				{value}
			</span>
		</div>
	);
}
