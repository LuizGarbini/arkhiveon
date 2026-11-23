import { useNavigate } from "@tanstack/react-router";
import {
	BookOpen,
	Castle,
	Church,
	Compass,
	Crown,
	Eye,
	Flag,
	Flame,
	FlameKindling,
	Gem,
	Landmark,
	type LucideIcon,
	Mountain,
	Pencil,
	Plus,
	ScrollText,
	Skull,
	Sparkles,
	Star,
	Sun,
	Sword,
	Swords,
	Trophy,
	WandSparkles,
} from "lucide-react";
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
import {
	SelectContent,
	SelectItem,
	SelectRoot,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/toast";

type FactionFormValues = Omit<
	Faction,
	"id" | "createdAt" | "updatedAt" | "worldId"
>;

type IconSelectOption = {
	value: string;
	label: string;
	Icon: LucideIcon;
};

const KIND_OPTIONS: IconSelectOption[] = [
	{ value: "faction", label: "Facção Política / Liga", Icon: Flag },
	{ value: "patron", label: "Patrono de Grupo (Group Patron)", Icon: Crown },
	{
		value: "legendary_family",
		label: "Família Lendária / Linhagem Mítica",
		Icon: Gem,
	},
	{ value: "noble_house", label: "Família Nobre / Casa Real", Icon: Castle },
	{
		value: "guild_order",
		label: "Ordem / Guilda de Aventureiros",
		Icon: Swords,
	},
	{ value: "cult_society", label: "Culto / Seita Secreta", Icon: Eye },
];

const PATRON_OPTIONS: IconSelectOption[] = [
	{ value: "Dragão Ancião", label: "Dragão Ancião", Icon: Flame },
	{
		value: "Ser das Fadas / Arquifada",
		label: "Ser das Fadas / Arquifada",
		Icon: Sparkles,
	},
	{
		value: "Coroa / Soberano Real",
		label: "Coroa / Soberano Real",
		Icon: Landmark,
	},
	{
		value: "Sindicato / Mestre do Crime",
		label: "Sindicato / Mestre do Crime",
		Icon: Sword,
	},
	{
		value: "Academia de Magia / Colegiado",
		label: "Academia de Magia / Colegiado",
		Icon: ScrollText,
	},
	{
		value: "Entidade Celestial / Anjo",
		label: "Entidade Celestial / Anjo",
		Icon: Sun,
	},
	{
		value: "Entidade Infernal / Diabo",
		label: "Entidade Infernal / Diabo",
		Icon: Skull,
	},
	{
		value: "Ordem Religiosa / Templo",
		label: "Ordem Religiosa / Templo",
		Icon: Church,
	},
	{ value: "Outro Patrono", label: "Outro Patrono", Icon: Compass },
];

const LINEAGE_OPTIONS: IconSelectOption[] = [
	{
		value: "Linhagem Dracônica",
		label: "Linhagem Dracônica",
		Icon: FlameKindling,
	},
	{
		value: "Sangue Celestial / Divino",
		label: "Sangue Celestial / Divino",
		Icon: Star,
	},
	{
		value: "Ancestralidade Titan / Gigante",
		label: "Ancestralidade Titan / Gigante",
		Icon: Mountain,
	},
	{
		value: "Heróis Lendários da Primeira Era",
		label: "Heróis Lendários da Primeira Era",
		Icon: Trophy,
	},
	{
		value: "Dinastia de Reis Magos",
		label: "Dinastia de Reis Magos",
		Icon: WandSparkles,
	},
	{
		value: "Outra Linhagem Mítica",
		label: "Outra Linhagem Mítica",
		Icon: BookOpen,
	},
];

function IconSelect({
	value,
	onChange,
	ariaLabel,
	options,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	ariaLabel: string;
	options: readonly IconSelectOption[];
	placeholder?: string;
}) {
	const selected = options.find((option) => option.value === value);
	const SelectedIcon = selected?.Icon;
	return (
		<SelectRoot
			value={selected ? value : null}
			onValueChange={(next) => onChange(String(next ?? ""))}
		>
			<SelectTrigger aria-label={ariaLabel}>
				<SelectValue>
					{() =>
						selected && SelectedIcon ? (
							<span className="flex min-w-0 items-center gap-2">
								<SelectedIcon
									className="size-4 text-muted-foreground"
									aria-hidden
								/>
								<span className="truncate">{selected.label}</span>
							</span>
						) : (
							<span className="truncate text-muted-foreground">
								{placeholder ?? "Selecione"}
							</span>
						)
					}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => {
					const Icon = option.Icon;
					return (
						<SelectItem
							key={option.value}
							value={option.value}
							label={option.label}
						>
							<span className="flex min-w-0 items-center gap-2">
								<Icon className="size-4 text-muted-foreground" aria-hidden />
								<span className="truncate">{option.label}</span>
							</span>
						</SelectItem>
					);
				})}
			</SelectContent>
		</SelectRoot>
	);
}

