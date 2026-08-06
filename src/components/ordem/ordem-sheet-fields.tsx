import { Brain, Dices, Heart, Minus, Plus, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
	calculateDefesa,
	calculateDTRitual,
	calculateEsquiva,
	calculateLimiteCarga,
	calculatePE,
	calculatePETurno,
	calculatePV,
	calculateSAN,
	getBonusAttributePointsFromNex,
	getMaxRitualCircle,
	getMaxSkillTrainingDegree,
	type OrdemClasse,
	rollOrdemD20,
} from "@/lib/ordem/calculations";
import type { Character } from "@/lib/store/types";
import { Button } from "../ui/button";
import { Field, FormSection } from "../ui/form-tabs";
import { Input } from "../ui/input";
import { Select } from "../ui/select";

interface OrdemSheetFieldsProps {
	character: Partial<Character>;
	onChange: (updated: Partial<Character>) => void;
	isEditMode?: boolean;
}

type OrdemAttributeKey = "agi" | "for" | "int" | "pre" | "vig";
type OrdemAttributes = Record<OrdemAttributeKey, number>;

const ATTRIBUTE_FIELDS: Array<{
	key: OrdemAttributeKey;
	label: string;
	fullLabel: string;
	alias?: string;
}> = [
	{ key: "agi", label: "AGI", fullLabel: "AGI (Agilidade)", alias: "agility" },
	{ key: "for", label: "FOR", fullLabel: "FOR (Força)", alias: "strength" },
	{
		key: "int",
		label: "INT",
		fullLabel: "INT (Intelecto)",
		alias: "intellect",
	},
	{ key: "pre", label: "PRE", fullLabel: "PRE (Presença)", alias: "presence" },
	{ key: "vig", label: "VIG", fullLabel: "VIG (Vigor)", alias: "vigor" },
];

function toNumber(value: unknown, fallback: number) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function normalizeClasse(value: unknown): OrdemClasse {
	const raw = String(value || "combatente").toLowerCase();
	if (raw.includes("ocultista")) return "ocultista";
	if (raw.includes("especialista")) return "especialista";
	return "combatente";
}

function readAttributes(systemAttributes: Record<string, number>) {
	return ATTRIBUTE_FIELDS.reduce((acc, field) => {
		acc[field.key] = toNumber(
			systemAttributes[field.key] ?? systemAttributes[field.alias ?? ""],
			1,
		);
		return acc;
	}, {} as OrdemAttributes);
}

function formatTrainingDegree(value: string) {
	return value.replace("nao_treinado", "não treinado").replace("_", " ");
}

