import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Item } from "@/lib/store";
import { itemDefaults, useIsWorldStaff, useRPGStore } from "@/lib/store";
import { EntityImagePicker } from "./entity-image-picker";
import { EntityLinkManager } from "./entity-links";
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
import { WorldEntityPublicationFields } from "./world-entity-publication-fields";

type ItemFormValues = Omit<Item, "id" | "createdAt" | "updatedAt">;

export function ItemForm() {
	const isStaff = useIsWorldStaff();
	if (!isStaff) return null;
	return (
		<ItemFormDialog
			trigger={
				<Button
					variant="default"
					size="sm"
					aria-keyshortcuts="Alt+N"
					data-shortcut-action="new"
				>
					<Plus className="h-3.5 w-3.5" />
					Novo Item
				</Button>
			}
		/>
	);
}

interface ItemEditButtonProps {
	item: Item;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
}

export function ItemEditButton({
	item,
	open,
	onOpenChange,
	trigger,
}: ItemEditButtonProps) {
	return (
		<ItemFormDialog
			item={item}
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

interface ItemFormDialogProps {
	item?: Item;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

function ItemFormDialog({
	item,
	trigger,
	open: openProp,
	onOpenChange,
}: ItemFormDialogProps) {
	const isEdit = !!item;
	const [internalOpen, setInternalOpen] = useState(false);
	const nameId = useId();
	const open = openProp ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;

	const addItem = useRPGStore((state) => state.addItem);
	const updateItem = useRPGStore((state) => state.updateItem);
	const navigate = useNavigate();

	const {
		register,
		handleSubmit,
		reset,
		control,
		setValue,
		formState: { isSubmitting },
	} = useForm<ItemFormValues>({
		defaultValues: { ...itemDefaults, ...(item ?? {}) },
	});

	const imageUrl = useWatch({ control, name: "imageUrl" });
	const imageAssetId = useWatch({ control, name: "imageAssetId" });
	const imageFocusY = useWatch({ control, name: "imageFocusY" });
	const imageZoom = useWatch({ control, name: "imageZoom" });
	const watchedValues = useWatch({ control });

	useEffect(() => {
		if (open) reset({ ...itemDefaults, ...(item ?? {}) });
	}, [open, item, reset]);

	function onSubmit(data: ItemFormValues) {
		let createdId: string | null = null;
		if (isEdit && item) updateItem(item.id, data);
		else {
			const created = addItem(data);
			if (created.id) createdId = created.id;
		}
		setOpen(false);
		if (createdId) {
			void navigate({
				to: "/items/$itemId",
				params: { itemId: createdId },
				search: { edit: true },
			});
		}
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
							{isEdit ? `Editar: ${item?.name || "Item"}` : "Novo Item"}
						</DialogTitle>
						<DialogDescription>
							Registre uma arma, armadura, poção ou relíquia.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
						<FormSection title="Identificação">
							<EntityImagePicker
								value={{
									imageUrl: imageUrl ?? "",
									imageAssetId,
									imageFocusY,
									imageZoom,
								}}
								onChange={(patch) => {
									for (const [key, val] of Object.entries(patch)) {
										setValue(key as keyof ItemFormValues, val as never, {
											shouldDirty: true,
										});
									}
								}}
								uploadLabel="Ilustração"
								folder="items"
								libraryName={watchedValues.name}
							/>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<Field label="Nome" htmlFor={nameId} className="sm:col-span-2">
									<Input
										id={nameId}
										placeholder="Ex: Espada Longa Flamejante"
										{...register("name", { required: true })}
									/>
								</Field>
								<Field label="Tipo">
									<Input
										placeholder="Arma, Armadura, Poção..."
										{...register("type")}
									/>
								</Field>
								<Field label="Subtipo">
									<Input
										placeholder="Ex: espada longa, escudo..."
										{...register("subtype")}
									/>
								</Field>
								<Field label="Raridade">
									<Select {...register("rarity")}>
										<option value="comum">Comum</option>
										<option value="incomum">Incomum</option>
										<option value="raro">Raro</option>
										<option value="muito raro">Muito Raro</option>
										<option value="lendário">Lendário</option>
										<option value="artefato">Artefato</option>
									</Select>
								</Field>
								<Field label="Fonte / Livro">
									<Input placeholder="Ex: PHB pg.150" {...register("source")} />
								</Field>
							</div>
						</FormSection>

						<WorldEntityPublicationFields
							control={control}
							setValue={setValue}
						/>

						<FormSection title="Mecânica">
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								<Field label="Peso">
									<Input placeholder="Ex: 1,5 kg" {...register("weight")} />
								</Field>
								<Field label="Valor">
									<Input placeholder="Ex: 50 PO" {...register("value")} />
								</Field>
								<Field label="Cargas">
									<Input placeholder="Ex: 3/7" {...register("charges")} />
								</Field>
							</div>
							<Field label="Atributos / Efeitos mecânicos">
								<Textarea
									rows={3}
									placeholder="1d8 cortante + 1d6 fogo, +1 em Persuasão..."
									{...register("stats")}
								/>
							</Field>
							<Field label="Propriedades" hint="Ex: Versátil (1d10), Alcance">
								<Input
									placeholder="Versátil, Alcance..."
									{...register("properties")}
								/>
							</Field>
						</FormSection>

						<FormSection title="Posse & Sintonização">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<Field label="Pertence a">
									<Input
										placeholder="Personagem ou local"
										{...register("owner")}
									/>
								</Field>
								<Field label="Sintonizado com">
									<Input
										placeholder="Quem está sintonizado"
										{...register("attunedTo")}
									/>
								</Field>
							</div>
							<div className="flex flex-wrap items-center gap-4">
								<label className="flex items-center gap-2 text-[12px] text-muted-foreground">
									<input
										type="checkbox"
										className="h-3.5 w-3.5 rounded border-border accent-primary"
										{...register("requiresAttunement")}
									/>
									Requer sintonização
								</label>
								<label className="flex items-center gap-2 text-[12px] text-muted-foreground">
									<input
										type="checkbox"
										className="h-3.5 w-3.5 rounded border-border accent-primary"
										{...register("equipped")}
									/>
									Equipado
								</label>
							</div>
						</FormSection>

						<FormSection title="Descrição">
							<Field label="Descrição / Lore">
								<Textarea
									rows={4}
									placeholder="Forjada nas profundezas de..."
									{...register("description")}
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
								entityKind: "item",
								entityId: item?.id,
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
							{isEdit ? "Salvar alterações" : "Criar Item"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