export function FactionForm() {
	const isStaff = useIsWorldStaff();
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
	const isDnd =
		activeCampaign?.system === "dnd5e" || activeCampaign?.system === "dnd2024";

	if (!isStaff) return null;
	return (
		<FactionFormDialog
			trigger={
				<Button size="sm" type="button" className="gap-1.5 font-bold">
					<Plus className="h-3.5 w-3.5" />
					{isDnd ? "Novo Patrono / Organização" : "Nova Organização"}
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
	const selectedKind = useWatch({ control, name: "kind" }) || "faction";
	const watchedPatronType = useWatch({ control, name: "patronType" }) ?? "";

	useEffect(() => {
		if (!open) return;
		reset({ ...factionDefaults, ...(faction ?? {}) });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- faction fields intentionally omitted
	}, [open, faction?.id, reset]);

	function onSubmit(data: FactionFormValues) {
		const normalized = {
			name: data.name.trim(),
			kind: data.kind || "faction",
			patronType: (data.patronType || "").trim(),
			leader: data.leader.trim(),
			seat: data.seat.trim(),
			goals: data.goals.trim(),
			alignment: data.alignment.trim(),
			influence: data.influence.trim(),
			perks: (data.perks || "").trim(),
			duties: (data.duties || "").trim(),
			contacts: (data.contacts || "").trim(),
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
					errorMessage ?? "Verifique permissões e conexão, e tente novamente.",
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
							{isEdit ? `Editar: ${faction?.name || "Facção"}` : "Nova facção"}
						</DialogTitle>
						<DialogDescription>
							Organizações, guildas e poderes que moldam o Mundo.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
						<FormSection title="Identidade & Categoria">
							<ImageUploader
								value={imageUrl ?? ""}
								onChange={(url) =>
									setValue("imageUrl", url, { shouldDirty: true })
								}
								folder="factions"
								libraryName={watchedName || "Organização"}
								label="Brasão / Imagem"
								size="md"
							/>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<Field
									label="Categoria de Organização"
									className="sm:col-span-2"
								>
									<IconSelect
										ariaLabel="Categoria de Organização"
										value={selectedKind}
										onChange={(next) => {
											setValue("kind", next as FactionFormValues["kind"], {
												shouldDirty: true,
											});
											setValue("patronType", "", { shouldDirty: true });
										}}
										options={KIND_OPTIONS}
									/>
								</Field>

								{selectedKind === "patron" && (
									<Field
										label="Tipo de Patrono (D&D 5e / 2024)"
										className="sm:col-span-2"
									>
										<IconSelect
											ariaLabel="Tipo de Patrono (D&D 5e / 2024)"
											value={watchedPatronType}
											onChange={(next) =>
												setValue("patronType", next, { shouldDirty: true })
											}
											options={PATRON_OPTIONS}
											placeholder="Selecione o tipo de patrono"
										/>
									</Field>
								)}

								{selectedKind === "legendary_family" && (
									<Field
										label="Origem da Linhagem / Sangue Ancestral"
										className="sm:col-span-2"
									>
										<IconSelect
											ariaLabel="Origem da Linhagem / Sangue Ancestral"
											value={watchedPatronType}
											onChange={(next) =>
												setValue("patronType", next, { shouldDirty: true })
											}
											options={LINEAGE_OPTIONS}
											placeholder="Selecione a origem da linhagem"
										/>
									</Field>
								)}

								<Field label="Nome" htmlFor={nameId} className="sm:col-span-2">
									<Input
										id={nameId}
										placeholder="Ex: Dragão Ignis, Família Pendragon, Harpers..."
										{...register("name", { required: true })}
									/>
								</Field>
								<Field label="Líder / Matriarca / Entidade">
									<Input
										placeholder="Ex: Xanathar, Lorde Neverember..."
										{...register("leader")}
									/>
								</Field>
								<Field label="Sede / Base / Solar">
									<Input
										placeholder="Ex: Waterdeep, Distrito Nobre..."
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
										placeholder="Ex: Local, Regional, Global..."
										{...register("influence")}
									/>
								</Field>
							</div>
						</FormSection>

						{selectedKind === "patron" && (
							<FormSection title="Benefícios & Deveres do Patrono (Mesa D&D)">
								<Field label="Recursos & Favores Concedidos aos Jogadores">
									<Textarea
										rows={3}
										placeholder="Ex: Acesso a tomos mágicos, advogados da coroa, biblioteca restrita, financiamento de equipamentos..."
										{...register("perks")}
									/>
								</Field>
								<Field label="Deveres & Exigências dos Jogadores">
									<Textarea
										rows={3}
										placeholder="Ex: Dízimo de 10% do tesouro, missões secretas mensais, proteção de relíquias..."
										{...register("duties")}
									/>
								</Field>
							</FormSection>
						)}

						{selectedKind === "legendary_family" && (
							<FormSection title="Heranças & Tradições da Família Lendária">
								<Field label="Recursos, Bens & Heranças da Linhagem">
									<Textarea
										rows={3}
										placeholder="Ex: Armas de família, terras ancestrais, imunidade diplomática local..."
										{...register("perks")}
									/>
								</Field>
								<Field label="Código & Tradições da Família">
									<Textarea
										rows={3}
										placeholder="Ex: Nunca recusar um desafio de honra, proteger a relíquia do fundador..."
										{...register("duties")}
									/>
								</Field>
							</FormSection>
						)}

						<FormSection title="Agenda, Contatos & História">
							<Field label="Contatos & Informantes Principais">
								<Input
									placeholder="Ex: Emissário Sir Tristan, Espiã Nyx..."
									{...register("contacts")}
								/>
							</Field>
							<Field label="Objetivos">
								<Textarea
									rows={3}
									placeholder="O que a organização/patrono/família busca? Quais são seus planos?"
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
							{isEdit ? "Salvar Alterações" : "Salvar Registro"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
