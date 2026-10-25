import {
	Link as LinkIcon,
	Loader2,
	Shield,
	Trash2,
	User,
	UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import type {
	Campaign,
	Invite,
	MembershipRole,
	RpgSystem,
	World,
} from "@/lib/store/types";
import { cn } from "@/lib/utils";
import {
	campaignPerWorldLimitError,
	countOwnedCampaignsInWorld,
	maxOwnedCampaignsPerWorld,
} from "@/lib/worldbuilding/plan-limits";
import { isWorldStaff } from "@/lib/worldbuilding/visibility";
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
import {
	SelectContent,
	SelectItem,
	SelectRoot,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

const CREATE_WORLD_VALUE = "__create_world__";

function worldsForNewCampaign(
	worlds: readonly World[],
	campaigns: readonly Pick<Campaign, "worldId" | "myRole">[],
	userId: string | undefined,
): World[] {
	if (!userId) return [];
	return worlds.filter(
		(world) =>
			world.ownerUserId === userId ||
			campaigns.some(
				(item) => item.worldId === world.id && isWorldStaff(item.myRole),
			),
	);
}

function WorldNameCreator({
	error,
	saving,
	onSubmit,
}: {
	error: string | null;
	saving: boolean;
	onSubmit: (name: string) => void;
}) {
	const inputId = useId();
	const errorId = useId();
	const [name, setName] = useState("");

	function confirm() {
		const trimmed = name.trim();
		if (!trimmed || saving) return;
		onSubmit(trimmed);
	}

	return (
		<div className="space-y-2">
			<label
				htmlFor={inputId}
				className="text-[12px] font-semibold text-foreground"
			>
				Nome do mundo
			</label>
			<Input
				id={inputId}
				value={name}
				onChange={(event) => setName(event.target.value)}
				placeholder="Ex: Faerûn, Eberron..."
				spellCheck={false}
				autoComplete="off"
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? errorId : undefined}
				onKeyDown={(event) => {
					if (event.key !== "Enter") return;
					event.preventDefault();
					confirm();
				}}
			/>
			{error ? (
				<p id={errorId} className="text-[11px] font-medium text-destructive">
					{error}
				</p>
			) : null}
			<Button
				type="button"
				size="sm"
				className="min-h-11"
				disabled={!name.trim()}
				loading={saving}
				loadingText="Criando..."
				onClick={confirm}
			>
				Criar mundo
			</Button>
		</div>
	);
}

interface CampaignFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	campaign?: Campaign | null;
	defaultTab?: "general" | "members";
	defaultWorldId?: string;
}

