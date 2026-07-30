import {
	Activity,
	Brain,
	Dices,
	Heart,
	Minus,
	Plus,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
	calculateDefesa,
	calculateDTRitual,
	calculateEsquiva,
	calculateLimiteCarga,
	calculatePE,
	calculatePV,
	calculateSAN,
	getMaxRitualCircle,
	getMaxSkillTrainingDegree,
	type OrdemClasse,
	type OrdemElemento,
	rollOrdemD20,
	trainingDegreeToBonus,
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

const ELEMENT_COLORS: Record<
	OrdemElemento,
	{ bg: string; text: string; border: string }
> = {
	sangue: {
		bg: "bg-red-500/10",
		text: "text-red-400",
		border: "border-red-500/30",
	},
	morte: {
		bg: "bg-neutral-800/60",
		text: "text-neutral-300",
		border: "border-neutral-700",
	},
	conhecimento: {
		bg: "bg-amber-500/10",
		text: "text-amber-400",
		border: "border-amber-500/30",
	},
	energia: {
		bg: "bg-purple-500/10",
		text: "text-purple-400",
		border: "border-purple-500/30",
	},
	medo: {
		bg: "bg-slate-100/10",
		text: "text-slate-200",
		border: "border-slate-300/30",
	},
};

export function OrdemSheetFields({
	character,
	onChange,
	isEditMode = true,
}: OrdemSheetFieldsProps) {
	const toast = useToast();
	const custom = (character.customFields ?? {}) as Record<string, unknown>;

	const nex = Number(custom.nex ?? (character.level ? character.level * 5 : 5));
	const classe = (character.class || "combatente").toLowerCase() as OrdemClasse;
	const patente = String(custom.patente ?? "recruta");

	const atributos = (custom.atributos as {
		agi: number;
		for: number;
		int: number;
		pre: number;
		vig: number;
	}) ?? {
		agi: 1,
		for: 1,
		int: 1,
		pre: 1,
		vig: 1,
	};

	const [rollResult, setRollResult] = useState<{
		label: string;
		dice: number[];
		selectedDie: number;
		total: number;
		isZeroRule: boolean;
	} | null>(null);

	// Atualiza e recalcula dinamicamente quando NEX%, Classe ou Atributos mudam
	function updateOrdemField(patch: Partial<Record<string, unknown>>) {
		const updatedCustom = { ...custom, ...patch };

		const newNex = Number(updatedCustom.nex ?? nex);
		const newClasse = ((patch.class as string) || classe) as OrdemClasse;
		const newAtributos =
			(updatedCustom.atributos as typeof atributos) ?? atributos;

		const calculatedPvMax = calculatePV(newClasse, newAtributos.vig, newNex);
		const calculatedSanMax = calculateSAN(newClasse, newNex);
		const calculatedPeMax = calculatePE(newClasse, newAtributos.pre, newNex);
		const calculatedDefesa = calculateDefesa(newAtributos.agi);

		onChange({
			...character,
			class: newClasse,
			level: Math.max(1, Math.floor(newNex / 5)),
			hpMax: calculatedPvMax,
			sanityMax: calculatedSanMax,
			effortMax: calculatedPeMax,
			customFields: {
				...updatedCustom,
				defesa: calculatedDefesa,
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
				? `Atributo 0! Dados: [${result.dice.join(", ")}] -> Menor: ${result.selectedDie} + Bônus ${bonus} = Total: ${result.total}`
				: `Dados [${result.dice.join(", ")}] -> Maior: ${result.selectedDie} + Bônus ${bonus} = Total: ${result.total}`,
		});
	}

	const maxCircle = getMaxRitualCircle(nex);
	const maxDegree = getMaxSkillTrainingDegree(nex);
	const limiteCarga = calculateLimiteCarga(atributos.for);
	const dtRitual = calculateDTRitual(1, atributos.int);

	return (
		<div className="space-y-6">
			{/* Painel Principal de Agente (NEX, Classe, Patente, Origem) */}
			<FormSection title="Dados do Agente (Ordem Paranormal)">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
					<Field label="NEX% (Exposição)">
						<Select
							value={String(nex)}
							onChange={(e) =>
								updateOrdemField({ nex: Number.parseInt(e.target.value, 10) })
							}
							disabled={!isEditMode}
						>
							{Array.from({ length: 20 }, (_, i) => (i + 1) * 5).map((val) => (
								<option key={val} value={val}>
									NEX {val}%
								</option>
							))}
						</Select>
					</Field>

					<Field label="Classe">
						<Select
							value={classe}
							onChange={(e) => updateOrdemField({ class: e.target.value })}
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
							onChange={(e) => updateOrdemField({ patente: e.target.value })}
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
							onChange={(e) =>
								onChange({ ...character, subclass: e.target.value })
							}
							placeholder="Ex: Aniquilador, Conduíte..."
							disabled={!isEditMode}
						/>
					</Field>
				</div>
			</FormSection>

			{/* Atributos com Rolagem Integrada */}
			<FormSection title="Atributos (AGI, FOR, INT, PRE, VIG)">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
					{[
						{ key: "agi", label: "AGI (Agilidade)" },
						{ key: "for", label: "FOR (Força)" },
						{ key: "int", label: "INT (Intelecto)" },
						{ key: "pre", label: "PRE (Presença)" },
						{ key: "vig", label: "VIG (Vigor)" },
					].map(({ key, label }) => {
						const val = atributos[key as keyof typeof atributos] ?? 1;
						return (
							<div
								key={key}
								className="flex flex-col items-center justify-between rounded-xl border border-border/80 bg-card-elevated/40 p-3 text-center"
							>
								<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
									{key}
								</span>
								<div className="my-1 text-2xl font-extrabold text-primary font-display">
									{val}
								</div>
								<div className="flex w-full items-center gap-1 pt-1">
									{isEditMode && (
										<Input
											type="number"
											min={0}
											max={5}
											value={val}
											onChange={(e) =>
												updateOrdemField({
													atributos: {
														...atributos,
														[key]: Number.parseInt(e.target.value, 10) || 0,
													},
												})
											}
											className="h-7 text-center text-xs"
										/>
									)}
									<Button
										variant="ghost"
										size="sm"
										className="h-7 w-full text-[11px] gap-1 px-1"
										onClick={() => handleRoll(label, val)}
									>
										<Dices className="h-3 w-3 text-primary" />
										Rolar
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			</FormSection>

			{/* Status & Recursos Vitais (PV, SAN, PE, Defesa, Carga, DT) */}
			<FormSection title="Status & Recursos Vitais (Calculados Automáticos)">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{/* PV */}
					<div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
								<Heart className="h-4 w-4" /> Pontos de Vida (PV)
							</span>
							<span className="text-xs font-mono font-bold text-foreground">
								{character.hpCurrent ?? character.hpMax}/{character.hpMax}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								onClick={() =>
									onChange({
										...character,
										hpCurrent: Math.max(
											0,
											(character.hpCurrent ?? character.hpMax ?? 0) - 1,
										),
									})
								}
							>
								<Minus className="h-3 w-3" />
							</Button>
							<div className="h-2 flex-1 rounded-full bg-red-950 overflow-hidden">
								<div
									className="h-full bg-red-500 transition-all"
									style={{
										width: `${Math.min(
											100,
											Math.max(
												0,
												((character.hpCurrent ?? character.hpMax ?? 1) /
													(character.hpMax ?? 1)) *
													100,
											),
										)}%`,
									}}
								/>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								onClick={() =>
									onChange({
										...character,
										hpCurrent: Math.min(
											character.hpMax ?? 100,
											(character.hpCurrent ?? 0) + 1,
										),
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
								{character.sanityCurrent ?? character.sanityMax}/
								{character.sanityMax}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								onClick={() =>
									onChange({
										...character,
										sanityCurrent: Math.max(
											0,
											(character.sanityCurrent ?? character.sanityMax ?? 0) - 1,
										),
									})
								}
							>
								<Minus className="h-3 w-3" />
							</Button>
							<div className="h-2 flex-1 rounded-full bg-blue-950 overflow-hidden">
								<div
									className="h-full bg-blue-500 transition-all"
									style={{
										width: `${Math.min(
											100,
											Math.max(
												0,
												((character.sanityCurrent ?? character.sanityMax ?? 1) /
													(character.sanityMax ?? 1)) *
													100,
											),
										)}%`,
									}}
								/>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								onClick={() =>
									onChange({
										...character,
										sanityCurrent: Math.min(
											character.sanityMax ?? 100,
											(character.sanityCurrent ?? 0) + 1,
										),
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
								{character.effortCurrent ?? character.effortMax}/
								{character.effortMax}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								onClick={() =>
									onChange({
										...character,
										effortCurrent: Math.max(
											0,
											(character.effortCurrent ?? character.effortMax ?? 0) - 1,
										),
									})
								}
							>
								<Minus className="h-3 w-3" />
							</Button>
							<div className="h-2 flex-1 rounded-full bg-amber-950 overflow-hidden">
								<div
									className="h-full bg-amber-500 transition-all"
									style={{
										width: `${Math.min(
											100,
											Math.max(
												0,
												((character.effortCurrent ?? character.effortMax ?? 1) /
													(character.effortMax ?? 1)) *
													100,
											),
										)}%`,
									}}
								/>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="h-7 w-7 p-0"
								onClick={() =>
									onChange({
										...character,
										effortCurrent: Math.min(
											character.effortMax ?? 100,
											(character.effortCurrent ?? 0) + 1,
										),
									})
								}
							>
								<Plus className="h-3 w-3" />
							</Button>
						</div>
					</div>
				</div>

				{/* Cards Rápidos de Defesa, Carga e DT */}
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-3">
					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground">
							Defesa Base
						</span>
						<div className="text-lg font-bold text-foreground font-display">
							{calculateDefesa(atributos.agi)}
						</div>
					</div>

					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground">
							Esquiva
						</span>
						<div className="text-lg font-bold text-foreground font-display">
							{calculateEsquiva(calculateDefesa(atributos.agi), 5)}
						</div>
					</div>

					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground">
							Limite de Carga
						</span>
						<div className="text-lg font-bold text-foreground font-display">
							{limiteCarga} Espaços
						</div>
					</div>

					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground">
							DT de Rituais
						</span>
						<div className="text-lg font-bold text-primary font-display">
							{dtRitual}
						</div>
					</div>
				</div>
			</FormSection>
		</div>
	);
}
