import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRPGStore } from "@/lib/store";
import type { Quest } from "@/lib/store/types";

interface QuestFormProps {
	initialQuest?: Quest;
	onClose: () => void;
}

export function QuestForm({ initialQuest, onClose }: QuestFormProps) {
	const addQuest = useRPGStore((state) => state.addQuest);
	const updateQuest = useRPGStore((state) => state.updateQuest);

	const [title, setTitle] = useState(initialQuest?.title || "");
	const [category, setCategory] = useState<"main" | "side">(
		initialQuest?.category || "main",
	);
	const [status, setStatus] = useState<"active" | "completed" | "failed">(
		initialQuest?.status || "active",
	);
	const [giverNpcName, setGiverNpcName] = useState(
		initialQuest?.giverNpcName || "",
	);
	const [locationName, setLocationName] = useState(
		initialQuest?.locationName || "",
	);
	const [reward, setReward] = useState(initialQuest?.reward || "");
	const [description, setDescription] = useState(
		initialQuest?.description || "",
	);
	const [notes, setNotes] = useState(initialQuest?.notes || "");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		const payload = {
			title: title.trim(),
			category,
			status,
			giverNpcName: giverNpcName.trim(),
			locationName: locationName.trim(),
			reward: reward.trim(),
			description: description.trim(),
			notes: notes.trim(),
		};

		if (initialQuest) {
			updateQuest(initialQuest.id, payload);
		} else {
			addQuest(payload);
		}

		onClose();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="sm:col-span-2">
					<Field label="Título da Missão">
						<Input
							placeholder="Ex: Matar a Calamidade Usagi, Pintar a Sereia..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
						/>
					</Field>
				</div>
				<div>
					<Field label="Categoria">
						<Select
							value={category}
							onChange={(e) => setCategory(e.target.value as "main" | "side")}
						>
							<option value="main">Principal</option>
							<option value="side">Secundária</option>
						</Select>
					</Field>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div>
					<Field label="Status Atual">
						<Select
							value={status}
							onChange={(e) =>
								setStatus(e.target.value as "active" | "completed" | "failed")
							}
						>
							<option value="active">Em Andamento</option>
							<option value="completed">Concluída</option>
							<option value="failed">Falhada</option>
						</Select>
					</Field>
				</div>
				<div>
					<Field label="Contratante / NPC Solicitante">
						<Input
							placeholder="Ex: Elb, Maico Jackson..."
							value={giverNpcName}
							onChange={(e) => setGiverNpcName(e.target.value)}
						/>
					</Field>
				</div>
				<div>
					<Field label="Localização / Alvo">
						<Input
							placeholder="Ex: Waterdeep, Monastério de Liss..."
							value={locationName}
							onChange={(e) => setLocationName(e.target.value)}
						/>
					</Field>
				</div>
			</div>

			<Field label="Recompensa Prometida">
				<Input
					placeholder="Ex: Desconto em poções, Item mágico, 500 PO..."
					value={reward}
					onChange={(e) => setReward(e.target.value)}
				/>
			</Field>

			<Field label="Descrição dos Objetivos">
				<Textarea
					rows={3}
					placeholder="O que o grupo precisa realizar exatamente..."
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			</Field>

			<Field label="Pistas, Notas & Progresso">
				<Textarea
					rows={2}
					placeholder="Anotações sobre investigações ou próximos passos..."
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
				/>
			</Field>

			<div className="flex justify-end gap-2 pt-2">
				<Button type="button" variant="ghost" onClick={onClose}>
					Cancelar
				</Button>
				<Button type="submit">
					{initialQuest ? "Salvar Alterações" : "Criar Missão"}
				</Button>
			</div>
		</form>
	);
}
