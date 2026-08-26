import { BookOpen, Eye, Heart, Shield, Sparkles, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { CharacterInventoryModule } from "@/components/character-inventory-module";
import { SkillsFields } from "@/components/character-sheet/fields";
import { CharacterTrainingFields } from "@/components/character-training-fields";
import { CustomSheetRenderer } from "@/components/custom-sheet-renderer";
import type { Character, SheetModuleConfig, Spell } from "@/lib/store";
import {
	formatModifier,
	getAttributeExtraInfo,
	getAttributeFullName,
	useRPGStore,
} from "@/lib/store";
import { getFeatsLabel, type SYSTEM_CONFIG } from "@/lib/systems";
import { FeatRow, InfoRow, SpellRow, TextBlock } from "./ui-primitives";

export function SheetModuleContent({
	module,
	character,
	config,
}: {
	module: SheetModuleConfig;
	character: Character;
	config: (typeof SYSTEM_CONFIG)[keyof typeof SYSTEM_CONFIG];
}) {
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
					const extraInfo = getAttributeExtraInfo(
						ability.value,
						character.system,
					);
					return (
						<div
							key={ability.label}
							className="group/tooltip relative rounded-2xl border border-border/70 bg-background/45 py-4 px-1 text-center transition-all hover:border-primary/20 hover:bg-background/60 hover:translate-y-[-2px] hover:shadow-md hover:shadow-primary/5 cursor-default"
						>
							<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
								{fullName}
							</div>

							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								{ability.label}
							</p>
							<p className="font-display mt-1.5 text-2xl sm:text-3xl font-bold text-foreground leading-none">
								{ability.value}
							</p>
							{extraInfo && (
								<p className="font-mono text-[12px] font-bold text-primary mt-1">
									{extraInfo}
								</p>
							)}
						</div>
					);
				})}
			</div>
		);
	}

	if (module.kind === "skills") {
		return <SkillsFields character={character} config={config} />;
	}

	if (module.kind === "combat") {
		const hasTough = character.featsList?.some(
			(f) =>
				f.name.toLowerCase() === "robusto" || f.name.toLowerCase() === "tough",
		);
		const toughBonus =
			hasTough &&
			(character.system === "dnd5e" || character.system === "dnd2024")
				? 2 * (character.level || 1)
				: 0;
		const effectiveHealthMax = (character.healthMax || 0) + toughBonus;

		const hpPercent = effectiveHealthMax
			? Math.min(100, Math.round((character.health / effectiveHealthMax) * 100))
			: 0;
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
			</div>
		);
	}

	if (module.kind === "sanity") {
		return (
			<div className="grid gap-3 sm:grid-cols-3">
				{customFields.map((field) => (
					<MetricCard
						key={field.key}
						Icon={Sparkles}
						label={field.label}
						value={character.systemFields?.[field.key] || "-"}
					/>
				))}
				<MetricCard Icon={Eye} label="Sanidade" value={character.sanity} />
				<MetricCard
					Icon={Eye}
					label="Sanidade Máx."
					value={character.sanityMax}
				/>
				<MetricCard Icon={Sparkles} label="Poder" value={character.power} />
			</div>
		);
	}

	if (module.kind === "magic") {
		const spellsList = character.spellsList || [];

		const groupedSpells: Record<number, Spell[]> = {};
		for (const spell of spellsList) {
			const lvl = spell.level;
			if (!groupedSpells[lvl]) groupedSpells[lvl] = [];
			groupedSpells[lvl].push(spell);
		}

		const formatLevelName = (lvl: number) => {
			if (lvl === 0) return "Truques";
			return `${lvl}º Círculo / Nível`;
		};

		return (
			<div className="grid gap-3">
				<div className="grid gap-3 sm:grid-cols-3">
					<MetricCard
						Icon={BookOpen}
						label="Classe"
						value={character.spellcastingClass || "-"}
					/>
					<MetricCard Icon={Shield} label="CD" value={character.spellSaveDc} />
					<MetricCard
						Icon={Sparkles}
						label="Ataque"
						value={formatModifier(character.spellAttackBonus)}
					/>
				</div>
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}

				<TextBlock title="Espaços" value={character.spellSlots} />

				{spellsList.length > 0 && (
					<div className="space-y-4 border-t border-border/30 pt-4 mt-2">
						<h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
							<BookOpen className="h-4 w-4 text-primary" />
							Grimório de Magias
						</h4>
						<div className="space-y-4">
							{Object.keys(groupedSpells)
								.map(Number)
								.sort((a, b) => a - b)
								.map((level) => (
									<div key={level} className="space-y-2">
										<h5 className="text-xs font-bold text-muted-foreground border-b border-border/20 pb-1">
											{formatLevelName(level)}
										</h5>
										<div className="grid gap-1.5">
											{groupedSpells[level].map((spell) => (
												<SpellRow key={spell.id} spell={spell} />
											))}
										</div>
									</div>
								))}
						</div>
					</div>
				)}

				{character.spells?.trim() && (
					<TextBlock
						title={spellsList.length > 0 ? "Magias (Legado)" : "Magias"}
						value={character.spells}
					/>
				)}
			</div>
		);
	}

	if (module.kind === "feats") {
		const featsList = character.featsList || [];
		const featsLabel = getFeatsLabel(character.system);

		return (
			<div className="grid gap-3">
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}

				{featsList.length > 0 ? (
					<div className="space-y-4">
						<h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border/20 pb-2">
							<Sparkles className="h-4 w-4 text-primary" />
							{featsLabel}
						</h4>
						<div className="grid gap-2">
							{featsList.map((feat) => (
								<FeatRow key={feat.id} feat={feat} />
							))}
						</div>
					</div>
				) : (
					<div className="rounded-xl border border-dashed border-border/60 bg-background/20 p-6 text-center text-xs text-muted-foreground">
						Nenhum(a) {featsLabel.toLowerCase()} adicionado(a) ainda.
					</div>
				)}
			</div>
		);
	}

	if (module.kind === "inventory") {
		return (
			<div className="grid gap-4">
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}
				<CharacterInventoryModule
					character={character}
					onUpdateCharacter={(patch) =>
						useRPGStore.getState().updateCharacter(character.id, patch)
					}
				/>
			</div>
		);
	}

	if (module.kind === "personality") {
		return (
			<div className="grid gap-3">
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}
				<TextBlock title="Traços" value={character.personalityTraits} />
				<TextBlock title="Ideais" value={character.ideals} />
				<TextBlock title="Vínculos" value={character.bonds} />
				<TextBlock title="Defeitos" value={character.flaws} />
			</div>
		);
	}

	if (module.kind === "notes") {
		return (
			<div className="grid gap-4">
				{customFields.map((field) => (
					<TextBlock
						key={field.key}
						title={field.label}
						value={character.systemFields?.[field.key]}
					/>
				))}
				<TextBlock title="Anotações" value={character.notes} />
				<CharacterTrainingFields
					character={character}
					onUpdateCharacter={(patch) =>
						useRPGStore.getState().updateCharacter(character.id, patch)
					}
				/>
			</div>
		);
	}

	return (
		<TextBlock
			title={module.kind === "customStats" ? "Stats customizados" : "Conteúdo"}
			value={module.content}
		/>
	);
}

function MetricCard({
	Icon,
	label,
	value,
}: {
	Icon: ComponentType<{ className?: string }>;
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-3">
			<Icon className="h-4 w-4 text-primary" />
			<p className="font-display mt-2 text-xl font-bold text-foreground">
				{value}
			</p>
			<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</p>
		</div>
	);
}
