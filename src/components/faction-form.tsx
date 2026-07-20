import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FormSection } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useIsWorldStaff, useRPGStore } from "@/lib/store";
import { ImageUploader } from "./image-uploader";

function emptyFactionForm() {
	return {
		name: "",
		leader: "",
		seat: "",
		goals: "",
		alignment: "",
		influence: "",
		description: "",
		imageUrl: "",
	};
}

export function FactionForm() {
	const addFaction = useRPGStore((s) => s.addFaction);
	const isStaff = useIsWorldStaff();
	const toast = useToast();
	const [open, setOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [form, setForm] = useState(emptyFactionForm);
	const nameId = useId();

	if (!isStaff) return null;

	function updateField<K extends keyof ReturnType<typeof emptyFactionForm>>(
		key: K,
		value: ReturnType<typeof emptyFactionForm>[K],
	) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			setForm(emptyFactionForm());
			setSubmitting(false);
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!form.name.trim() || submitting) return;

		setSubmitting(true);
		const created = addFaction({
			name: form.name.trim(),
			leader: form.leader.trim(),
			seat: form.seat.trim(),
			goals: form.goals.trim(),
			alignment: form.alignment.trim(),
			influence: form.influence.trim(),
			description: form.description.trim(),
			imageUrl: form.imageUrl.trim(),
		});
		if (!created) {
			const errorMessage = useRPGStore.getState().syncError;
			toast.error({
				title: "Não foi possível criar a facção",
				description:
					errorMessage ??
					"Verifique permissões e conexão, e tente novamente.",
			});
			setSubmitting(false);
			return;
		}
		setForm(emptyFactionForm());
		setOpen(false);
		setSubmitting(false);
		toast.success({
			title: "Facção criada",
			description: "A organização foi adicionada ao Mundo.",
		});
	}

	return (
		<>
			<Button size="sm" type="button" onClick={() => setOpen(true)}>
				<Plus className="h-3.5 w-3.5" />
				Nova facção
			</Button>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="max-w-2xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
					<form
						onSubmit={handleSubmit}
						className="flex h-full min-h-0 flex-col"
					>
						<DialogHeader className="border-b border-border px-6 pt-6 pb-4">
							<DialogTitle className="font-display text-lg">
								Nova facção
							</DialogTitle>
							<DialogDescription>
								Organizações, guildas e poderes que moldam o Mundo.
							</DialogDescription>
						</DialogHeader>

						<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
							<FormSection title="Identidade">
								<ImageUploader
									value={form.imageUrl}
									onChange={(url) => updateField("imageUrl", url)}
									folder="factions"
									libraryName={form.name || "Facção"}
									label="Brasão / imagem"
									size="md"
								/>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<Field
										label="Nome"
										htmlFor={nameId}
										className="sm:col-span-2"
									>
										<Input
											id={nameId}
											placeholder="Ex: Guilda dos Ladrões de Waterdeep"
											value={form.name}
											onChange={(e) => updateField("name", e.target.value)}
											required
										/>
									</Field>
									<Field label="Líder">
										<Input
											placeholder="Ex: Xanathar"
											value={form.leader}
											onChange={(e) =>
												updateField("leader", e.target.value)
											}
										/>
									</Field>
									<Field label="Sede">
										<Input
											placeholder="Ex: Esgotos de Waterdeep"
											value={form.seat}
											onChange={(e) => updateField("seat", e.target.value)}
										/>
									</Field>
									<Field label="Alinhamento">
										<Input
											placeholder="Ex: Caótico e Neutro"
											value={form.alignment}
											onChange={(e) =>
												updateField("alignment", e.target.value)
											}
										/>
									</Field>
									<Field label="Influência">
										<Input
											placeholder="Ex: Regional, continental..."
											value={form.influence}
											onChange={(e) =>
												updateField("influence", e.target.value)
											}
										/>
									</Field>
								</div>
							</FormSection>

							<FormSection title="Agenda">
								<Field label="Objetivos">
									<Textarea
										rows={3}
										placeholder="O que a facção busca? Quais são seus planos?"
										value={form.goals}
										onChange={(e) => updateField("goals", e.target.value)}
									/>
								</Field>
								<Field label="Descrição">
									<Textarea
										rows={4}
										placeholder="História, estrutura, reputação pública e segredos..."
										value={form.description}
										onChange={(e) =>
											updateField("description", e.target.value)
										}
									/>
								</Field>
							</FormSection>
						</div>

						<div className="flex items-center justify-end gap-2 border-t border-border bg-card-elevated/40 px-6 py-3">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => handleOpenChange(false)}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								size="sm"
								loading={submitting}
								loadingText="Criando..."
							>
								Criar facção
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
