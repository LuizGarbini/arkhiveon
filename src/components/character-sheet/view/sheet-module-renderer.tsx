import { Eye, Shield, Sparkles, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { CharacterInventoryModule } from "@/components/character-inventory-module";
import { SkillsFieldsReadOnly } from "@/components/character-sheet/fields";
import { CharacterTrainingFields } from "@/components/character-training-fields";
import { CustomSheetRenderer } from "@/components/custom-sheet-renderer";
import {
	armorClassCaption,
	calculateEffectiveHealthMax,
	calculateHitPointPercentage,
	calculateProficiencyBonus,
	characterAttributeScore,
	describeSpellOrigin,
	explainArmorClass,
	explainInitiative,
	formatModifier,
	formatSpeed,
	initiativeCaption,
	isWeaponAbilityKey,
	speedUnitOf,
} from "@/core/rules";
import type { Character, SheetModuleConfig, Spell } from "@/lib/store";
import {
	getAttributeExtraInfo,
	getAttributeFullName,
	useActiveCampaignRole,
	useRPGStore,
} from "@/lib/store";
import type { SYSTEM_CONFIG } from "@/lib/systems";
import { useCombatStats } from "../use-linked-items";
import { CombatMetricCard } from "./combat-metric-detail";
import { SheetConnectionsModule } from "./sheet-connections-module";
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
	const activeCampaignRole = useActiveCampaignRole();
	const combat = useCombatStats(character);
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
		const details = [
			{ label: "Jogador", value: character.playerName },
			{ label: "Raça", value: character.race },
			{ label: "Classe", value: character.class },
			{ label: "Origem", value: character.background },
			{ label: "Alinhamento", value: character.alignment },
		];
		return (
			<div className="space-y-3">
				<div>
					<InfoRow label="Nível" value={character.level || 1} />
					<InfoRow label="XP" value={character.xp || 0} />
					{details.map(({ label, value }) =>
						value?.trim() ? (
							<InfoRow key={label} label={label} value={value} />
						) : null,
					)}
				</div>
				{character.appearance?.trim() && (
					<TextBlock title="Aparência" value={character.appearance} />
				)}
			</div>
		);
	}

	if (module.kind === "abilities") {
		const abilities = (config.attributes || []).map((attr) => {
			const base = characterAttributeScore(character, attr.key);
			// Só os seis atributos clássicos recebem bônus de itens.
			const withItems = isWeaponAbilityKey(attr.key)
				? combat.abilities[attr.key]
				: undefined;
			return {
				label: attr.label,
				value: withItems?.total ?? base,
				base,
				fromItems: withItems?.delta ?? 0,
			};
		});

		return (
			<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] gap-px overflow-hidden rounded-lg border border-border/60 bg-border/50">
				{abilities.map((ability) => {
					const fullName = getAttributeFullName(ability.label);
					const extra = getAttributeExtraInfo(ability.value, character.system);
					return (
						<div
							key={ability.label}
							className="min-w-0 bg-card px-2 py-3 text-center"
						>
							<p className="text-xs text-muted-foreground">{fullName}</p>
							<p className="mt-1 font-display text-2xl font-bold text-foreground tabular-nums">
								{ability.value}
							</p>
							{ability.fromItems !== 0 && (
								<p
									className="text-[10px] font-semibold text-muted-foreground tabular-nums"
									title="Valor da ficha e quanto os itens equipados mudam"
								>
									<span className="line-through">{ability.base}</span>{" "}
									<span>{formatModifier(ability.fromItems)} de itens</span>
								</p>
							)}
							{extra && (
								<p className="mt-0.5 text-[11px] font-bold text-primary">
									{extra}
								</p>
							)}
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
				scores={combat.scores}
				savesBonus={combat.saves.total}
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
				<div className="rounded-lg border border-border/60 bg-card p-4">
					<div className="flex items-end justify-between gap-3">
						<div>
							<p className="text-xs font-medium text-muted-foreground">
								Pontos de vida
							</p>
							<p className="mt-1 font-display text-3xl font-bold text-foreground tabular-nums">
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
					</div>
					<div
						aria-hidden="true"
						className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
					>
						<div
							className="h-full rounded-full bg-primary transition-[width] duration-150 motion-reduce:transition-none"
							style={{ width: `${hpPercent}%` }}
						/>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					<CombatMetricCard
						Icon={Shield}
						label="CA"
						value={String(combat.ac.total)}
						caption={armorClassCaption(combat.ac)}
						stat={combat.ac}
						explanation={explainArmorClass(combat.ac)}
						detailTitle={`CA ${combat.ac.total}`}
						detailSubtitle="Classe de armadura"
					/>
					<CombatMetricCard
						Icon={Zap}
						label="Iniciativa"
						value={formatModifier(combat.initiative.total)}
						caption={initiativeCaption(combat.initiative)}
						stat={combat.initiative}
						explanation={explainInitiative(combat.initiative)}
						detailTitle={`Iniciativa ${formatModifier(combat.initiative.total)}`}
						detailSubtitle="Quem age primeiro no combate"
					/>
					<MetricCard
						Icon={Sparkles}
						label="Deslocamento"
						value={formatSpeed(
							combat.speed.total,
							speedUnitOf(character, config.speedUnit),
						)}
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
					<div className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground">
						PV temporários:{" "}
						<strong className="text-foreground tabular-nums">
							{character.tempHealth}
						</strong>
					</div>
				) : null}
				{character.system === "dnd5e" && (
					<WeaponAttacksSection
						character={character}
						itemsById={combat.itemsById}
					/>
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
				<div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
					<InfoRow
						label="Atributo de conjuração"
						value={
							character.spellAbility
								? getAttributeFullName(character.spellAbility)
								: "—"
						}
					/>
					<InfoRow
						label="CD das magias"
						value={
							combat.spellDc.total > 0 || combat.spellDc.parts.length > 0
								? String(combat.spellDc.total)
								: "-"
						}
						notes={combat.spellDc.parts.map((part) =>
							describeSpellOrigin("dc", part),
						)}
					/>
					<InfoRow
						label="Ataque mágico"
						value={
							character.spellAttackBonus !== undefined &&
							character.spellAttackBonus !== null
								? formatModifier(combat.spellAttack.total)
								: "-"
						}
						notes={combat.spellAttack.parts.map((part) =>
							describeSpellOrigin("attack", part),
						)}
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
					{spellsList.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhuma magia na ficha.
						</p>
					) : (
						<div className="space-y-4">
							{sortedLevels.map((lvl) => {
								const levelSpells = spellsByLevel[lvl];
								const label = lvl === 0 ? "Truques" : `Nível ${lvl}`;
								return (
									<div key={lvl} className="space-y-1.5">
										<h3 className="text-sm font-semibold text-foreground">
											{label}
										</h3>
										<div className="space-y-0.5">
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

				{featsList.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Nenhum registro nesta seção.
					</p>
				) : (
					<div className="space-y-0.5">
						{featsList.map((feat) => (
							<FeatRow key={feat.id} feat={feat} />
						))}
					</div>
				)}
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

	if (module.kind === "connections") {
		return (
			<SheetConnectionsModule
				character={character}
				onUpdateCharacter={(patch) => updateCharacter(character.id, patch)}
				canEdit={activeCampaignRole !== "viewer"}
			/>
		);
	}

	if (module.kind === "notes") {
		return (
			<div className="space-y-3">
				<p
					className={
						character.notes?.trim()
							? "whitespace-pre-wrap text-sm leading-relaxed text-foreground"
							: "text-sm text-muted-foreground"
					}
				>
					{character.notes?.trim() ? character.notes : "Sem anotações."}
				</p>
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
		// O título já está no cabeçalho do módulo (SheetModuleCard).
		return (
			<p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
				{module.content || "Sem conteúdo"}
			</p>
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
				<span className="text-xs font-medium text-muted-foreground truncate">
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
