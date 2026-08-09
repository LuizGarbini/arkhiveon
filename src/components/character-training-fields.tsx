import { BookOpen, Clock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Character, TempBonus, TrainingActivity } from "@/lib/store/types";
import { cn } from "@/lib/utils";

interface CharacterTrainingFieldsProps {
	character: Character;
	onUpdateCharacter: (patch: Partial<Character>) => void;
}

export function CharacterTrainingFields({
	character,
	onUpdateCharacter,
}: CharacterTrainingFieldsProps) {
	const trainingList = character.trainingList || [];
	const tempBonusesList = character.tempBonusesList || [];

	const [isAddingTraining, setIsAddingTraining] = useState(false);
	const [newTrainTitle, setNewTrainTitle] = useState("");
	const [newTrainCategory, setNewTrainCategory] = useState<
		"language" | "skill" | "tool" | "custom"
	>("language");
	const [newTrainHours, setNewTrainHours] = useState(10);
	const [newTrainTarget, setNewTrainTarget] = useState(250);

	const [isAddingBonus, setIsAddingBonus] = useState(false);
	const [newBonusTitle, setNewBonusTitle] = useState("");
	const [newBonusDesc, setNewBonusDesc] = useState("");
	const [newBonusDuration, setNewBonusDuration] = useState(5);

	const handleAddTraining = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTrainTitle.trim()) return;

		const newItem: TrainingActivity = {
			id: crypto.randomUUID(),
			title: newTrainTitle.trim(),
			category: newTrainCategory,
			hoursInvested: newTrainHours,
			targetHours: newTrainTarget,
		};

		onUpdateCharacter({
			trainingList: [...trainingList, newItem],
		});

		setNewTrainTitle("");
		setIsAddingTraining(false);
	};

	const handleRemoveTraining = (id: string) => {
		onUpdateCharacter({
			trainingList: trainingList.filter((t) => t.id !== id),
		});
	};

	const handleUpdateHours = (id: string, delta: number) => {
		onUpdateCharacter({
			trainingList: trainingList.map((t) =>
				t.id === id
					? { ...t, hoursInvested: Math.max(0, t.hoursInvested + delta) }
					: t,
			),
		});
	};

	const handleAddBonus = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newBonusTitle.trim()) return;

		const newBonus: TempBonus = {
			id: crypto.randomUUID(),
			title: newBonusTitle.trim(),
			description: newBonusDesc.trim(),
			durationDaysOrSessions: newBonusDuration,
			remainingDaysOrSessions: newBonusDuration,
		};

		onUpdateCharacter({
			tempBonusesList: [...tempBonusesList, newBonus],
		});

		setNewBonusTitle("");
		setNewBonusDesc("");
		setIsAddingBonus(false);
	};

	const handleRemoveBonus = (id: string) => {
		onUpdateCharacter({
			tempBonusesList: tempBonusesList.filter((b) => b.id !== id),
		});
	};

	return (
		<div className="space-y-6">
			{/* Seção 1: Treinamentos & Horas Dedicadas */}
			<div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-4 shadow-sm">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
							<Clock className="h-4.5 w-4.5" />
						</div>
						<div>
							<h3 className="font-display text-sm font-bold text-foreground">
								Treinamentos & Aprendizado (Idiomas / Alquimia)
							</h3>
							<p className="text-[11px] text-muted-foreground">
								Acompanhe as horas praticadas para aprender novos idiomas, ferramentas ou perícias.
							</p>
						</div>
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setIsAddingTraining(!isAddingTraining)}
						className="gap-1.5 text-xs"
					>
						<Plus className="h-3.5 w-3.5" />
						{isAddingTraining ? "Cancelar" : "Novo Treino"}
					</Button>
				</div>

				{isAddingTraining && (
					<form
						onSubmit={handleAddTraining}
						className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 animate-in fade-in"
					>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="sm:col-span-2">
								<Field label="Nome do Treino / Atividade">
									<Input
										placeholder="Ex: Treino de Abissal, Alquimia, Treinamento com Pantera..."
										value={newTrainTitle}
										onChange={(e) => setNewTrainTitle(e.target.value)}
										required
									/>
								</Field>
							</div>
							<div>
								<Field label="Categoria">
									<Select
										value={newTrainCategory}
										onChange={(e) =>
											setNewTrainCategory(
												e.target.value as "language" | "skill" | "tool" | "custom",
											)
										}
									>
										<option value="language">Idioma</option>
										<option value="skill">Perícia / Combate</option>
										<option value="tool">Ferramenta / Alquimia</option>
										<option value="custom">Outro</option>
									</Select>
								</Field>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<Field label="Horas Já Investidas">
								<Input
									type="number"
									value={newTrainHours}
									onChange={(e) => setNewTrainHours(Number(e.target.value))}
								/>
							</Field>
							<Field label="Meta de Horas">
								<Input
									type="number"
									value={newTrainTarget}
									onChange={(e) => setNewTrainTarget(Number(e.target.value))}
								/>
							</Field>
						</div>

						<div className="flex justify-end gap-2 pt-1">
							<Button type="submit" size="sm">
								Salvar Treino
							</Button>
						</div>
					</form>
				)}

				<div className="space-y-2.5">
					{trainingList.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
							Nenhum treinamento registrado ainda.
						</div>
					) : (
						trainingList.map((item) => {
							const pct = Math.min(
								100,
								Math.round((item.hoursInvested / (item.targetHours || 1)) * 100),
							);

							return (
								<div
									key={item.id}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
								>
									<div className="space-y-1 flex-1">
										<div className="flex items-center justify-between">
											<span className="font-bold text-xs text-foreground">
												{item.title}
											</span>
											<span className="font-mono text-[11px] text-muted-foreground">
												{item.hoursInvested}h / {item.targetHours}h ({pct}%)
											</span>
										</div>
										<div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
											<div
												className="h-full bg-blue-500 rounded-full transition-all"
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>

									<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
										<Button
											type="button"
											variant="outline"
											size="xs"
											onClick={() => handleUpdateHours(item.id, -5)}
										>
											-5h
										</Button>
										<Button
											type="button"
											variant="outline"
											size="xs"
											onClick={() => handleUpdateHours(item.id, 5)}
										>
											+5h
										</Button>
										<Button
											type="button"
											variant="outline"
											size="xs"
											onClick={() => handleUpdateHours(item.id, 20)}
										>
											+20h
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											onClick={() => handleRemoveTraining(item.id)}
											className="text-rose-400 hover:text-rose-300"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>

			{/* Seção 2: Bônus Temporários & Buffs (Por Dias / Sessões) */}
			<div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-4 shadow-sm">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
							<Sparkles className="h-4.5 w-4.5" />
						</div>
						<div>
							<h3 className="font-display text-sm font-bold text-foreground">
								Bônus Temporários & Buffs Ativos
							</h3>
							<p className="text-[11px] text-muted-foreground">
								Bônus por poções, rituais ou descanso (ex: Resistência a Fogo por 5 Dias).
							</p>
						</div>
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setIsAddingBonus(!isAddingBonus)}
						className="gap-1.5 text-xs"
					>
						<Plus className="h-3.5 w-3.5" />
						{isAddingBonus ? "Cancelar" : "Novo Buff"}
					</Button>
				</div>

				{isAddingBonus && (
					<form
						onSubmit={handleAddBonus}
						className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3 animate-in fade-in"
					>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="sm:col-span-2">
								<Field label="Título do Bônus">
									<Input
										placeholder="Ex: Resistência ao Fogo, -1 Margem de Crítico..."
										value={newBonusTitle}
										onChange={(e) => setNewBonusTitle(e.target.value)}
										required
									/>
								</Field>
							</div>
							<div>
								<Field label="Duração (Dias / Sessões)">
									<Input
										type="number"
										min={1}
										value={newBonusDuration}
										onChange={(e) => setNewBonusDuration(Number(e.target.value))}
									/>
								</Field>
							</div>
						</div>

						<Field label="Descrição dos Efeitos">
							<Textarea
								rows={2}
								placeholder="Ex: Reduz dano de fogo pela metade por 5 dias / +2 em Intuição"
								value={newBonusDesc}
								onChange={(e) => setNewBonusDesc(e.target.value)}
							/>
						</Field>

						<div className="flex justify-end gap-2 pt-1">
							<Button type="submit" size="sm">
								Salvar Bônus
							</Button>
						</div>
					</form>
				)}

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{tempBonusesList.length === 0 ? (
						<div className="col-span-full rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
							Nenhum bônus temporário ativo.
						</div>
					) : (
						tempBonusesList.map((bonus) => (
							<div
								key={bonus.id}
								className="flex flex-col justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 space-y-2"
							>
								<div className="space-y-1">
									<div className="flex items-center justify-between">
										<span className="font-bold text-xs text-purple-200 flex items-center gap-1.5">
											<Sparkles className="h-3.5 w-3.5 text-purple-400" />
											{bonus.title}
										</span>
										<span className="rounded-full bg-purple-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-300">
											{bonus.remainingDaysOrSessions} dia(s)
										</span>
									</div>
									{bonus.description && (
										<p className="text-xs text-purple-300/80 leading-relaxed">
											{bonus.description}
										</p>
									)}
								</div>

								<div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-500/20">
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										onClick={() => handleRemoveBonus(bonus.id)}
										className="text-rose-400 hover:text-rose-300"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
