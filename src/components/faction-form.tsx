import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Faction } from "@/lib/store";
import { factionDefaults, useIsWorldStaff, useRPGStore } from "@/lib/store";
import { ImageUploader } from "./image-uploader";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";
import { Field, FormSection } from "./ui/form-tabs";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/toast";

type FactionFormValues = Omit<Faction, "id" | "createdAt" | "updatedAt" | "worldId">;

export function FactionForm() {
	const isStaff = useIsWorldStaff();
	if (!isStaff) return null;
	return (
		<FactionFormDialog
			trigger={
				<Button size="sm" type="button">
					<Plus className="h-3.5 w-3.5" />
					Nova facção
				</Button>
			}
		/>
	);
}

interface FactionEditButtonProps {
	faction: Faction;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
}

export function FactionEditButton({
	faction,
	open,
	onOpenChange,
	trigger,
}: FactionEditButtonProps) {
	return (
		<FactionFormDialog
			faction={faction}
			open={open}
			onOpenChange={onOpenChange}
			trigger={
				trigger === undefined ? (
					<Button variant="ghost" size="sm">
						<Pencil className="h-3.5 w-3.5" />
						Editar
					</Button>
				) : (
					trigger
				)
			}
		/>
	);
}

interface FactionFormDialogProps {
	faction?: Faction;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

function FactionFormDialog({
	faction,
	trigger,
	open: openProp,
	onOpenChange,
}: FactionFormDialogProps) {
	const isEdit = !!faction;
	const [internalOpen, setInternalOpen] = useState(false);
	const open = openProp ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;
	const nameId = useId();
	const toast = useToast();
	const navigate = useNavigate();
	const addFaction = useRPGStore((s) => s.addFaction);
	const updateFaction = useRPGStore((s) => s.updateFaction);

	const {
		register,
		handleSubmit,
		reset,
		control,
		setValue,
		formState: { isSubmitting },
	} = useForm<FactionFormValues>({
		defaultValues: { ...factionDefaults, ...(faction ?? {}) },
	});

	const imageUrl = useWatch({ control, name: "imageUrl" });
	const watchedName = useWatch({ control, name: "name" });

	useEffect(() => {
		if (!open) return;
		reset({ ...factionDefaults, ...(faction ?? {}) });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- faction fields intentionally omitted
	}, [open, faction?.id, reset]);

	function onSubmit(data: FactionFormValues) {
		const normalized = {
			name: data.name.trim(),
			leader: data.leader.trim(),
			seat: data.seat.trim(),
			goals: data.goals.trim(),
			alignment: data.alignment.trim(),
			influence: data.influence.trim(),
			description: data.description.trim(),
			imageUrl: data.imageUrl.trim(),
		};

		if (!normalized.name) {
			toast.error({
				title: "Nome obrigatório",
				description: "Informe um nome antes de salvar a facção.",
			});
			return;
		}

		if (isEdit && faction) {
			updateFaction(faction.id, normalized);
			toast.success({
				title: "Facção atualizada",
				description: "As alterações foram salvas.",
			});
			setOpen(false);
			return;
		}

		const created = addFaction(normalized);
		if (!created) {
			const errorMessage = useRPGStore.getState().syncError;
			toast.error({
				title: "Não foi possível criar a facção",
				description:
					errorMessage ??
					"Verifique permissões e conexão, e tente novamente.",
			});
			return;
		}

		setOpen(false);
		toast.success({
			title: "Facção criada",
			description: "A organização foi adicionada ao Mundo.",
		});
		void navigate({
			to: "/factions/$factionId",
			params: { factionId: created.id },
			search: { edit: true },
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger render={trigger as React.ReactElement} />}
			<DialogContent className="max-w-2xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex h-full min-h-0 flex-col"
				>
					<DialogHeader className="border-b border-border px-6 pt-6 pb-4">
						<DialogTitle className="font-display text-lg">
							{isEdit
								? `Editar: ${faction?.name || "Facção"}`
								: "Nova facção"}
						</DialogTitle>
						<DialogDescription>
							Organizações, guildas e poderes que moldam o Mundo.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
						<FormSection title="Identidade">
							<ImageUploader
								value={imageUrl ?? ""}
								onChange={(url) =>
									setValue("imageUrl", url, { shouldDirty: true })
								}
								folder="factions"
								libraryName={watchedName || "Facção"}
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
										{...register("name", { required: true })}
									/>
								</Field>
								<Field label="Líder">
									<Input
										placeholder="Ex: Xanathar"
										{...register("leader")}
									/>
								</Field>
								<Field label="Sede">
									<Input
										placeholder="Ex: Esgotos de Waterdeep"
										{...register("seat")}
									/>
								</Field>
								<Field label="Alinhamento">
									<Input
										placeholder="Ex: Caótico e Neutro"
										{...register("alignment")}
									/>
								</Field>
								<Field label="Influência">
									<Input
										placeholder="Ex: Regional, continental..."
										{...register("influence")}
									/>
								</Field>
							</div>
						</FormSection>

						<FormSection title="Agenda">
							<Field label="Objetivos">
								<Textarea
									rows={3}
									placeholder="O que a facção busca? Quais são seus planos?"
									{...register("goals")}
								/>
							</Field>
							<Field label="Descrição">
								<Textarea
									rows={4}
									placeholder="História, estrutura, reputação pública e segredos..."
									{...register("description")}
								/>
							</Field>
						</FormSection>
					</div>

					<div className="flex items-center justify-end gap-2 border-t border-border bg-card-elevated/40 px-6 py-3">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							size="sm"
							loading={isSubmitting}
							loadingText={isEdit ? "Salvando..." : "Criando..."}
						>
							{isEdit ? "Salvar" : "Criar facção"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