export function OrdemSheetFields({
	character,
	onChange,
	isEditMode = true,
}: OrdemSheetFieldsProps) {
	const toast = useToast();
	const systemAttributes = character.systemAttributes ?? {};
	const systemFields = character.systemFields ?? {};

	const nex = toNumber(
		systemAttributes.nex,
		character.level ? character.level * 5 : 5,
	);
	const classe = normalizeClasse(character.class);
	const patente = systemFields.patente ?? "recruta";
	const atributos = readAttributes(systemAttributes);

	const calculatedPvMax = calculatePV(classe, atributos.vig, nex);
	const calculatedSanMax = calculateSAN(classe, nex);
	const calculatedPeMax = calculatePE(classe, atributos.pre, nex);
	const healthMax = character.healthMax ?? calculatedPvMax;
	const health = character.health ?? healthMax;
	const sanityMax = character.sanityMax ?? calculatedSanMax;
	const sanity = character.sanity ?? sanityMax;
	const peMax = toNumber(systemAttributes.peMax, calculatedPeMax);
	const peCurrent = toNumber(systemAttributes.peCurrent, peMax);

	const [rollResult, setRollResult] = useState<{
		label: string;
		dice: number[];
		selectedDie: number;
		total: number;
		isZeroRule: boolean;
	} | null>(null);

	function updateOrdemField(
		patch: Partial<{
			nex: number;
			class: string;
			patente: string;
			atributos: OrdemAttributes;
		}>,
	) {
		const nextNex = toNumber(patch.nex ?? nex, nex);
		const nextClasse = normalizeClasse(patch.class ?? classe);
		const nextAttributes = patch.atributos ?? atributos;
		const nextPvMax = calculatePV(nextClasse, nextAttributes.vig, nextNex);
		const nextSanMax = calculateSAN(nextClasse, nextNex);
		const nextPeMax = calculatePE(nextClasse, nextAttributes.pre, nextNex);
		const nextDefesa = calculateDefesa(nextAttributes.agi);

		onChange({
			...character,
			system: "ordem",
			class: nextClasse,
			level: Math.max(1, Math.floor(nextNex / 5)),
			healthMax: nextPvMax,
			health: clamp(character.health ?? nextPvMax, 0, nextPvMax),
			sanityMax: nextSanMax,
			sanity: clamp(character.sanity ?? nextSanMax, 0, nextSanMax),
			armorClass: nextDefesa,
			systemAttributes: {
				...systemAttributes,
				nex: nextNex,
				agi: nextAttributes.agi,
				for: nextAttributes.for,
				int: nextAttributes.int,
				pre: nextAttributes.pre,
				vig: nextAttributes.vig,
				agility: nextAttributes.agi,
				strength: nextAttributes.for,
				intellect: nextAttributes.int,
				presence: nextAttributes.pre,
				vigor: nextAttributes.vig,
				defesa: nextDefesa,
				peCurrent: clamp(peCurrent, 0, nextPeMax),
				peMax: nextPeMax,
			},
			systemFields: {
				...systemFields,
				patente: patch.patente ?? patente,
				defesa: String(nextDefesa),
				pe: String(clamp(peCurrent, 0, nextPeMax)),
				peMax: String(nextPeMax),
			},
		});
	}

	function updatePe(nextValue: number) {
		const nextPe = clamp(nextValue, 0, peMax);
		onChange({
			...character,
			systemAttributes: {
				...systemAttributes,
				peCurrent: nextPe,
				peMax,
			},
			systemFields: {
				...systemFields,
				pe: String(nextPe),
				peMax: String(peMax),
			},
		});
	}

	function handleRoll(label: string, attributeScore: number, bonus = 0) {
		const result = rollOrdemD20(attributeScore, bonus);
		setRollResult({
			label,
			dice: result.dice,
			selectedDie: result.selectedDie,
			total: result.total,
			isZeroRule: result.isZeroAttributeRule,
		});

		toast.info({
			title: `Rolagem de ${label}`,
			description: result.isZeroAttributeRule
				? `Atributo 0: menor dado ${result.selectedDie} + bônus ${bonus} = ${result.total}`
				: `Maior dado ${result.selectedDie} + bônus ${bonus} = ${result.total}`,
		});
	}

	const limiteCarga = calculateLimiteCarga(atributos.for);
	const dtRitual = calculateDTRitual(1, atributos.int);
	const pePorTurno = calculatePETurno(nex);
	const bonusAttributePoints = getBonusAttributePointsFromNex(nex);
	const maxCircle = getMaxRitualCircle(nex);
	const maxDegree = getMaxSkillTrainingDegree(nex);
	const defesa = calculateDefesa(atributos.agi);

	return (
		<div className="space-y-6">
			<FormSection title="Dados do Agente (Ordem Paranormal)">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
					<Field label="NEX% (Exposição)">
						<Select
							value={String(nex)}
							onChange={(event) =>
								updateOrdemField({
									nex: Number.parseInt(event.target.value, 10),
								})
							}
							disabled={!isEditMode}
						>
							{Array.from({ length: 20 }, (_, index) => (index + 1) * 5).map(
								(value) => (
									<option key={value} value={value}>
										NEX {value}%
									</option>
								),
							)}
						</Select>
					</Field>

					<Field label="Classe">
						<Select
							value={classe}
							onChange={(event) =>
								updateOrdemField({ class: event.target.value })
							}
							disabled={!isEditMode}
						>
							<option value="combatente">Combatente</option>
							<option value="especialista">Especialista</option>
							<option value="ocultista">Ocultista</option>
						</Select>
					</Field>

					<Field label="Patente da Ordem">
						<Select
							value={patente}
							onChange={(event) =>
								updateOrdemField({ patente: event.target.value })
							}
							disabled={!isEditMode}
						>
							<option value="recruta">Recruta</option>
							<option value="operador">Operador</option>
							<option value="agente_especial">Agente Especial</option>
							<option value="oficial_operacoes">Oficial de Operações</option>
							<option value="agente_elite">Agente de Elite</option>
						</Select>
					</Field>

					<Field label="Trilha">
						<Input
							value={character.subclass ?? ""}
							onChange={(event) =>
								onChange({ ...character, subclass: event.target.value })
							}
							placeholder="Ex: Aniquilador, Conduíte..."
							disabled={!isEditMode}
						/>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Atributos (AGI, FOR, INT, PRE, VIG)">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
					{ATTRIBUTE_FIELDS.map((field) => {
						const value = atributos[field.key] ?? 1;
						return (
							<div
								key={field.key}
								className="flex flex-col items-center justify-between rounded-xl border border-border/80 bg-card-elevated/40 p-3 text-center"
							>
								<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
									{field.label}
								</span>
								<div className="font-display my-1 text-2xl font-extrabold text-primary">
									{value}
								</div>
								<div className="flex w-full items-center gap-1 pt-1">
									{isEditMode ? (
										<Input
											type="number"
											min={0}
											max={5}
											value={value}
											onChange={(event) =>
												updateOrdemField({
													atributos: {
														...atributos,
														[field.key]:
															Number.parseInt(event.target.value, 10) || 0,
													},
												})
											}
											className="h-7 text-center text-xs"
										/>
									) : null}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 w-full gap-1 px-1 text-[11px]"
										onClick={() => handleRoll(field.fullLabel, value)}
									>
										<Dices className="h-3 w-3 text-primary" />
										Rolar
									</Button>
								</div>
							</div>
						);
					})}
				</div>

				{rollResult ? (
					<div className="rounded-xl border border-primary/20 bg-primary/8 p-3 text-[12px] text-foreground">
						<span className="font-bold">{rollResult.label}: </span>
						dados [{rollResult.dice.join(", ")}],{" "}
						{rollResult.isZeroRule ? "menor" : "maior"} dado{" "}
						{rollResult.selectedDie}, total {rollResult.total}.
					</div>
				) : null}
			</FormSection>

			<FormSection title="Status & Recursos Vitais">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{/* PV */}
					<div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
								<Heart className="h-4 w-4" /> Pontos de Vida (PV)
							</span>
							<span className="text-xs font-mono font-bold text-foreground">
								{health}/{healthMax}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								disabled={!isEditMode}
								onClick={() =>
									onChange({
										...character,
										health: clamp(health - 1, 0, healthMax),
									})
								}
							>
								<Minus className="h-3 w-3" />
							</Button>
							<div className="h-2 flex-1 rounded-full bg-red-950 overflow-hidden">
								<div
									className="h-full bg-red-500 transition-all"
									style={{
										width: `${clamp((health / Math.max(healthMax, 1)) * 100, 0, 100)}%`,
									}}
								/>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								disabled={!isEditMode}
								onClick={() =>
									onChange({
										...character,
										health: clamp(health + 1, 0, healthMax),
									})
								}
							>
								<Plus className="h-3 w-3" />
							</Button>
						</div>
					</div>

					{/* SAN */}
					<div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
								<Brain className="h-4 w-4" /> Sanidade (SAN)
							</span>
							<span className="text-xs font-mono font-bold text-foreground">
								{sanity}/{sanityMax}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								disabled={!isEditMode}
								onClick={() =>
									onChange({
										...character,
										sanity: clamp(sanity - 1, 0, sanityMax),
									})
								}
							>
								<Minus className="h-3 w-3" />
							</Button>
							<div className="h-2 flex-1 rounded-full bg-blue-950 overflow-hidden">
								<div
									className="h-full bg-blue-500 transition-all"
									style={{
										width: `${clamp((sanity / Math.max(sanityMax, 1)) * 100, 0, 100)}%`,
									}}
								/>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								disabled={!isEditMode}
								onClick={() =>
									onChange({
										...character,
										sanity: clamp(sanity + 1, 0, sanityMax),
									})
								}
							>
								<Plus className="h-3 w-3" />
							</Button>
						</div>
					</div>

					{/* PE */}
					<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
								<Zap className="h-4 w-4" /> Esforço (PE)
							</span>
							<span className="text-xs font-mono font-bold text-foreground">
								{peCurrent}/{peMax}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								disabled={!isEditMode}
								onClick={() => updatePe(peCurrent - 1)}
							>
								<Minus className="h-3 w-3" />
							</Button>
							<div className="h-2 flex-1 rounded-full bg-amber-950 overflow-hidden">
								<div
									className="h-full bg-amber-500 transition-all"
									style={{
										width: `${clamp((peCurrent / Math.max(peMax, 1)) * 100, 0, 100)}%`,
									}}
								/>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								disabled={!isEditMode}
								onClick={() => updatePe(peCurrent + 1)}
							>
								<Plus className="h-3 w-3" />
							</Button>
						</div>
					</div>
				</div>

				{/* Cards Rápidos de Defesa, Carga, PE por Turno, Rituais e NEX */}
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-3">
					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground block">
							Defesa Base
						</span>
						<div className="text-lg font-bold text-foreground font-display mt-0.5">
							{defesa}
						</div>
						<span className="text-[9px] text-muted-foreground">
							10 + AGI ({atributos.agi})
						</span>
					</div>

					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground block">
							Esquiva
						</span>
						<div className="text-lg font-bold text-foreground font-display mt-0.5">
							{calculateEsquiva(defesa, 5)}
						</div>
						<span className="text-[9px] text-muted-foreground">
							Defesa + Reflexos
						</span>
					</div>

					<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-amber-400 block">
							PE / Turno (Limite)
						</span>
						<div className="text-lg font-bold text-amber-300 font-display mt-0.5">
							{pePorTurno} PE
						</div>
						<span className="text-[9px] text-amber-400/80">
							NEX {nex}% / 5%
						</span>
					</div>

					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground block">
							Limite de Carga
						</span>
						<div className="text-lg font-bold text-foreground font-display mt-0.5">
							{limiteCarga} Espaços
						</div>
						<span className="text-[9px] text-muted-foreground">
							5 + FOR ({atributos.for})
						</span>
					</div>

					<div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-purple-400 block">
							DT de Rituais
						</span>
						<div className="text-lg font-bold text-purple-300 font-display mt-0.5">
							{dtRitual}
						</div>
						<span className="text-[9px] text-purple-400/80">
							10 + PE + INT ({atributos.int})
						</span>
					</div>

					<div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-purple-400 block">
							Círculo Máx. Ritual
						</span>
						<div className="text-lg font-bold text-purple-300 font-display mt-0.5">
							{maxCircle > 0 ? `${maxCircle}º Círculo` : "Nenhum"}
						</div>
						<span className="text-[9px] text-purple-400/80">
							Liberado pelo NEX {nex}%
						</span>
					</div>

					<div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-cyan-400 block">
							Grau Máx. Perícia
						</span>
						<div className="text-sm font-bold text-cyan-300 font-display mt-1">
							{formatTrainingDegree(maxDegree)}
						</div>
						<span className="text-[9px] text-cyan-400/80">
							Limite por NEX {nex}%
						</span>
					</div>

					<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center flex flex-col justify-center">
						<span className="text-[10px] uppercase font-bold text-emerald-400 block">
							Aumentos de Atributo
						</span>
						<div className="text-sm font-bold text-emerald-300 font-display mt-1 flex items-center justify-center gap-1">
							<Sparkles className="h-3.5 w-3.5" />
							{bonusAttributePoints > 0
								? `+${bonusAttributePoints} Ponto(s)`
								: "Disponível a partir de 20%"}
						</div>
						<span className="text-[9px] text-emerald-400/80">
							Marcos: 20%, 50%, 80%, 95%
						</span>
					</div>
				</div>
			</FormSection>
		</div>
	);
}
