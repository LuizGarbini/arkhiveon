import { Clock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Character, TempBonus, TrainingActivity } from "@/lib/store/types";

interface CharacterTrainingFieldsProps {
	character: Character;
	onUpdateCharacter: (patch: Partial<Character>) => void;
}

const TRAINING_CATEGORY_LABELS: Record<
	NonNullable<TrainingActivity["category"]>,
	string
> = {
	language: "Idioma",
	skill: "Perícia",
	tool: "Ofício",
	custom: "Outro",
};

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
		<div className="divide-y divide-border/40 border-t border-border/40">
			{/* Seção 1: Treinamentos & Horas Dedicadas */}
			<section className="space-y-3 py-3.5 first:pt-3.5">
				<div className="flex items-center justify-between gap-3">
					<div className="flex flex-wrap items-baseline gap-2">
						<Clock className="h-3.5 w-3.5 text-muted-foreground self-center shrink-0" />
						<h3 className="text-xs font-semibold text-foreground">
							Treinamentos & Ofícios
						</h3>
						{trainingList.length > 0 ? (
							<span className="font-mono text-xs text-muted-foreground tabular-nums">
								({trainingList.length})
							</span>
						) : (
							!isAddingTraining && (
								<span className="text-xs text-muted-foreground">
									· Nenhum em andamento
								</span>
							)
						)}
					</div>
					<Button
						type="button"
						size="xs"
						variant="ghost"
						onClick={() => setIsAddingTraining(!isAddingTraining)}
						className="gap-1 text-xs text-muted-foreground hover:text-foreground"
					>
						<Plus className="h-3.5 w-3.5" />
						{isAddingTraining ? "Cancelar" : "Novo Treino"}
					</Button>
				</div>

				{isAddingTraining && (
					<form
						onSubmit={handleAddTraining}
						className="rounded-xl border border-primary/25 bg-background/60 p-3.5 space-y-3 animate-in fade-in duration-150"
					>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="sm:col-span-2">
								<Field>
									<FieldLabel>Atividade</FieldLabel>
									<Input
										placeholder="Ex: Idioma Abissal, Alquimia, Ferramentas de Ladrão..."
										value={newTrainTitle}
										onChange={(e) => setNewTrainTitle(e.target.value)}
										required
									/>
								</Field>
							</div>
							<div>
								<Field>
									<FieldLabel>Categoria</FieldLabel>
									<Select
										value={newTrainCategory}
										onChange={(e) =>
											setNewTrainCategory(
												e.target.value as
													| "language"
													| "skill"
													| "tool"
													| "custom",
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
							<Field>
								<FieldLabel>Horas Investidas</FieldLabel>
								<Input
									type="number"
									value={newTrainHours}
									onChange={(e) => setNewTrainHours(Number(e.target.value))}
								/>
							</Field>
							<Field>
								<FieldLabel>Meta (Horas)</FieldLabel>
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

				{trainingList.length > 0 && (
					<ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-background/40">
						{trainingList.map((item) => {
							const pct = Math.min(
								100,
								Math.round(
									(item.hoursInvested / (item.targetHours || 1)) * 100,
								),
							);

							return (
								<li
									key={item.id}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5"
								>
									<div className="space-y-1.5 flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2 min-w-0">
												<span className="font-medium text-sm text-foreground truncate">
													{item.title}
												</span>
												<span className="text-xs text-muted-foreground shrink-0">
													·{" "}
													{(item.category &&
														TRAINING_CATEGORY_LABELS[item.category]) ??
														"Outro"}
												</span>
											</div>
											<span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
												{item.hoursInvested}h / {item.targetHours}h ({pct}%)
											</span>
										</div>
										<div className="w-full h-1 bg-muted rounded-full overflow-hidden">
											<div
												className="h-full bg-primary rounded-full transition-all duration-300"
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>

									<div className="flex items-center gap-2 sm:gap-1 shrink-0 self-end sm:self-center">
										<Button
											type="button"
											variant="outline"
											size="xs"
											className="tabular-nums"
											onClick={() => handleUpdateHours(item.id, -5)}
										>
											-5h
										</Button>
										<Button
											type="button"
											variant="outline"
											size="xs"
											className="tabular-nums"
											onClick={() => handleUpdateHours(item.id, 5)}
										>
											+5h
										</Button>
										<Button
											type="button"
											variant="outline"
											size="xs"
											className="tabular-nums"
											onClick={() => handleUpdateHours(item.id, 20)}
										>
											+20h
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											onClick={() => handleRemoveTraining(item.id)}
											className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</section>

			{/* Seção 2: Bônus Temporários & Buffs (Por Dias / Sessões) */}
			<section className="space-y-3 pt-3.5">
				<div className="flex items-center justify-between gap-3">
					<div className="flex flex-wrap items-baseline gap-2">
						<Sparkles className="h-3.5 w-3.5 text-muted-foreground self-center shrink-0" />
						<h3 className="text-xs font-semibold text-foreground">
							Efeitos & Bônus Temporários
						</h3>
						{tempBonusesList.length > 0 ? (
							<span className="font-mono text-xs text-muted-foreground tabular-nums">
								({tempBonusesList.length})
							</span>
						) : (
							!isAddingBonus && (
								<span className="text-xs text-muted-foreground">
									· Nenhum ativo
								</span>
							)
						)}
					</div>
					<Button
						type="button"
						size="xs"
						variant="ghost"
						onClick={() => setIsAddingBonus(!isAddingBonus)}
						className="gap-1 text-xs text-muted-foreground hover:text-foreground"
					>
						<Plus className="h-3.5 w-3.5" />
						{isAddingBonus ? "Cancelar" : "Novo Buff"}
					</Button>
				</div>

				{isAddingBonus && (
					<form
						onSubmit={handleAddBonus}
						className="rounded-xl border border-primary/25 bg-background/60 p-3.5 space-y-3 animate-in fade-in duration-150"
					>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="sm:col-span-2">
								<Field>
									<FieldLabel>Título do Efeito</FieldLabel>
									<Input
										placeholder="Ex: Resistência ao Fogo, Bênção do Santuário..."
										value={newBonusTitle}
										onChange={(e) => setNewBonusTitle(e.target.value)}
										required
									/>
								</Field>
							</div>
							<div>
								<Field>
									<FieldLabel>Duração (Dias / Sessões)</FieldLabel>
									<Input
										type="number"
										min={1}
										value={newBonusDuration}
										onChange={(e) =>
											setNewBonusDuration(Number(e.target.value))
										}
									/>
								</Field>
							</div>
						</div>

						<Field>
							<FieldLabel>Descrição dos Efeitos</FieldLabel>
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

				{tempBonusesList.length > 0 && (
					<ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-background/40">
						{tempBonusesList.map((bonus) => (
							<li
								key={bonus.id}
								className="flex items-start justify-between gap-3 px-3.5 py-2.5"
							>
								<div className="space-y-0.5 min-w-0 flex-1">
									<div className="flex flex-wrap items-baseline gap-2">
										<span className="font-medium text-sm text-foreground">
											{bonus.title}
										</span>
										<span className="font-mono text-xs text-primary tabular-nums">
											{bonus.remainingDaysOrSessions} dia(s)
										</span>
									</div>
									{bonus.description && (
										<p className="text-xs text-muted-foreground leading-relaxed">
											{bonus.description}
										</p>
									)}
								</div>

								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={() => handleRemoveBonus(bonus.id)}
									className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
