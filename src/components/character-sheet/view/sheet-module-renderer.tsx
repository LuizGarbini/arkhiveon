import { BookOpen, Eye, Heart, Shield, Sparkles, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { CharacterInventoryModule } from "@/components/character-inventory-module";
import { SkillsFieldsReadOnly } from "@/components/character-sheet/fields";
import { CharacterTrainingFields } from "@/components/character-training-fields";
import { CustomSheetRenderer } from "@/components/custom-sheet-renderer";
import {
	calculateEffectiveHealthMax,
	calculateHitPointPercentage,
	calculateProficiencyBonus,
	formatModifier,
} from "@/core/rules";
import type { Character, SheetModuleConfig, Spell } from "@/lib/store";
import {
	getAttributeExtraInfo,
	getAttributeFullName,
	useRPGStore,
} from "@/lib/store";
import { getFeatsLabel, type SYSTEM_CONFIG } from "@/lib/systems";
import { FeatRow, InfoRow, SpellRow, TextBlock } from "./ui-primitives";
import { WeaponAttacksSection } from "./weapon-attacks";

export function SheetModuleContent({
	module,
	character,
	config,
}: {
	module: SheetModuleConfig;
	character: Character;
	config: (typeof SYSTEM_CONFIG)[keyof typeof SYSTEM_CONFIG];
}) {
	const updateCharacter = useRPGStore((state) => state.updateCharacter);
	const customFields =
		config.customFields?.filter((f) => f.section === module.kind) || [];

	if (module.kind === "custom_template_fields") {
		return (
			<CustomSheetRenderer
				templateId={character.customTemplateId || character.system}
				register={
					(() => ({})) as unknown as import("react-hook-form").UseFormRegister<
						import("@/components/character-sheet/fields").CharacterFormValues
					>
				}
				viewMode
				character={character}
			/>
		);
	}

	if (module.kind === "identity") {
		return (
			<div className="grid gap-3">
				<div className="grid grid-cols-2 gap-3">
					<InfoRow label="Nível" value={String(character.level || 1)} />
					<InfoRow label="XP" value={String(character.xp || 0)} />
				</div>
				<InfoRow
					label="Jogador"
					value={character.playerName || "Não informado"}
				/>
				<InfoRow label="Raça" value={character.race || "Não informada"} />
				<InfoRow label="Classe" value={character.class || "Não informada"} />
				<InfoRow
					label="Antecedente / Origem"
					value={character.background || "Não informado"}
				/>
				<InfoRow
					label="Alinhamento"
					value={character.alignment || "Não informado"}
				/>
				<TextBlock
					title="Aparência"
					value={character.appearance || "Não informada"}
				/>
			</div>
		);
	}

	if (module.kind === "abilities") {
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

		const abilities = (config.attributes || []).map((attr) => {
			const charProp = attr.key as keyof Character;
			const val = isStandardKey(attr.key)
				? Number(character[charProp]) || 10
				: Number(character.systemAttributes?.[attr.key]) || 10;
			return { label: attr.label, value: val };
		});

		return (
			<div
				className={`grid gap-3 ${abilities.length >= 8 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}
			>
				{abilities.map((ability) => {
					const fullName = getAttributeFullName(ability.label);
					const extra = getAttributeExtraInfo(ability.value, character.system);
					return (
						<div
							key={ability.label}
							className="rounded-2xl border border-border/70 bg-background/45 p-3 text-center transition-all hover:bg-background/70"
						>
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								{ability.label}
							</p>
							<p className="font-display mt-1 text-2xl font-bold text-foreground">
								{ability.value}
							</p>
							{extra && (
								<p className="mt-0.5 text-[11px] font-bold text-primary">
									{extra}
								</p>
							)}
							<p className="text-[9px] text-muted-foreground/80 truncate">
								{fullName}
							</p>
						</div>
					);
				})}
			</div>
		);
	}

	if (module.kind === "skills") {
		const pb = calculateProficiencyBonus(character.level || 1);
		return (
			<SkillsFieldsReadOnly
				character={character}
				proficiencyBonus={character.proficiencyBonus || pb}
			/>
		);
	}

	if (module.kind === "combat") {
		const effectiveHealthMax = calculateEffectiveHealthMax({
			baseHealthMax: character.healthMax || 0,
			level: character.level,
			featsList: character.featsList,
			system: character.system,
		});
		const toughBonus = effectiveHealthMax - (character.healthMax || 0);
		const hpPercent = calculateHitPointPercentage(
			character.health,
			effectiveHealthMax,
		);

		return (
			<div className="grid gap-4">
				<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
					<div className="flex items-end justify-between gap-3">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Pontos de Vida
							</p>
							<p className="font-display mt-1 text-4xl font-bold text-rose-400">
								{character.health}
								<span className="text-lg text-muted-foreground">
									/{effectiveHealthMax}
								</span>
								{toughBonus > 0 && (
									<span className="text-[10px] font-bold uppercase tracking-wider text-primary ml-2 bg-primary/10 px-1.5 py-0.5 rounded">
										+{toughBonus} de Robusto
									</span>
								)}
							</p>
						</div>
						<Heart className="h-5 w-5 text-rose-400" />
					</div>
					<div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-rose-400 transition-all duration-500"
							style={{ width: `${hpPercent}%` }}
						/>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					<MetricCard Icon={Shield} label="CA" value={character.armorClass} />
					<MetricCard
						Icon={Zap}
						label="Iniciativa"
						value={formatModifier(character.initiative)}
					/>
					<MetricCard
						Icon={Sparkles}
						label="Deslocamento"
						value={`${character.speed}${config.speedUnit}`}
					/>
					{customFields.map((field) => (
						<MetricCard
							key={field.key}
							Icon={Sparkles}
							label={field.label}
							value={character.systemFields?.[field.key] || "-"}
						/>
					))}
				</div>
				{character.tempHealth ? (
					<div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300">
						HP Temporário: <strong>{character.tempHealth}</strong>
					</div>
				) : null}
				{character.system === "dnd5e" && (
					<WeaponAttacksSection character={character} />
				)}
			</div>
		);
	}

	if (module.kind === "sanity") {
		return (
			<div className="grid gap-3 sm:grid-cols-2">
				<MetricCard
					Icon={Eye}
					label="Sanidade"
					value={`${character.sanity ?? 50}/${character.sanityMax ?? 99}`}
				/>
				<MetricCard
					Icon={Sparkles}
					label="Pontos de Magia / Esforço"
					value={`${character.effort ?? 0}/${character.effortMax ?? 0}`}
				/>
				{customFields.map((field) => (
					<MetricCard
						key={field.key}
						Icon={Sparkles}
						label={field.label}
						value={character.systemFields?.[field.key] || "-"}
					/>
				))}
			</div>
		);
	}

	if (module.kind === "magic") {
		const spellsList = (character.spellsList || []) as Spell[];
		const spellsByLevel = spellsList.reduce<Record<number, Spell[]>>(
			(acc, spell) => {
				const lvl = spell.level ?? 0;
				if (!acc[lvl]) acc[lvl] = [];
				acc[lvl].push(spell);
				return acc;
			},
			{},
		);
		const sortedLevels = Object.keys(spellsByLevel)
			.map(Number)
			.sort((a, b) => a - b);

		return (
			<div className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-2">
					<InfoRow
						label="Habilidade de Conjuração"
						value={character.spellAbility || "Não informada"}
					/>
					<InfoRow
						label="CD da Magia"
						value={character.spellSaveDc ? String(character.spellSaveDc) : "-"}
					/>
					<InfoRow
						label="Bônus de Ataque Mágico"
						value={
							character.spellAttackBonus !== undefined &&
							character.spellAttackBonus !== null
								? formatModifier(character.spellAttackBonus)
								: "-"
						}
					/>
				</div>
				{customFields.length > 0 && (
					<div className="grid gap-3 sm:grid-cols-2">
						{customFields.map((field) => (
							<InfoRow
								key={field.key}
								label={field.label}
								value={character.systemFields?.[field.key] || "-"}
							/>
						))}
					</div>
				)}

				<div className="mt-4 pt-4 border-t border-border/40 space-y-4">
					<h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
						<Sparkles className="h-4 w-4 text-primary" />
						Grimório de Magias ({spellsList.length})
					</h4>

					{spellsList.length === 0 ? (
						<p className="text-xs text-muted-foreground italic">
							Nenhuma magia adicionada à ficha ainda. Edite o módulo para
							adicionar magias do compêndio.
						</p>
					) : (
						<div className="space-y-4">
							{sortedLevels.map((lvl) => {
								const levelSpells = spellsByLevel[lvl];
								const label =
									lvl === 0 ? "Truques (Nível 0)" : `${lvl}º Círculo / Nível`;
								return (
									<div key={lvl} className="space-y-1.5">
										<div className="text-[11px] font-bold text-primary uppercase tracking-wider">
											{label} ({levelSpells.length})
										</div>
										<div className="grid gap-1.5">
											{levelSpells.map((spell) => (
												<SpellRow key={spell.id} spell={spell} />
											))}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		);
	}

	if (module.kind === "feats") {
		const featsList = character.featsList || [];
		const featsLabel = getFeatsLabel(character.system);

		return (
			<div className="space-y-4">
				{customFields.length > 0 && (
					<div className="grid gap-3 sm:grid-cols-2">
						{customFields.map((field) => (
							<InfoRow
								key={field.key}
								label={field.label}
								value={character.systemFields?.[field.key] || "-"}
							/>
						))}
					</div>
				)}

				<div className="space-y-3">
					<h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
						<BookOpen className="h-4 w-4 text-primary" />
						{featsLabel} Selecionados ({featsList.length})
					</h4>

					{featsList.length === 0 ? (
						<p className="text-xs text-muted-foreground italic">
							Nenhum {featsLabel.toLowerCase()} adicionado à ficha ainda. Edite
							o módulo para adicionar talentos do compêndio.
						</p>
					) : (
						<div className="grid gap-2">
							{featsList.map((feat) => (
								<FeatRow key={feat.id} feat={feat} />
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	if (module.kind === "inventory") {
		return (
			<div className="space-y-6">
				<CharacterInventoryModule
					character={character}
					onUpdateCharacter={(patch) => updateCharacter(character.id, patch)}
				/>
				<div className="pt-4 border-t border-border/40">
					<CharacterTrainingFields
						character={character}
						onUpdateCharacter={(patch) => updateCharacter(character.id, patch)}
					/>
				</div>
			</div>
		);
	}

	if (module.kind === "personality") {
		return (
			<div className="grid gap-3">
				<TextBlock
					title="Traços de Personalidade"
					value={character.personalityTraits || "Não informados"}
				/>
				<TextBlock
					title="Ideais"
					value={character.ideals || "Não informados"}
				/>
				<TextBlock
					title="Vínculos"
					value={character.bonds || "Não informados"}
				/>
				<TextBlock
					title="Defeitos"
					value={character.flaws || "Não informados"}
				/>
			</div>
		);
	}

	if (module.kind === "notes") {
		return (
			<div className="space-y-3">
				<TextBlock
					title="Anotações Gerais"
					value={character.notes || "Sem anotações"}
				/>
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key] || "-"}
					/>
				))}
			</div>
		);
	}

	if (module.kind === "customText") {
		return (
			<TextBlock
				title={module.title}
				value={module.content || "Sem conteúdo"}
			/>
		);
	}

	if (module.kind === "customStats") {
		return (
			<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
				<p className="text-sm text-muted-foreground">
					{module.content || "Bloco de status personalizado"}
				</p>
			</div>
		);
	}

	return null;
}

function MetricCard({
	Icon,
	label,
	value,
}: {
	Icon: ComponentType<{ className?: string }>;
	label: string;
	value?: string | number | null;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground truncate">
					{label}
				</span>
				<Icon className="h-4 w-4 text-primary shrink-0" />
			</div>
			<p className="font-display mt-2 text-xl font-bold text-foreground">
				{value ?? "-"}
			</p>
		</div>
	);
}
