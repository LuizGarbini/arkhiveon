import { Brain, Dices, Heart, Minus, Plus, Sparkles, Zap } from "lucide-react";
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

		const currentHealth = character.health ?? calculatedPvMax;
		const currentSanity = character.sanity ?? calculatedSanMax;
		const currentEffort = character.effort ?? calculatedPeMax;

		onChange({
			...character,
			class: newClasse,
			level: Math.max(1, Math.floor(newNex / 5)),
			healthMax: calculatedPvMax,
			sanityMax: calculatedSanMax,
			effortMax: calculatedPeMax,
			health: Math.min(currentHealth, calculatedPvMax),
			sanity: Math.min(currentSanity, calculatedSanMax),
			effort: Math.min(currentEffort, calculatedPeMax),
			customFields: {
				...updatedCustom,
				defesa: calculatedDefesa,
			},
		});
	}

	function handleRoll(label: string, attributeScore: number, bonus = 0) {
		const result = rollOrdemD20(attributeScore, bonus);

		toast.info({
			title: `Rolagem de ${label}`,
			description: result.isZeroAttributeRule
				? `Atributo 0! Dados: [${result.dice.join(", ")}] -> Menor: ${result.selectedDie} + Bônus ${bonus} = Total: ${result.total}`
				: `Dados [${result.dice.join(", ")}] -> Maior: ${result.selectedDie} + Bônus ${bonus} = Total: ${result.total}`,
		});
	}

	const limiteCarga = calculateLimiteCarga(atributos.for);
	const dtRitual = calculateDTRitual(1, atributos.int);
	const pePorTurno = calculatePETurno(nex);
	const bonusAttributePoints = getBonusAttributePointsFromNex(nex);
	const maxCircle = getMaxRitualCircle(nex);
	const maxDegree = getMaxSkillTrainingDegree(nex);

	const degreeLabels: Record<string, string> = {
		nao_treinado: "Não Treinado (+0)",
		treinado: "Treinado (+5)",
		veterano: "Veterano (+10)",
		expert: "Expert (+15)",
	};

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

					<Field label="Origem">
						<Input
							value={String(custom.origem ?? character.race ?? "")}
							onChange={(e) =>
								updateOrdemField({ origem: e.target.value })
							}
							placeholder="Ex: Agente de Saúde, Acadêmico..."
							disabled={!isEditMode}
						/>
					</Field>
				</div>

			</FormSection>

			{/* Atributos Básicos de Ordem (AGI, FOR, INT, PRE, VIG) com dados d20 */}
			<FormSection title="Atributos Paranormais (AGI, FOR, INT, PRE, VIG)">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
					{(
						[
							{ key: "agi", label: "Agilidade (AGI)" },
							{ key: "for", label: "Força (FOR)" },
							{ key: "int", label: "Intelecto (INT)" },
							{ key: "pre", label: "Presença (PRE)" },
							{ key: "vig", label: "Vigor (VIG)" },
						] as const
					).map(({ key, label }) => {
						const val = atributos[key] ?? 1;
						return (
							<div
								key={key}
								className="rounded-xl border border-border/80 bg-card p-3 text-center space-y-2 hover:border-primary/50 transition-colors"
							>
								<span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
									{label}
								</span>
								<div className="flex flex-col items-center gap-2">
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
								{(character as any).health ?? (character as any).healthMax}/{(character as any).healthMax}
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
										health: Math.max(
											0,
											((character as any).health ?? (character as any).healthMax ?? 0) - 1,
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
												(((character as any).health ?? (character as any).healthMax ?? 1) /
													((character as any).healthMax ?? 1)) *
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
										health: Math.min(
											(character as any).healthMax ?? 100,
											((character as any).health ?? 0) + 1,
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
								{(character as any).sanity ?? (character as any).sanityMax}/{(character as any).sanityMax}
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
										sanity: Math.max(
											0,
											((character as any).sanity ?? (character as any).sanityMax ?? 0) - 1,
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
												(((character as any).sanity ?? (character as any).sanityMax ?? 1) /
													((character as any).sanityMax ?? 1)) *
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
										sanity: Math.min(
											(character as any).sanityMax ?? 100,
											((character as any).sanity ?? 0) + 1,
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
								{(character as any).effort ?? (character as any).effortMax}/{(character as any).effortMax}
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
										effort: Math.max(
											0,
											((character as any).effort ?? (character as any).effortMax ?? 0) - 1,
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
												(((character as any).effort ?? (character as any).effortMax ?? 1) /
													((character as any).effortMax ?? 1)) *
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
										effort: Math.min(
											(character as any).effortMax ?? 100,
											((character as any).effort ?? 0) + 1,
										),
									})
								}
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
							{calculateDefesa(atributos.agi)}
						</div>
						<span className="text-[9px] text-muted-foreground">10 + AGI ({atributos.agi})</span>
					</div>

					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground block">
							Esquiva
						</span>
						<div className="text-lg font-bold text-foreground font-display mt-0.5">
							{calculateEsquiva(calculateDefesa(atributos.agi), 5)}
						</div>
						<span className="text-[9px] text-muted-foreground">Defesa + Reflexos</span>
					</div>

					<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-amber-400 block">
							PE / Turno (Limite)
						</span>
						<div className="text-lg font-bold text-amber-300 font-display mt-0.5">
							{pePorTurno} PE
						</div>
						<span className="text-[9px] text-amber-400/80">NEX {nex}% / 5%</span>
					</div>

					<div className="rounded-xl border border-border/70 bg-card p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-muted-foreground block">
							Limite de Carga
						</span>
						<div className="text-lg font-bold text-foreground font-display mt-0.5">
							{limiteCarga} Espaços
						</div>
						<span className="text-[9px] text-muted-foreground">5 + FOR ({atributos.for})</span>
					</div>

					<div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-purple-400 block">
							DT de Rituais
						</span>
						<div className="text-lg font-bold text-purple-300 font-display mt-0.5">
							{dtRitual}
						</div>
						<span className="text-[9px] text-purple-400/80">10 + PE + INT ({atributos.int})</span>
					</div>

					<div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-purple-400 block">
							Círculo Máx. Ritual
						</span>
						<div className="text-lg font-bold text-purple-300 font-display mt-0.5">
							{maxCircle > 0 ? `${maxCircle}º Círculo` : "Nenhum"}
						</div>
						<span className="text-[9px] text-purple-400/80">Liberado pelo NEX {nex}%</span>
					</div>

					<div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-center">
						<span className="text-[10px] uppercase font-bold text-cyan-400 block">
							Grau Máx. Perícia
						</span>
						<div className="text-sm font-bold text-cyan-300 font-display mt-1">
							{degreeLabels[maxDegree]}
						</div>
						<span className="text-[9px] text-cyan-400/80">Limite por NEX {nex}%</span>
					</div>

					<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center flex flex-col justify-center">
						<span className="text-[10px] uppercase font-bold text-emerald-400 block">
							Aumentos de Atributo
						</span>
						<div className="text-sm font-bold text-emerald-300 font-display mt-1 flex items-center justify-center gap-1">
							<Sparkles className="h-3.5 w-3.5" />
							{bonusAttributePoints > 0 ? `+${bonusAttributePoints} Ponto(s)` : "Disponível a partir de 20%"}
						</div>
						<span className="text-[9px] text-emerald-400/80">Marcos: 20%, 50%, 80%, 95%</span>
					</div>
				</div>
			</FormSection>
		</div>
	);
}
