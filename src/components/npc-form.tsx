import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Npc } from "@/lib/store";
import { npcDefaults, useIsWorldStaff, useRPGStore } from "@/lib/store";
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
	{ id: "personality", label: "Personalidade" },
	{ id: "secrets", label: "Segredos" },
	{ id: "stats", label: "Stats" },
];

type NpcFormValues = Omit<Npc, "id" | "createdAt" | "updatedAt">;

export function NpcForm() {
	const isStaff = useIsWorldStaff();
	if (!isStaff) return null;
	return (
		<NpcFormDialog
			trigger={
				<Button
					variant="default"
					size="sm"
					aria-keyshortcuts="Alt+N"
					data-shortcut-action="new"
				>
					<Plus className="h-3.5 w-3.5" />
					Novo NPC/Monstro
				</Button>
			}
		/>
	);
}

interface NpcEditButtonProps {
	npc: Npc;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	defaultTab?: string;
}

export function NpcEditButton({
	npc,
	open,
	onOpenChange,
	trigger,
	defaultTab,
}: NpcEditButtonProps) {
	return (
		<NpcFormDialog
			npc={npc}
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

interface NpcFormDialogProps {
	npc?: Npc;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultTab?: string;
}

function NpcFormDialog({
	npc,
	trigger,
	open: openProp,
	onOpenChange,
	defaultTab,
}: NpcFormDialogProps) {
	const isEdit = !!npc;
	const [internalOpen, setInternalOpen] = useState(false);
	const open = openProp ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;

	const [tab, setTab] = useState(defaultTab || TABS[0].id);
	const [prevIndex, setPrevIndex] = useState(-1);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);
	const addNpc = useRPGStore((state) => state.addNpc);
	const updateNpc = useRPGStore((state) => state.updateNpc);
	const characters = useRPGStore((state) => state.characters);
	const toast = useToast();
	const navigate = useNavigate();

	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const initialCampaignIds = activeCampaignId ? [activeCampaignId] : [];

	const {
		register,
		handleSubmit,
		reset,
		control,
		setValue,
		formState: { isSubmitting },
	} = useForm<NpcFormValues>({
		defaultValues: {
			...npcDefaults,
			campaignIds: initialCampaignIds,
			...(npc ?? {}),
		},
	});

	const imageUrl = useWatch({ control, name: "imageUrl" });
	const watchedValues = useWatch({ control });
	const watchedKind = useWatch({ control, name: "kind" }) ?? "npc";
	const isMonster = watchedKind === "monster";

	useEffect(() => {
		const index = TABS.findIndex((t) => t.id === tab);
		if (index !== -1) {
			if (prevIndex !== -1 && index < prevIndex) {
				setSlideDirection("right");
			} else if (prevIndex !== -1 && index > prevIndex) {
				setSlideDirection("left");
			}
			setPrevIndex(index);
		}
	}, [tab, prevIndex]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: npc fields intentionally omitted
	useEffect(() => {
		if (!open) return;
		// Só reseta ao abrir / trocar de NPC. Dependência em `npc` inteiro
		// apagava imageUrl após upload (store recria a referência do objeto).
		reset({
			...npcDefaults,
			campaignIds: npc?.campaignIds?.length
				? npc.campaignIds
				: initialCampaignIds,
			...(npc ?? {}),
		});
		setPrevIndex(-1);
	}, [open, npc?.id, reset]);

	useEffect(() => {
		if (!open) return;
		setTab(defaultTab || TABS[0].id);
	}, [open, defaultTab]);

	function onSubmit(data: NpcFormValues) {
		const normalized = {
			...data,
			kind: data.kind ?? "npc",
			name: data.name.trim(),
			race: data.race.trim(),
			role: data.role.trim(),
			cr: data.cr.trim(),
			stats: data.stats.trim(),
			description: data.description.trim(),
		};

		if (!normalized.name) {
			toast.error({
				title: isMonster
					? "Nome do monstro obrigatório"
					: "Nome do NPC obrigatório",
				description: "Informe um nome antes de salvar este registro.",
			});
			setTab("basic");
			return;
		}

		let createdId: string | null = null;
		if (isEdit && npc) updateNpc(npc.id, normalized);
		else {
			const created = addNpc(normalized);
			if (!created) {
				toast.error({
					title: "Limite de registros atingido",
					description:
						"Remova algum registro ou faça upgrade antes de criar outro.",
				});
				return;
			}
			createdId = created.id;
		}
		setOpen(false);
		if (createdId) {
			void navigate({
				to: "/npcs/$npcId",
				params: { npcId: createdId },
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
							{isEdit
								? `Editar: ${npc?.name || (isMonster ? "Monstro" : "NPC")}`
								: isMonster
									? "Novo Monstro"
									: "Novo NPC"}
						</DialogTitle>
						<DialogDescription>
							{isMonster
								? "Criaturas, encontros e ameaças prontas para entrar em cena."
								: "Aliados, inimigos e mercadores que dão vida ao mundo."}
						</DialogDescription>
						<div className="mt-3">
							<FormTabs tabs={TABS} value={tab} onChange={setTab} />
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
									<FormSection title="Identidade">
										<div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-background/45 p-1">
											<button
												type="button"
												onClick={() =>
													setValue("kind", "npc", {
														shouldDirty: true,
														shouldValidate: true,
													})
												}
												className={`rounded-lg px-3 py-2 text-[12px] font-bold transition-colors ${
													!isMonster
														? "bg-card text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												NPC
											</button>
											<button
												type="button"
												onClick={() =>
													setValue("kind", "monster", {
														shouldDirty: true,
														shouldValidate: true,
													})
												}
												className={`rounded-lg px-3 py-2 text-[12px] font-bold transition-colors ${
													isMonster
														? "bg-card text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												Monstro
											</button>
										</div>
										<ImageUploader
											value={imageUrl ?? ""}
											onChange={(url) =>
												setValue("imageUrl", url, { shouldDirty: true })
											}
											label="Retrato"
											folder="npcs"
											libraryName={watchedValues.name}
											size="md"
										/>
										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											<Field label="Nome">
												<Input
													placeholder={
														isMonster
															? "Ex: Hidra de Cinzas"
															: "Ex: Bob, o Taberneiro"
													}
													{...register("name", { required: true })}
												/>
											</Field>
											<Field label="Raça">
												<Input
													placeholder={
														isMonster ? "Ex: Aberração" : "Ex: Humano"
													}
													{...register("race")}
												/>
											</Field>
											<Field label="Papel / Ocupação">
												<Input
													placeholder={
														isMonster
															? "Ex: Elite, solo, enxame"
															: "Ex: Mercador"
													}
													{...register("role")}
												/>
											</Field>
											<Field label="Localização">
												<Input
													placeholder="Ex: Vila de Vallaki"
													{...register("location")}
												/>
											</Field>
											<Field label="Facção / Organização">
												<Input
													placeholder="Ex: Guarda da Cidade"
													{...register("faction")}
												/>
											</Field>
											<Field label="Tendência">
												<Input
													placeholder="Ex: Neutro"
													{...register("alignment")}
												/>
											</Field>
											<Field label="Disposição">
												<Select {...register("disposition")}>
													<option value="hostile">Hostil</option>
													<option value="unfriendly">Antipático</option>
													<option value="neutral">Neutro</option>
													<option value="friendly">Amigável</option>
													<option value="ally">Aliado</option>
												</Select>
											</Field>
											<Field label="Importância">
												<Select {...register("importance")}>
													<option value="minor">Figurante</option>
													<option value="supporting">Coadjuvante</option>
													<option value="major">Importante</option>
													<option value="boss">Vilão / Chefe</option>
													<option value="unknown">Desconhecida</option>
												</Select>
											</Field>
											<Field label="CR / Nível">
												<Input placeholder="Ex: 1/4 ou 5" {...register("cr")} />
											</Field>
											<Field label="Ficha vinculada">
												<Select {...register("linkedCharacterId")}>
													<option value="">Nenhuma ficha vinculada</option>
													{characters.map((character) => (
														<option key={character.id} value={character.id}>
															{character.characterName || "Ficha sem nome"}
														</option>
													))}
												</Select>
											</Field>
										</div>
										<Field label="Descrição">
											<Textarea
												rows={3}
												placeholder={
													isMonster
														? "Que tipo de ameaça ele representa? Onde aparece?"
														: "Quem é este NPC? Como o grupo o conheceu?"
												}
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

							{tab === "personality" && (
								<FormSection title="Personalidade & Aparência">
									<Field label="Aparência">
										<Textarea
											rows={3}
											placeholder="Como ele se parece?"
											{...register("appearance")}
										/>
									</Field>
									<Field
										label="Tiques / Maneirismos"
										hint="Voz, sotaque, gestos..."
									>
										<Textarea
											rows={2}
											placeholder="Sempre coça o queixo antes de mentir."
											{...register("mannerisms")}
										/>
									</Field>
									<Field label="Motivações">
										<Textarea
											rows={2}
											placeholder="O que ele quer? Por quê?"
											{...register("motivations")}
										/>
									</Field>
									<Field label="Relacionamentos">
										<Textarea
											rows={2}
											placeholder="Quem ele conhece?"
											{...register("relationships")}
										/>
									</Field>
								</FormSection>
							)}

							{tab === "secrets" && (
								<FormSection
									title="Segredos do Mestre"
									description="Apenas o Mestre vê — informações reveladas conforme a campanha."
								>
									<Field label="Segredos">
										<Textarea
											rows={6}
											placeholder="Verdades ocultas, traições, planos..."
											{...register("secrets")}
										/>
									</Field>
								</FormSection>
							)}

							{tab === "stats" && (
								<FormSection
									title="Bloco de Stats"
									description={
										isMonster
											? "Cole ou descreva o stat block do monstro para usar em combate."
											: "Cole ou descreva o stat block do NPC se for relevante para combate."
									}
								>
									<Field label="Stats / Atributos">
										<Textarea
											rows={8}
											placeholder={
												"FOR 14 (+2)  DES 12 (+1)  CON 14 (+2)\nINT 10 (+0)  SAB 11 (+0)  CAR 16 (+3)\nCA 15 — HP 27 — Ataques: ..."
											}
											{...register("stats")}
											className="font-mono text-[12px]"
										/>
									</Field>
								</FormSection>
							)}
							{tab === "basic" && (
								<EntityLinkManager
									value={watchedValues.entityLinks ?? []}
									onChange={(links) =>
										setValue("entityLinks", links, { shouldDirty: true })
									}
									sourceValues={watchedValues as Record<string, unknown>}
									currentEntity={{
										entityKind: "npc",
										entityId: npc?.id,
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
								{...register("isAlive")}
							/>
							{isMonster ? "Monstro está vivo" : "NPC está vivo"}
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
								{isEdit
									? "Salvar alterações"
									: isMonster
										? "Salvar monstro"
										: "Salvar NPC"}
							</Button>
						</div>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
