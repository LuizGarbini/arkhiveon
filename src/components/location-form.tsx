import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { GameLocation } from "@/lib/store";
import { locationDefaults, useIsWorldStaff, useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";
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
import { Field, FormSection, FormTabs } from "./ui/form-tabs";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/toast";
import { WorldEntityPublicationFields } from "./world-entity-publication-fields";

const TABS = [
	{ id: "basic", label: "Básico" },
	{ id: "society", label: "Sociedade" },
	{ id: "history", label: "História" },
];

type LocationFormValues = Omit<GameLocation, "id" | "createdAt" | "updatedAt">;

export function LocationForm() {
	const isStaff = useIsWorldStaff();
	if (!isStaff) return null;
	return (
		<LocationFormDialog
			trigger={
				<Button
					variant="default"
					size="sm"
					aria-keyshortcuts="Alt+N"
					data-shortcut-action="new"
				>
					<Plus className="h-3.5 w-3.5" />
					Novo Local
				</Button>
			}
		/>
	);
}

interface LocationEditButtonProps {
	location: GameLocation;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	defaultTab?: string;
}

export function LocationEditButton({
	location,
	open,
	onOpenChange,
	trigger,
	defaultTab,
}: LocationEditButtonProps) {
	return (
		<LocationFormDialog
			location={location}
			open={open}
			onOpenChange={onOpenChange}
			defaultTab={defaultTab}
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

interface LocationFormProps {
	location?: GameLocation;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultTab?: string;
}

export function LocationFormDialog({
	location,
	trigger,
	open: openProp,
	onOpenChange,
	defaultTab,
}: LocationFormProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const open = openProp ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger render={trigger as React.ReactElement} />}
			<DialogContent className="max-w-2xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
				{open && (
					<LocationFormContent
						key={location?.id ?? "new"}
						location={location}
						setOpen={setOpen}
						defaultTab={defaultTab}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

interface LocationFormContentProps {
	location?: GameLocation;
	setOpen: (open: boolean) => void;
	defaultTab?: string;
}

function LocationFormContent({
	location,
	setOpen,
	defaultTab,
}: LocationFormContentProps) {
	const isEdit = Boolean(location);
	const nameId = useId();
	const [tab, setTab] = useState(defaultTab || TABS[0].id);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
	const toast = useToast();

	const addLocation = useRPGStore((state) => state.addLocation);
	const updateLocation = useRPGStore((state) => state.updateLocation);
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const navigate = useNavigate();

	const initialCampaignIds = activeCampaignId ? [activeCampaignId] : [];

	const {
		register,
		handleSubmit,
		control,
		setValue,
		formState: { isSubmitting },
	} = useForm<LocationFormValues>({
		defaultValues: {
			...locationDefaults,
			campaignIds: location?.campaignIds?.length
				? location.campaignIds
				: initialCampaignIds,
			...(location ?? {}),
		},
	});

	const imageUrl = useWatch({ control, name: "imageUrl" });
	const watchedValues = useWatch({ control });

	function handleTabChange(nextTab: string) {
		const currentIndex = TABS.findIndex((t) => t.id === tab);
		const nextIndex = TABS.findIndex((t) => t.id === nextTab);
		if (nextIndex !== -1 && currentIndex !== -1) {
			setSlideDirection(nextIndex > currentIndex ? "left" : "right");
		}
		setTab(nextTab);
	}

	function onSubmit(data: LocationFormValues) {
		let createdId: string | null = null;
		if (isEdit && location) {
			updateLocation(location.id, data);
			const syncError = useRPGStore.getState().syncError;
			if (syncError) {
				toast.error({
					title: "Erro ao atualizar localização",
					description: syncError,
				});
				return;
			}
		} else {
			const created = addLocation(data);
			if (created?.id) {
				createdId = created.id;
			} else {
				const syncError = useRPGStore.getState().syncError;
				toast.error({
					title: "Erro ao criar localização",
					description:
						syncError ||
						"Não foi possível salvar a localização. Verifique se você possui permissão para alterar o grimório.",
				});
				return;
			}
		}
		setOpen(false);
	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="flex h-full min-h-0 flex-col"
		>
			<DialogHeader className="border-b border-border px-6 pt-6 pb-4">
				<DialogTitle className="font-display text-lg">
					{isEdit ? `Editar: ${location?.name || "Local"}` : "Novo Local"}
				</DialogTitle>
				<DialogDescription>
					Registre reinos, cidades, masmorras e pontos de interesse.
				</DialogDescription>
				<div className="pt-2">
					<FormTabs tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />
				</div>
			</DialogHeader>

			<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
				<div
					key={tab}
					className={cn(
						"space-y-6",
						slideDirection === "left"
							? "t-tab-slide-left"
							: "t-tab-slide-right",
					)}
				>
					{tab === "basic" && (
								<>
									<FormSection title="Identificação">
										<ImageUploader
											value={imageUrl ?? ""}
											onChange={(url) =>
												setValue("imageUrl", url, { shouldDirty: true })
											}
											label="Imagem"
											folder="locations"
											libraryName={watchedValues.name}
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
													placeholder="Ex: Cidade Livre de Greyhawk"
													{...register("name", { required: true })}
												/>
											</Field>
											<Field label="Tipo">
												<Input
													placeholder="Ex: Cidade, Caverna..."
													{...register("type")}
												/>
											</Field>
											<Field label="Região">
												<Input
													placeholder="Ex: Reino de Tethyr"
													{...register("region")}
												/>
											</Field>
											<Field label="Local pai" hint="Sub-localidade?">
												<Input
													placeholder="Ex: dentro de Cidade Livre"
													{...register("parentLocation")}
												/>
											</Field>
											<Field label="Nível de perigo">
												<Select {...register("dangerLevel")}>
													<option value="seguro">Seguro</option>
													<option value="baixo">Baixo</option>
													<option value="moderado">Moderado</option>
													<option value="alto">Alto</option>
													<option value="mortal">Mortal</option>
												</Select>
											</Field>
											<Field label="Clima">
												<Input
													placeholder="Ex: Temperado"
													{...register("climate")}
												/>
											</Field>
											<Field label="Terreno">
												<Input
													placeholder="Ex: Floresta densa"
													{...register("terrain")}
												/>
											</Field>
										</div>
										<Field label="Descrição">
											<Textarea
												rows={3}
												placeholder="Como o local se parece à primeira vista?"
												{...register("description")}
											/>
										</Field>
									</FormSection>
									<WorldEntityPublicationFields
										control={control}
										setValue={setValue}
									/>
								</>
							)}

							{tab === "society" && (
								<FormSection title="Sociedade & Política">
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
										<Field label="População">
											<Input
												placeholder="Ex: ~5.000"
												{...register("population")}
											/>
										</Field>
										<Field label="Governo">
											<Input
												placeholder="Conselho, Rei..."
												{...register("government")}
											/>
										</Field>
										<Field label="Economia">
											<Input
												placeholder="Comércio, mineração..."
												{...register("economy")}
											/>
										</Field>
										<Field label="Habitantes notáveis">
											<Input
												placeholder="Personalidades importantes"
												{...register("notableInhabitants")}
											/>
										</Field>
									</div>
									<Field label="Pontos de interesse">
										<Textarea
											rows={4}
											placeholder="Templos, mercados, masmorras..."
											{...register("keyFeatures")}
										/>
									</Field>
									<Field label="Ganchos de aventura">
										<Textarea
											rows={3}
											placeholder="Quests que podem surgir aqui."
											{...register("hooks")}
										/>
									</Field>
								</FormSection>
							)}

							{tab === "history" && (
								<FormSection title="História & Mapa">
									<Field label="História do local">
										<Textarea
											rows={6}
											placeholder="Origens, eventos marcantes..."
											{...register("history")}
										/>
									</Field>
									<Field label="URL do mapa (opcional)">
										<Input placeholder="https://..." {...register("mapUrl")} />
									</Field>
								</FormSection>
							)}
							{tab === "history" && (
								<EntityLinkManager
									value={watchedValues.entityLinks ?? []}
									onChange={(links) =>
										setValue("entityLinks", links, { shouldDirty: true })
									}
									sourceValues={watchedValues as Record<string, unknown>}
									currentEntity={{
										entityKind: "location",
										entityId: location?.id,
									}}
								/>
							)}
						</div>
					</div>

					<div className="flex items-center justify-between gap-2 border-t border-border bg-card-elevated/40 px-6 py-3">
						<label className="flex items-center gap-2 text-[12px] text-muted-foreground">
							<input
								type="checkbox"
								className="h-3.5 w-3.5 rounded border-border accent-primary"
								{...register("visited")}
							/>
							O grupo já visitou
						</label>
						<div className="flex items-center gap-2">
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
								{isEdit ? "Salvar alterações" : "Criar Local"}
							</Button>
						</div>
					</div>
				</form>
	);
}
