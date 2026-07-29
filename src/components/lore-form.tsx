import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Lore } from "@/lib/store";
import { loreDefaults, useIsWorldStaff, useRPGStore } from "@/lib/store";
import { EntityLinkManager } from "./entity-links";
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
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/toast";
import { WorldEntityPublicationFields } from "./world-entity-publication-fields";

type LoreFormValues = Omit<Lore, "id" | "createdAt" | "updatedAt">;

export function LoreForm() {
	const isStaff = useIsWorldStaff();
	if (!isStaff) return null;
	return (
		<LoreFormDialog
			trigger={
				<Button
					variant="default"
					size="sm"
					aria-keyshortcuts="Alt+N"
					data-shortcut-action="new"
				>
					<Plus className="h-3.5 w-3.5" />
					Novo Lore
				</Button>
			}
		/>
	);
}

interface LoreEditButtonProps {
	lore: Lore;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
}

export function LoreEditButton({
	lore,
	open,
	onOpenChange,
	trigger,
}: LoreEditButtonProps) {
	return (
		<LoreFormDialog
			lore={lore}
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

interface LoreFormDialogProps {
	lore?: Lore;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

function LoreFormDialog({
	lore,
	trigger,
	open: openProp,
	onOpenChange,
}: LoreFormDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const open = openProp ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger render={trigger as React.ReactElement} />}
			<DialogContent className="max-w-2xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
				{open && (
					<LoreFormContent
						key={lore?.id ?? "new"}
						lore={lore}
						setOpen={setOpen}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

interface LoreFormContentProps {
	lore?: Lore;
	setOpen: (open: boolean) => void;
}

function LoreFormContent({ lore, setOpen }: LoreFormContentProps) {
	const isEdit = Boolean(lore);
	const titleId = useId();
	const toast = useToast();

	const addLore = useRPGStore((state) => state.addLore);
	const updateLore = useRPGStore((state) => state.updateLore);
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const navigate = useNavigate();

	const initialCampaignIds = activeCampaignId ? [activeCampaignId] : [];

	const {
		register,
		handleSubmit,
		control,
		setValue,
		formState: { isSubmitting },
	} = useForm<LoreFormValues>({
		defaultValues: {
			...loreDefaults,
			campaignIds: lore?.campaignIds?.length
				? lore.campaignIds
				: initialCampaignIds,
			...(lore ?? {}),
		},
	});

	const imageUrl = useWatch({ control, name: "imageUrl" });
	const watchedValues = useWatch({ control });

	function onSubmit(data: LoreFormValues) {
		const payload: LoreFormValues = {
			...data,
			isSecret: data.visibility === "master_secret",
		};
		let createdId: string | null = null;
		if (isEdit && lore) {
			updateLore(lore.id, payload);
			const syncError = useRPGStore.getState().syncError;
			if (syncError) {
				toast.error({
					title: "Erro ao atualizar lore",
					description: syncError,
				});
				return;
			}
		} else {
			const created = addLore(payload);
			if (created?.id) {
				createdId = created.id;
			} else {
				const syncError = useRPGStore.getState().syncError;
				toast.error({
					title: "Erro ao criar lore",
					description:
						syncError ||
						"Não foi possível salvar o conhecimento. Verifique se você possui permissão para alterar o grimório.",
				});
				return;
			}
		}
		setOpen(false);
		if (createdId) {
			void navigate({
				to: "/lore/$loreId",
				params: { loreId: createdId },
				search: { edit: true },
			});
		}
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="flex h-full min-h-0 flex-col"
		>
			<DialogHeader className="border-b border-border px-6 pt-6 pb-4">
				<DialogTitle className="font-display text-lg">
					{isEdit ? `Editar: ${lore?.title || "Lore"}` : "Novo Lore"}
				</DialogTitle>
				<DialogDescription>
					Mitos, lendas, divindades, eventos históricos do mundo.
				</DialogDescription>
			</DialogHeader>

			<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
				<FormSection title="Identificação">
					<ImageUploader
						value={imageUrl ?? ""}
						onChange={(url) => setValue("imageUrl", url, { shouldDirty: true })}
						label="Ilustração"
						folder="lore"
						libraryName={watchedValues.title}
						size="md"
					/>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<Field label="Título" htmlFor={titleId} className="sm:col-span-2">
							<Input
								id={titleId}
								placeholder="Ex: A Queda do Império de Netheril"
								{...register("title", { required: true })}
							/>
						</Field>
						<Field label="Categoria">
							<Input
								placeholder="História, Religião, Magia..."
								{...register("category")}
							/>
						</Field>
						<Field label="Era / Período">
							<Input placeholder="Ex: Era Glacial" {...register("era")} />
						</Field>
						<Field label="Importância">
							<Select {...register("importance")}>
								<option value="minor">Curiosidade</option>
								<option value="supporting">Relevante</option>
								<option value="major">Importante</option>
								<option value="core">Central da campanha</option>
							</Select>
						</Field>
						<Field label="Fonte / Referência">
							<Input
								placeholder="Ex: livro X, NPC Y..."
								{...register("source")}
							/>
						</Field>
					</div>
					<Field
						label="Tags"
						hint="Separe por vírgula. Ex: divindade, profecia"
					>
						<Input
							placeholder="Ex: profecia, magia antiga"
							{...register("tags")}
						/>
					</Field>
				</FormSection>

				<WorldEntityPublicationFields control={control} setValue={setValue} />

				<FormSection title="Conteúdo">
					<Field label="Conteúdo principal">
						<Textarea
							rows={8}
							placeholder="A história, lenda ou fato a ser registrado..."
							{...register("content")}
						/>
					</Field>
					<Field label="Conhecido por">
						<Input
							placeholder="Sábios, eruditos do reino X..."
							{...register("knownBy")}
						/>
					</Field>
					<Field label="Entidades relacionadas">
						<Input
							placeholder="NPCs, lugares, itens conectados..."
							{...register("relatedEntities")}
						/>
					</Field>
					<Field label="Notas privadas do Mestre">
						<Textarea
							rows={3}
							placeholder="O que está por trás..."
							{...register("notes")}
						/>
					</Field>
				</FormSection>
				<EntityLinkManager
					value={watchedValues.entityLinks ?? []}
					onChange={(links) =>
						setValue("entityLinks", links, { shouldDirty: true })
					}
					sourceValues={watchedValues as Record<string, unknown>}
					currentEntity={{
						entityKind: "lore",
						entityId: lore?.id,
					}}
				/>
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
					loadingText="Salvando..."
				>
					{isEdit ? "Salvar alterações" : "Criar Artigo"}
				</Button>
			</div>
		</form>
	);
}
