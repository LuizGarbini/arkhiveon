import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Session } from "@/lib/store";
import { sessionDefaults, useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";
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
import { Field, FormSection, FormTabs } from "./ui/form-tabs";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const TABS = [
	{ id: "basic", label: "Visão Geral" },
	{ id: "people", label: "Presentes" },
	{ id: "events", label: "Eventos" },
	{ id: "rewards", label: "Recompensas" },
	{ id: "dm", label: "Notas do Mestre" },
];

type SessionFormValues = Omit<Session, "id" | "createdAt" | "updatedAt">;

export function SessionForm() {
	return (
		<SessionFormDialog
			trigger={
				<Button
					variant="default"
					size="sm"
					aria-keyshortcuts="Alt+N"
					data-shortcut-action="new"
				>
					<Plus className="h-3.5 w-3.5" />
					Nova Sessão
				</Button>
			}
		/>
	);
}

interface SessionEditButtonProps {
	session: Session;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	defaultTab?: string;
}

export function SessionEditButton({
	session,
	open,
	onOpenChange,
	trigger,
	defaultTab,
}: SessionEditButtonProps) {
	return (
		<SessionFormDialog
			session={session}
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

interface SessionFormDialogProps {
	session?: Session;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultTab?: string;
}

function SessionFormDialog({
	session,
	trigger,
	open: openProp,
	onOpenChange,
	defaultTab,
}: SessionFormDialogProps) {
	const isEdit = !!session;
	const [internalOpen, setInternalOpen] = useState(false);
	const titleId = useId();
	const open = openProp ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;

	const [tab, setTab] = useState(defaultTab || TABS[0].id);
	const [prevIndex, setPrevIndex] = useState(-1);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);
	const addSession = useRPGStore((state) => state.addSession);
	const updateSession = useRPGStore((state) => state.updateSession);
	const navigate = useNavigate();

	const {
		register,
		handleSubmit,
		reset,
		control,
		setValue,
		formState: { isSubmitting },
	} = useForm<SessionFormValues>({
		defaultValues: { ...sessionDefaults, ...(session ?? {}) },
	});
	const watchedValues = useWatch({ control });

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

	useEffect(() => {
		if (!open) return;
		reset({ ...sessionDefaults, ...(session ?? {}) });
		setPrevIndex(-1);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- session fields intentionally omitted
	}, [open, session?.id, reset]);

	useEffect(() => {
		if (!open) return;
		setTab(defaultTab || TABS[0].id);
	}, [open, defaultTab]);

	function onSubmit(data: SessionFormValues) {
		let createdId: string | null = null;
		if (isEdit && session) updateSession(session.id, data);
		else {
			const created = addSession(data);
			if (created.id) createdId = created.id;
		}
		setOpen(false);
		if (createdId) {
			void navigate({
				to: "/sessions/$sessionId",
				params: { sessionId: createdId },
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
							{isEdit ? `Editar: ${session?.title || "Sessão"}` : "Nova Sessão"}
						</DialogTitle>
						<DialogDescription>
							Documente os acontecimentos da campanha.
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
								<FormSection title="Informações Gerais">
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
										<Field
											label="Título"
											htmlFor={titleId}
											className="sm:col-span-2"
										>
											<Input
												id={titleId}
												placeholder="Ex: A Caverna dos Goblins"
												{...register("title", { required: true })}
											/>
										</Field>
										<Field label="Sessão #">
											<Input
												type="number"
												min={1}
												{...register("number", { valueAsNumber: true })}
											/>
										</Field>
										<Field label="Data real">
											<Input
												placeholder="Ex: 12/04/2026"
												{...register("date")}
											/>
										</Field>
										<Field label="Data in-game">
											<Input
												placeholder="Ex: 15 de Mirtul"
												{...register("inGameDate")}
											/>
										</Field>
										<Field label="Duração">
											<Input placeholder="Ex: 4h" {...register("duration")} />
										</Field>
										<Field
											label="Local de partida (in-game)"
											className="sm:col-span-2"
										>
											<Input
												placeholder="Onde a sessão começou"
												{...register("location")}
											/>
										</Field>
										<Field label="Tom / Humor da sessão">
											<Input
												placeholder="Ex: tenso, cômico..."
												{...register("mood")}
											/>
										</Field>
									</div>
									<Field label="Resumo geral">
										<Textarea
											rows={4}
											placeholder="O grupo encontrou um tesouro e quase morreu..."
											{...register("summary")}
										/>
									</Field>
								</FormSection>
							)}

							{tab === "people" && (
								<FormSection title="Quem & Onde">
									<Field label="Jogadores presentes" hint="Separe por vírgula">
										<Textarea
											rows={2}
											placeholder="Aragorn (Lucas), Lyra (Maria)..."
											{...register("attendees")}
										/>
									</Field>
									<Field label="NPCs envolvidos">
										<Textarea
											rows={3}
											placeholder="NPCs com quem o grupo interagiu"
											{...register("npcsPresent")}
										/>
									</Field>
									<Field label="Locais visitados">
										<Textarea
											rows={3}
											placeholder="Cidades, masmorras, regiões..."
											{...register("locationsVisited")}
										/>
									</Field>
								</FormSection>
							)}

							{tab === "events" && (
								<FormSection title="Acontecimentos">
									<Field label="Eventos chave">
										<Textarea
											rows={5}
											placeholder="Decisões, descobertas, combates..."
											{...register("keyEvents")}
										/>
									</Field>
									<Field label="Combates / Eventos táticos">
										<Textarea
											rows={4}
											placeholder="Inimigos enfrentados..."
											{...register("combatLog")}
										/>
									</Field>
									<Field label="Cliffhanger / Como terminou">
										<Textarea
											rows={2}
											placeholder="A sessão terminou com..."
											{...register("cliffhanger")}
										/>
									</Field>
								</FormSection>
							)}

							{tab === "rewards" && (
								<FormSection title="Recompensas">
									<Field label="Loot / Itens conquistados">
										<Textarea
											rows={4}
											placeholder="Espada +1, 200 PO..."
											{...register("loot")}
										/>
									</Field>
									<Field label="XP concedido">
										<Input
											placeholder="Ex: 750 XP por personagem"
											{...register("xpAwarded")}
										/>
									</Field>
								</FormSection>
							)}

							{tab === "dm" && (
								<FormSection
									title="Notas Privadas do Mestre"
									description="Visíveis apenas para você — planos futuros, segredos."
								>
									<Field label="Notas do Mestre">
										<Textarea
											rows={10}
											placeholder="Próximos passos do vilão..."
											{...register("dmNotes")}
										/>
									</Field>
								</FormSection>
							)}
							{tab === "people" && (
								<EntityLinkManager
									value={watchedValues.entityLinks ?? []}
									onChange={(links) =>
										setValue("entityLinks", links, { shouldDirty: true })
									}
									sourceValues={watchedValues as Record<string, unknown>}
									currentEntity={{
										entityKind: "session",
										entityId: session?.id,
									}}
								/>
							)}
						</div>
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
							{isEdit ? "Salvar alterações" : "Criar Sessão"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
