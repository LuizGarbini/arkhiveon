import { useEffect, useId, useState } from "react";
import { useRPGStore } from "@/lib/store";
import type { Campaign } from "@/lib/store/types";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface CampaignFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	campaign?: Campaign | null;
}

export function CampaignForm({
	open,
	onOpenChange,
	campaign,
}: CampaignFormProps) {
	const createCampaign = useRPGStore((s) => s.createCampaign);
	const updateCampaign = useRPGStore((s) => s.updateCampaign);
	const switchCampaign = useRPGStore((s) => s.switchCampaign);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const nameInputId = useId();
	const descInputId = useId();

	useEffect(() => {
		if (open) {
			setName(campaign?.name ?? "");
			setDescription(campaign?.description ?? "");
		}
	}, [open, campaign]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim() || isSaving) return;

		setIsSaving(true);
		try {
			if (campaign) {
				updateCampaign(campaign.id, {
					name: name.trim(),
					description: description.trim(),
				});
			} else {
				const created = await createCampaign(name.trim(), description.trim());
				await switchCampaign(created.id);
			}
			setName("");
			setDescription("");
			onOpenChange(false);
		} catch (error) {
			console.error("Erro ao salvar campanha:", error);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="font-display">
						{campaign ? "Editar Campanha" : "Nova Campanha"}
					</DialogTitle>
					<DialogDescription>
						{campaign
							? "Altere as informações da campanha abaixo."
							: "Crie uma nova campanha com ambiente independente. Todos os dados começarão do zero."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<label
							htmlFor={nameInputId}
							className="text-[12px] font-semibold text-foreground"
						>
							Nome da Campanha *
						</label>
						<Input
							id={nameInputId}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ex: A Maldição de Strahd"
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<label
							htmlFor={descInputId}
							className="text-[12px] font-semibold text-foreground"
						>
							Descrição
						</label>
						<Textarea
							id={descInputId}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Uma breve descrição da campanha..."
							rows={3}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={!name.trim() || isSaving}>
							{isSaving
								? "Salvando..."
								: campaign
									? "Salvar Alterações"
									: "Criar Campanha"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
