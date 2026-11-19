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
	explainArmorClass,
	explainInitiative,
	formatModifier,
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
import { getFeatsLabel, type SYSTEM_CONFIG } from "@/lib/systems";
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
		return (
			<div className="space-y-3">
				<div className="divide-y divide-border/40">
					<InfoRow label="Nível" value={String(character.level || 1)} />
					<InfoRow label="XP" value={String(character.xp || 0)} />
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
				</div>
				{character.appearance?.trim() && (
					<div className="pt-2 border-t border-border/40">
						<TextBlock title="Aparência" value={character.appearance} />
					</div>
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
			<div
				className={`grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 ${abilities.length >= 8 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}
			>
				{abilities.map((ability) => {
					const fullName = getAttributeFullName(ability.label);
					const extra = getAttributeExtraInfo(ability.value, character.system);
					return (
						<div
							key={ability.label}
							className="bg-background/80 px-2 py-3 text-center"
						>
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								{ability.label}
							</p>
							<p
								className={`font-display mt-1 text-2xl font-bold tabular-nums ${ability.fromItems > 0 ? "text-emerald-300" : "text-foreground"}`}
							>
								{ability.value}
							</p>
							{ability.fromItems !== 0 && (
								<p
									className="text-[10px] font-semibold text-muted-foreground tabular-nums"
									title="Valor da ficha e quanto os itens equipados mudam"
								>
									<span className="line-through">{ability.base}</span>{" "}
									<span
										className={
											ability.fromItems > 0
												? "text-emerald-300"
												: "text-rose-300"
										}
									>
										{ability.fromItems > 0 ? "▲" : "▼"}{" "}
										{Math.abs(ability.fromItems)}
									</span>
								</p>
							)}
							{extra && (
								<p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
									{ability.value}
								</p>
							)}
							<p className="mt-0.5 text-[10px] text-muted-foreground truncate">
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
			<div className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-baseline justify-between gap-3">
						<div className="flex flex-wrap items-baseline gap-2">
							<span className="text-xs font-medium text-muted-foreground">
								Pontos de Vida
							</span>
							{toughBonus > 0 && (
								<span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
									+{toughBonus} de Robusto
								</span>
							)}
							{character.tempHealth ? (
								<span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground tabular-nums">
									+{character.tempHealth} temp
								</span>
							) : null}
						</div>
						<p className="font-display text-2xl font-bold tabular-nums text-foreground">
							{character.health}
							<span className="text-sm font-normal text-muted-foreground">
								{" "}
								/ {effectiveHealthMax}
							</span>
						</p>
					</div>
					<div className="h-1.5 overflow-hidden rounded-full bg-muted">
						<div
							className={`h-full rounded-full transition-all duration-300 ${hpPercent <= 25 ? "bg-rose-500" : "bg-primary"}`}
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
						value={`${combat.speed.total}${speedUnitOf(character, config.speedUnit)}`}
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
				<div className="divide-y divide-border/40">
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
					{customFields.map((field) => (
						<InfoRow
							key={field.key}
							label={field.label}
							value={character.systemFields?.[field.key] || "-"}
						/>
					))}
				</div>

				<div className="pt-3 border-t border-border/40 space-y-3">
					<div className="flex items-baseline gap-2">
						<Sparkles className="h-3.5 w-3.5 text-muted-foreground self-center shrink-0" />
						<h3 className="text-xs font-semibold text-foreground">
							Grimório de Magias
						</h3>
						{spellsList.length > 0 ? (
							<span className="font-mono text-xs text-muted-foreground tabular-nums">
								({spellsList.length})
							</span>
						) : (
							<span className="text-xs text-muted-foreground">
								· Nenhuma registrada
							</span>
						)}
					</div>

					{spellsList.length > 0 && (
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
					<div className="divide-y divide-border/40">
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
					{featsList.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							Nenhum {featsLabel.toLowerCase()} selecionado.
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
			<div className="space-y-5">
				<CharacterInventoryModule
					character={character}
					onUpdateCharacter={(patch) => updateCharacter(character.id, patch)}
				/>
				<CharacterTrainingFields
					character={character}
					onUpdateCharacter={(patch) => updateCharacter(character.id, patch)}
				/>
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