export function CampaignForm({
	open,
	onOpenChange,
	campaign,
	defaultTab = "general",
	defaultWorldId,
}: CampaignFormProps) {
	const { user } = useAuth();
	const createCampaign = useRPGStore((s) => s.createCampaign);
	const updateCampaign = useRPGStore((s) => s.updateCampaign);
	const switchCampaign = useRPGStore((s) => s.switchCampaign);
	const createWorld = useRPGStore((s) => s.createWorld);
	const worlds = useRPGStore((s) => s.worlds);
	const campaigns = useRPGStore((s) => s.campaigns);
	const userPlan = useRPGStore((s) => s.userPlan);
	const loadCampaignMembersAndInvites = useRPGStore(
		(s) => s.loadCampaignMembersAndInvites,
	);
	const createInvite = useRPGStore((s) => s.createInvite);
	const revokeInvite = useRPGStore((s) => s.revokeInvite);
	const removeMember = useRPGStore((s) => s.removeMember);
	const toast = useToast();

	const [activeTab, setActiveTab] = useState<"general" | "members">("general");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [system, setSystem] = useState<RpgSystem>("dnd5e");
	const [formError, setFormError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [worldError, setWorldError] = useState<string | null>(null);
	const [creatingWorld, setCreatingWorld] = useState(false);
	const [worldCreateError, setWorldCreateError] = useState<string | null>(null);
	const [isCreatingWorld, setIsCreatingWorld] = useState(false);
	const [selectedWorldId, setSelectedWorldId] = useState(() => {
		if (campaign || !defaultWorldId) return "";
		const state = useRPGStore.getState();
		const allowed = worldsForNewCampaign(
			state.worlds,
			state.campaigns,
			user?.id,
		);
		return allowed.some((world) => world.id === defaultWorldId)
			? defaultWorldId
			: "";
	});
	const nameInputId = useId();
	const descInputId = useId();
	const worldLabelId = useId();
	const worldSelectId = useId();
	const worldHelpId = useId();
	const worldErrorId = useId();
	const memberLimitInputId = useId();
	const userId = user?.id;
	const usableWorlds = useMemo(
		() => worldsForNewCampaign(worlds, campaigns, userId),
		[worlds, campaigns, userId],
	);
	const campaignWorldName = worlds.find(
		(world) => world.id === campaign?.worldId,
	)?.name;
	const worldDescribedBy = worldError
		? `${worldHelpId} ${worldErrorId}`
		: worldHelpId;

	// Membros e Convites
	const [members, setMembers] = useState<
		Array<{ id: string; userId: string; email: string; role: MembershipRole }>
	>([]);
	const [invites, setInvites] = useState<Invite[]>([]);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
	const [isLoadingMembers, setIsLoadingMembers] = useState(false);
	const [inviteError, setInviteError] = useState<string | null>(null);
	const [isSendingInvite, setIsSendingInvite] = useState(false);
	const [memberLimit, setMemberLimit] = useState(6);
	const [isSavingMemberLimit, setIsSavingMemberLimit] = useState(false);

	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);

	const handleTabChange = (newTab: "general" | "members") => {
		if (newTab === activeTab) return;
		const tabsList = ["general", "members"];
		const oldIdx = tabsList.indexOf(activeTab);
		const newIdx = tabsList.indexOf(newTab);
		if (newIdx < oldIdx) setSlideDirection("right");
		else if (newIdx > oldIdx) setSlideDirection("left");
		setActiveTab(newTab);
	};

	useEffect(() => {
		if (open) {
			setName(campaign?.name ?? "");
			setDescription(campaign?.description ?? "");
			setSystem(campaign?.system ?? "dnd5e");
			setFormError(null);
			setInviteEmail("");
			setInviteRole("viewer");
			setInviteError(null);
			setMemberLimit(campaign?.memberLimit ?? 6);
			setActiveTab(defaultTab);
			setMembers([]);
			setInvites([]);
		}
	}, [
		open,
		campaign?.name,
		campaign?.description,
		campaign?.system,
		campaign?.memberLimit,
		defaultTab,
	]);

	const fetchMembersAndInvites = useCallback(async () => {
		if (!campaign) return;
		setIsLoadingMembers(true);
		try {
			const res = await loadCampaignMembersAndInvites(campaign.id);
			setMembers(res.members);
			setInvites(res.invites);
		} catch (err) {
			console.error("Erro ao carregar membros:", err);
		} finally {
			setIsLoadingMembers(false);
		}
	}, [campaign, loadCampaignMembersAndInvites]);

	useEffect(() => {
		if (open && campaign) {
			void fetchMembersAndInvites();
		}
	}, [open, campaign, fetchMembersAndInvites]);

	async function handleCreateWorld(nextName: string) {
		if (isCreatingWorld) return;
		setWorldCreateError(null);
		setIsCreatingWorld(true);
		try {
			const created = await createWorld(nextName);
			setSelectedWorldId(created.id);
			setCreatingWorld(false);
			setWorldError(null);
		} catch (error) {
			setWorldCreateError(
				error instanceof Error ? error.message : "Erro ao criar mundo.",
			);
		} finally {
			setIsCreatingWorld(false);
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (isSaving) return;
		if (!name.trim()) return;

		if (!campaign) {
			if (!selectedWorldId) {
				setWorldError("Escolha um mundo.");
				return;
			}
			if (
				countOwnedCampaignsInWorld(campaigns, selectedWorldId) >=
				maxOwnedCampaignsPerWorld(userPlan)
			) {
				setWorldError(campaignPerWorldLimitError(userPlan));
				return;
			}
		}

		setFormError(null);
		setWorldError(null);
		setIsSaving(true);
		try {
			if (campaign) {
				updateCampaign(campaign.id, {
					name: name.trim(),
					description: description.trim(),
					system,
				});
			} else {
				const created = await createCampaign(name.trim(), description.trim(), {
					worldId: selectedWorldId,
					system,
				});
				await switchCampaign(created.id);
			}
			setName("");
			setDescription("");
			onOpenChange(false);
		} catch (error) {
			console.error("Erro ao salvar campanha:", error);
			setFormError(
				error instanceof Error ? error.message : "Erro ao salvar campanha.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	async function handleSendInvite(e: React.FormEvent) {
		e.preventDefault();
		if (!campaign || !inviteEmail.trim() || isSendingInvite) return;

		setInviteError(null);
		setIsSendingInvite(true);
		try {
			await createInvite(campaign.id, inviteEmail.trim(), inviteRole);
			setInviteEmail("");
			await fetchMembersAndInvites();
		} catch (error: unknown) {
			setInviteError(
				error instanceof Error ? error.message : "Erro ao enviar convite.",
			);
		} finally {
			setIsSendingInvite(false);
		}
	}

	async function handleRevokeInvite(id: string) {
		try {
			await revokeInvite(id);
			await fetchMembersAndInvites();
		} catch (err) {
			console.error("Erro ao revogar convite:", err);
		}
	}

	async function handleKickMember(userId: string) {
		if (!campaign) return;
		try {
			await removeMember(campaign.id, userId);
			await fetchMembersAndInvites();
		} catch (err) {
			console.error("Erro ao expulsar membro:", err);
		}
	}

	function handleMemberLimitChange(value: string) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isNaN(parsed)) return;
		setMemberLimit(Math.min(100, Math.max(1, parsed)));
	}

	function handleSaveMemberLimit() {
		if (!campaign || campaign.myRole !== "owner" || isSavingMemberLimit) return;
		setIsSavingMemberLimit(true);
		updateCampaign(campaign.id, { memberLimit });
		toast.success({
			title: "Limite atualizado",
			description: `A campanha agora aceita ate ${memberLimit} jogadores.`,
		});
		setIsSavingMemberLimit(false);
	}
	const invitedCount =
		members.filter((m) => m.role !== "owner").length + invites.length;
	const effectiveMemberLimit = campaign?.memberLimit ?? 6;
	const isCampaignOwner = campaign?.myRole === "owner";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={cn("sm:max-w-md", campaign && "sm:max-w-lg")}>
				<DialogHeader>
					<DialogTitle className="font-display">
						{campaign ? "Configurações da Campanha" : "Nova Campanha"}
					</DialogTitle>
					<DialogDescription>
						{campaign
							? "Altere os dados ou convide jogadores para sua mesa de jogo."
							: "Crie uma nova campanha com ambiente independente. Todos os dados começarão do zero."}
					</DialogDescription>
				</DialogHeader>

				{campaign && (
					<div className="flex border-b border-border/40 mb-4">
						<button
							type="button"
							onClick={() => handleTabChange("general")}
							className={cn(
								"px-4 py-2 text-[12px] font-semibold border-b-2 -mb-[2px] transition-colors cursor-pointer",
								activeTab === "general"
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							Dados Gerais
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("members")}
							className={cn(
								"px-4 py-2 text-[12px] font-semibold border-b-2 -mb-[2px] transition-colors cursor-pointer",
								activeTab === "members"
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							Jogadores Convocados ({invitedCount}/{effectiveMemberLimit})
						</button>
					</div>
				)}

				{campaign ? (
					<div
						key={activeTab}
						className={cn(
							"flex-1 min-h-0 overflow-y-auto",
							slideDirection === "left"
								? "t-tab-slide-left"
								: "t-tab-slide-right",
						)}
					>
						{activeTab === "general" ? (
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<label
										htmlFor={nameInputId}
										className="text-[12px] font-semibold text-foreground flex items-center justify-between"
									>
										<span>Nome da Campanha *</span>
										<span className="text-[10px] text-muted-foreground">
											Obrigatório
										</span>
									</label>
									<Input
										id={nameInputId}
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Ex: Operação Hexatombe, A Maldição de Strahd..."
										autoFocus
									/>
								</div>

								<div className="space-y-1">
									<p className="text-[12px] font-semibold text-foreground">
										Mundo
									</p>
									<p className="text-[13px] text-foreground">
										{campaignWorldName || "Mundo da campanha"}
									</p>
								</div>

								{/* Seletor de Sistema RPG da Campanha */}
								<div className="space-y-2.5 pt-1">
									<div className="flex items-center justify-between">
										<span className="text-[12px] font-semibold text-foreground">
											Sistema RPG da Mesa
										</span>
										<span className="text-[10px] text-primary font-bold">
											Mesa Dedicada
										</span>
									</div>

									<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
										{[
											{
												id: "ordem",
												name: "Ordem Paranormal",
												icon: "👁️",
												tag: "Investigação & Rituais",
												color:
													"border-purple-500/50 bg-purple-950/20 text-purple-200",
												activeBorder:
													"border-purple-500 ring-2 ring-purple-500/30",
											},
											{
												id: "dnd5e",
												name: "D&D 5ª Edição",
												icon: "🎲",
												tag: "Fantasia 2014",
												color: "border-red-500/50 bg-red-950/20 text-red-200",
												activeBorder: "border-red-500 ring-2 ring-red-500/30",
											},
											{
												id: "dnd2024",
												name: "D&D 2024",
												icon: "✨",
												tag: "Fantasia 2024",
												color:
													"border-amber-500/50 bg-amber-950/20 text-amber-200",
												activeBorder:
													"border-amber-500 ring-2 ring-amber-500/30",
											},
											{
												id: "coc",
												name: "Call of Cthulhu",
												icon: "🐙",
												tag: "Terror & Sanidade",
												color:
													"border-emerald-500/50 bg-emerald-950/20 text-emerald-200",
												activeBorder:
													"border-emerald-500 ring-2 ring-emerald-500/30",
											},
											{
												id: "tormenta20",
												name: "Tormenta 20",
												icon: "⚡",
												tag: "Fantasia BR",
												color:
													"border-cyan-500/50 bg-cyan-950/20 text-cyan-200",
												activeBorder: "border-cyan-500 ring-2 ring-cyan-500/30",
											},
											{
												id: "vampire",
												name: "Vampiro (V5)",
												icon: "🦇",
												tag: "Gótico & Sangue",
												color:
													"border-rose-500/50 bg-rose-950/20 text-rose-200",
												activeBorder: "border-rose-500 ring-2 ring-rose-500/30",
											},
										].map((sys) => {
											const isSelected = system === sys.id;
											return (
												<button
													key={sys.id}
													type="button"
													onClick={() => setSystem(sys.id as RpgSystem)}
													className={cn(
														"group relative flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
														sys.color,
														isSelected
															? `${sys.activeBorder} bg-opacity-40`
															: "opacity-75 hover:opacity-100 hover:border-border/80 border-border/40 bg-card/40",
													)}
												>
													<div className="flex items-center justify-between w-full mb-1">
														<span className="text-base">{sys.icon}</span>
														{isSelected && (
															<span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
														)}
													</div>
													<div>
														<div className="font-bold text-[11px] leading-tight text-foreground">
															{sys.name}
														</div>
														<div className="text-[9px] text-muted-foreground">
															{sys.tag}
														</div>
													</div>
												</button>
											);
										})}
									</div>

									{system === "ordem" && (
										<div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-2.5 text-[11px] text-purple-200 flex items-center gap-2">
											<span className="text-base">👁️</span>
											<span>
												<strong>Mesa de Ordem Paranormal:</strong> Habilita a
												Central Arquivos Secretos (AS1-AS7), Bestiário de
												Ameaças e Leitor de Fichas C.R.I.S.
											</span>
										</div>
									)}
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
										rows={2}
									/>
								</div>

								<DialogFooter className="pt-2">
									<Button
										type="button"
										variant="ghost"
										onClick={() => onOpenChange(false)}
									>
										Cancelar
									</Button>
									<Button
										type="submit"
										loading={isSaving}
										loadingText="Salvando..."
										disabled={!name.trim()}
									>
										{campaign ? "Salvar Alterações" : "Criar Campanha"}
									</Button>
								</DialogFooter>
							</form>
						) : (
							<div className="space-y-4">
								{isCampaignOwner && (
									<div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:flex-row sm:items-end">
										<div className="flex-1 space-y-1.5">
											<label
												className="text-[12px] font-bold text-foreground"
												htmlFor={memberLimitInputId}
											>
												Limite de jogadores
											</label>
											<p className="text-[10px] text-muted-foreground">
												Inclui membros e convites pendentes; o mestre nao ocupa
												vaga.
											</p>
											<Input
												id={memberLimitInputId}
												type="number"
												min={1}
												max={100}
												value={memberLimit}
												onChange={(event) =>
													handleMemberLimitChange(event.target.value)
												}
											/>
										</div>
										<Button
											type="button"
											size="sm"
											onClick={handleSaveMemberLimit}
											loading={isSavingMemberLimit}
											disabled={memberLimit === effectiveMemberLimit}
										>
											Salvar limite
										</Button>
									</div>
								)}
								{/* Link de Convite Direto */}
								{campaign && (
									<div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
										<div className="flex items-center justify-between">
											<h4 className="text-[12px] font-bold text-sky-300 flex items-center gap-1.5">
												<LinkIcon className="h-3.5 w-3.5 text-sky-400" /> Link
												de Convite Direto
											</h4>
											<span className="text-[9px] font-bold text-sky-400/90 uppercase tracking-wider bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
												Entrada Rápida
											</span>
										</div>
										<p className="text-[11px] text-muted-foreground leading-normal">
											Envie este link para seus amigos pelo WhatsApp ou Discord.
											Ao clicar, eles entram instantaneamente na mesa!
										</p>
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => {
												const link = `${window.location.origin}/join/${campaign.id}`;
												void navigator.clipboard.writeText(link);
												toast.success({
													title: "Link Copiado! 🔗",
													description:
														"Envie o link para seus amigos entrarem instantaneamente na mesa.",
												});
											}}
											className="w-full gap-2 border-sky-500/40 text-sky-200 hover:bg-sky-500/15 cursor-pointer font-bold text-[11px]"
										></Button>
									</div>
								)}

								{/* Ajustar Limite de Participantes (Proprietário/Mestre) */}
								{campaign?.myRole === "owner" && (
									<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5">
										<div>
											<h4 className="text-[12px] font-bold text-foreground">
												Limite de Participantes na Mesa
											</h4>
											<p className="text-[11px] text-muted-foreground">
												Altere o limite máximo de jogadores (máx 100).
											</p>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<Input
												type="number"
												min={1}
												max={100}
												value={memberLimit}
												onChange={(e) => setMemberLimit(Number(e.target.value))}
												className="w-20 h-8 text-xs font-mono"
											/>
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={isSavingMemberLimit}
												onClick={async () => {
													setIsSavingMemberLimit(true);
													try {
														updateCampaign(campaign.id, { memberLimit });
														toast.success({
															title: "Limite Atualizado!",
															description: `Limite alterado para ${memberLimit} participantes.`,
														});
													} catch (err: unknown) {
														toast.error({
															title: "Erro ao Atualizar Limite",
															description:
																err instanceof Error
																	? err.message
																	: "Erro ao atualizar limite.",
														});
													} finally {
														setIsSavingMemberLimit(false);
													}
												}}
												className="h-8 text-xs gap-1"
											>
												Salvar Limite
											</Button>
										</div>
									</div>
								)}

								{/* Enviar Convite por E-mail */}
								{invitedCount < effectiveMemberLimit ? (
									<form
										onSubmit={handleSendInvite}
										className="space-y-3 p-3.5 rounded-xl border border-border/40 bg-muted/20"
									>
										<h3 className="text-[12px] font-bold flex items-center gap-1.5 text-foreground">
											<UserPlus className="h-3.5 w-3.5 text-primary" /> Convidar
											Jogador
										</h3>
										<div className="flex gap-2">
											<Input
												type="email"
												value={inviteEmail}
												onChange={(e) => setInviteEmail(e.target.value)}
												placeholder="e-mail-do-jogador@gmail.com"
												className="flex-1"
												required
											/>
											<select
												value={inviteRole}
												onChange={(e) =>
													setInviteRole(e.target.value as "editor" | "viewer")
												}
												className="rounded-lg border border-border bg-background px-3 py-1 text-[11px] font-medium text-foreground outline-hidden focus:border-primary"
											>
												<option value="viewer">Jogador (Ver)</option>
												<option value="editor">Co-Mestre (Editar)</option>
											</select>
											<Button
												type="submit"
												size="sm"
												loading={isSendingInvite}
												loadingText="Enviando..."
												disabled={!inviteEmail.trim()}
											>
												Convidar
											</Button>
										</div>
										{inviteError && (
											<p className="text-[10px] text-destructive font-medium">
												{inviteError}
											</p>
										)}
									</form>
								) : (
									<p className="text-[11px] text-amber-400 font-semibold p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
										Limite de {effectiveMemberLimit} participantes atingido.
										Remova um membro ou cancele um convite pendente antes de
										enviar outro.
									</p>
								)}

								{/* Listagem de Participantes */}
								<div className="space-y-3">
									<h3 className="text-[12px] font-bold text-foreground">
										Lista de Participantes
									</h3>
									{isLoadingMembers ? (
										<div className="flex justify-center py-6 text-muted-foreground">
											<Loader2 className="h-5 w-5 animate-spin" />
										</div>
									) : (
										<div className="max-h-52 overflow-y-auto space-y-2 pr-1">
											{/* Membros Ativos */}
											{members.map((member) => (
												<div
													key={member.id}
													className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/10 transition-colors"
												>
													<div className="flex items-center gap-2.5 min-w-0">
														<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
															{member.role === "owner" ? (
																<Shield className="h-3.5 w-3.5" />
															) : (
																<User className="h-3.5 w-3.5" />
															)}
														</div>
														<div className="flex flex-col min-w-0 leading-tight">
															<span className="text-[11px] font-semibold truncate text-foreground">
																{member.email}
															</span>
															<span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
																{member.role === "owner"
																	? "Mestre"
																	: member.role === "editor"
																		? "Co-Mestre"
																		: "Jogador"}
															</span>
														</div>
													</div>
													{member.role !== "owner" && (
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => handleKickMember(member.userId)}
															className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
															title="Remover participante"
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													)}
												</div>
											))}

											{/* Convites Pendentes */}
											{invites.map((invite) => (
												<div
													key={invite.id}
													className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-border bg-muted/5 hover:bg-muted/10 transition-colors"
												>
													<div className="flex items-center gap-2.5 min-w-0">
														<div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/45 text-muted-foreground">
															<Loader2 className="h-3.5 w-3.5 animate-pulse" />
														</div>
														<div className="flex flex-col min-w-0 leading-tight">
															<span className="text-[11px] font-semibold truncate text-muted-foreground">
																{invite.email}
															</span>
															<span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
																Pendente •{" "}
																{invite.role === "editor"
																	? "Co-Mestre"
																	: "Jogador"}
															</span>
														</div>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => handleRevokeInvite(invite.id)}
														className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
														title="Cancelar convite"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
											))}

											{members.length === 0 && invites.length === 0 && (
												<p className="text-center py-6 text-[11px] text-muted-foreground">
													Nenhum jogador convidado para esta campanha ainda.
												</p>
											)}
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="flex-1 min-h-0 overflow-y-auto">
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
									id={worldLabelId}
									htmlFor={worldSelectId}
									className="text-[12px] font-semibold text-foreground"
								>
									Mundo *
								</label>
								{usableWorlds.length === 0 && !creatingWorld ? (
									<div
										className="rounded-xl border border-dashed border-border/70 bg-card/55 px-3 py-4"
										aria-invalid={worldError ? true : undefined}
										aria-describedby={worldDescribedBy}
									>
										<p className="text-[13px] font-semibold text-foreground">
											Nenhum mundo ainda
										</p>
										<p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
											Crie um mundo para compartilhar grimório, facções e mural
											entre as campanhas.
										</p>
										<Button
											id={worldSelectId}
											type="button"
											size="sm"
											className="mt-3 min-h-11"
											aria-label="Criar mundo"
											onClick={() => {
												setCreatingWorld(true);
												setWorldCreateError(null);
												setWorldError(null);
											}}
										>
											Criar mundo
										</Button>
									</div>
								) : (
									<>
										{usableWorlds.length > 0 ? (
											<SelectRoot<string>
												modal={false}
												value={selectedWorldId || null}
												onValueChange={(next) => {
													if (next === CREATE_WORLD_VALUE) {
														setCreatingWorld(true);
														setWorldCreateError(null);
														setWorldError(null);
														return;
													}
													if (!next) return;
													setSelectedWorldId(next);
													setCreatingWorld(false);
													setWorldError(null);
													setWorldCreateError(null);
												}}
											>
												<SelectTrigger
													id={worldSelectId}
													className="min-h-11 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
													aria-invalid={worldError ? true : undefined}
													aria-describedby={worldDescribedBy}
												>
													<SelectValue>
														{(value: string | null) => {
															const selectedName = worlds.find(
																(world) => world.id === value,
															)?.name;
															return selectedName ? (
																selectedName
															) : (
																<span className="text-muted-foreground">
																	Escolha um mundo
																</span>
															);
														}}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{usableWorlds.map((world) => (
														<SelectItem key={world.id} value={world.id}>
															{world.name}
														</SelectItem>
													))}
													<SelectSeparator />
													<SelectItem value={CREATE_WORLD_VALUE}>
														Criar mundo novo…
													</SelectItem>
												</SelectContent>
											</SelectRoot>
										) : null}
										{creatingWorld ? (
											<WorldNameCreator
												error={worldCreateError}
												saving={isCreatingWorld}
												onSubmit={(nextName) => {
													void handleCreateWorld(nextName);
												}}
											/>
										) : null}
									</>
								)}
								<p
									id={worldHelpId}
									className="text-[11px] leading-relaxed text-muted-foreground"
								>
									Campanhas no mesmo mundo compartilham grimório, facções e
									mural.
								</p>
								{worldError ? (
									<p
										id={worldErrorId}
										className="text-[11px] font-medium text-destructive"
									>
										{worldError}
									</p>
								) : null}
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

							{formError && (
								<p className="text-[11px] font-medium text-destructive">
									{formError}
								</p>
							)}

							<DialogFooter className="pt-2">
								<Button
									type="button"
									variant="ghost"
									onClick={() => onOpenChange(false)}
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									loading={isSaving}
									loadingText="Salvando..."
									disabled={!name.trim()}
								>
									Criar Campanha
								</Button>
							</DialogFooter>
						</form>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
