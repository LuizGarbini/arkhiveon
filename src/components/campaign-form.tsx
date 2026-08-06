import {
	CheckCircle2,
	Globe2,
	Loader2,
	Shield,
	Trash2,
	User,
	UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import {
	DEDICATED_CAMPAIGN_SYSTEMS,
	DEFAULT_CAMPAIGN_SYSTEM,
} from "@/lib/campaign-systems";
import { useRPGStore } from "@/lib/store";
import type {
	Campaign,
	Invite,
	MembershipRole,
	RpgSystem,
} from "@/lib/store/types";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { OrdemCampaignSystemCard } from "./ordem/ordem-campaign-system-card";
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
	defaultTab?: "general" | "members";
	defaultWorldId?: string;
}

type DedicatedCampaignSystem = (typeof DEDICATED_CAMPAIGN_SYSTEMS)[number];

const CAMPAIGN_SYSTEM_COPY: Record<
	DedicatedCampaignSystem,
	{ title: string; badge: string; description: string }
> = {
	dnd5e: {
		title: "D&D 5e",
		badge: "Fantasia clássica",
		description: "Atributos, classes, perícias, magias e progressão 2014.",
	},
	dnd2024: {
		title: "D&D 2024",
		badge: "Nova geração",
		description: "Heroic Inspiration, Species e Weapon Mastery.",
	},
	ordem: {
		title: "Ordem Paranormal",
		badge: "Mesa dedicada",
		description: "NEX, agentes, sanidade, PE e identidade própria da Ordem.",
	},
	coc: {
		title: "Call of Cthulhu",
		badge: "Horror cósmico",
		description: "Investigação, sanidade e rolagens d100.",
	},
	tormenta20: {
		title: "Tormenta 20",
		badge: "Arton",
		description: "Poderes, perícias e fantasia brasileira de alto impacto.",
	},
	vampire: {
		title: "Vampiro V5",
		badge: "World of Darkness",
		description: "Fome, disciplinas e personagens sociais da noite.",
	},
};

export function CampaignForm({
	open,
	onOpenChange,
	campaign,
	defaultTab = "general",
	defaultWorldId,
}: CampaignFormProps) {
	const createCampaign = useRPGStore((s) => s.createCampaign);
	const updateCampaign = useRPGStore((s) => s.updateCampaign);
	const switchCampaign = useRPGStore((s) => s.switchCampaign);
	const worlds = useRPGStore((s) => s.worlds);
	const loadCampaignMembersAndInvites = useRPGStore(
		(s) => s.loadCampaignMembersAndInvites,
	);
	const createInvite = useRPGStore((s) => s.createInvite);
	const revokeInvite = useRPGStore((s) => s.revokeInvite);
	const removeMember = useRPGStore((s) => s.removeMember);

	const [activeTab, setActiveTab] = useState<"general" | "members">("general");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [system, setSystem] = useState<RpgSystem>(DEFAULT_CAMPAIGN_SYSTEM);
	const [formError, setFormError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const nameInputId = useId();
	const descInputId = useId();
	const selectedWorld = worlds.find(
		(world) => world.id === (campaign?.worldId ?? defaultWorldId),
	);

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
			setSystem(campaign?.system ?? DEFAULT_CAMPAIGN_SYSTEM);
			setFormError(null);
			setInviteEmail("");
			setInviteRole("viewer");
			setInviteError(null);
			setActiveTab(defaultTab);
			setMembers([]);
			setInvites([]);
		}
	}, [
		open,
		campaign?.name,
		campaign?.description,
		campaign?.system,
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

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim() || isSaving) return;

		setFormError(null);
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
					...(defaultWorldId ? { worldId: defaultWorldId } : {}),
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
		} catch (error) {
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

	const invitedCount =
		members.filter((m) => m.role !== "owner").length + invites.length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={cn("sm:max-w-2xl", campaign && "sm:max-w-2xl")}>
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
							Jogadores Convocados ({invitedCount}/6)
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

								<CampaignSystemSelector value={system} onChange={setSystem} />

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
										{campaign ? "Salvar Alterações" : "Criar Campanha"}
									</Button>
								</DialogFooter>
							</form>
						) : (
							<div className="space-y-6">
								{/* Enviar Convite */}
								{invitedCount < 6 ? (
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
										Limite de 6 participantes atingido. Remova um membro ou
										cancele um convite pendente antes de enviar outro.
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

							<CampaignSystemSelector value={system} onChange={setSystem} />

							<div className="space-y-3 rounded-xl border border-border/40 bg-muted/15 p-3.5">
								<div className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
									<Globe2 className="h-3.5 w-3.5 text-sky-300" />
									Mundo da campanha
								</div>
								<p className="text-[11px] leading-relaxed text-muted-foreground">
									{selectedWorld?.name ?? "Mundo ativo"}
									{" — "}campanhas no mesmo Mundo compartilham grimório, facções
									e mural.
								</p>
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

function CampaignSystemSelector({
	value,
	onChange,
}: {
	value: RpgSystem;
	onChange: (system: RpgSystem) => void;
}) {
	return (
		<section className="space-y-3">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2 text-[12px] font-bold text-foreground">
					<Shield className="h-3.5 w-3.5 text-primary" />
					Sistema RPG da campanha
				</div>
				<p className="text-[11px] leading-relaxed text-muted-foreground">
					Este sistema passa a ser o padrão da mesa, das novas fichas e dos
					atalhos temáticos.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{DEDICATED_CAMPAIGN_SYSTEMS.map((systemValue) => {
					const config = SYSTEM_CONFIG[systemValue] ?? SYSTEM_CONFIG.generic;
					const copy = CAMPAIGN_SYSTEM_COPY[systemValue];
					const Icon = config.Icon;
					const isSelected = value === systemValue;

					if (systemValue === "ordem") {
						return (
							<OrdemCampaignSystemCard
								key={systemValue}
								title={copy.title}
								badge={copy.badge}
								description={copy.description}
								Icon={Icon}
								isSelected={isSelected}
								onSelect={() => onChange(systemValue)}
							/>
						);
					}

					return (
						<button
							key={systemValue}
							type="button"
							aria-pressed={isSelected}
							onClick={() => onChange(systemValue)}
							className={cn(
								"group relative overflow-hidden rounded-xl border p-3 text-left shadow-sm transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.985]",
								isSelected
									? "border-primary/60 bg-primary/12 shadow-primary/10"
									: "border-border/60 bg-card-elevated/45 hover:border-primary/35 hover:bg-card-elevated/80",
							)}
						>
							<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
							<div className="flex items-start justify-between gap-3">
								<div className="flex min-w-0 gap-3">
									<div
										className={cn(
											"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary",
										)}
									>
										<Icon className="h-4.5 w-4.5" strokeWidth={1.7} />
									</div>
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="font-display text-[13px] font-bold text-foreground">
												{copy.title}
											</h3>
											<span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
												{copy.badge}
											</span>
										</div>
										<p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
											{copy.description}
										</p>
									</div>
								</div>

								{isSelected ? (
									<CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
								) : null}
							</div>
						</button>
					);
				})}
			</div>
		</section>
	);
}
