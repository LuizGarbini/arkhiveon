import { Loader2, Shield, Trash2, User, UserPlus } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useRPGStore } from "@/lib/store";
import type { Campaign, Invite, MembershipRole } from "@/lib/store/types";
import { cn } from "@/lib/utils";
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
}

export function CampaignForm({
	open,
	onOpenChange,
	campaign,
	defaultTab = "general",
}: CampaignFormProps) {
	const createCampaign = useRPGStore((s) => s.createCampaign);
	const updateCampaign = useRPGStore((s) => s.updateCampaign);
	const switchCampaign = useRPGStore((s) => s.switchCampaign);
	const loadCampaignMembersAndInvites = useRPGStore(
		(s) => s.loadCampaignMembersAndInvites,
	);
	const createInvite = useRPGStore((s) => s.createInvite);
	const revokeInvite = useRPGStore((s) => s.revokeInvite);
	const removeMember = useRPGStore((s) => s.removeMember);

	const [activeTab, setActiveTab] = useState<"general" | "members">(defaultTab);
	const [name, setName] = useState(campaign?.name ?? "");
	const [description, setDescription] = useState(campaign?.description ?? "");
	const [isSaving, setIsSaving] = useState(false);
	const nameInputId = useId();
	const descInputId = useId();

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

	// Sincronização de estado inline para evitar renderização obsoleta (recomendações do React)
	const [prevOpen, setPrevOpen] = useState(open);
	const [prevCampaign, setPrevCampaign] = useState(campaign);
	const [prevDefaultTab, setPrevDefaultTab] = useState(defaultTab);

	if (open !== prevOpen || campaign !== prevCampaign || defaultTab !== prevDefaultTab) {
		setPrevOpen(open);
		setPrevCampaign(campaign);
		setPrevDefaultTab(defaultTab);

		if (open && (open !== prevOpen || campaign !== prevCampaign)) {
			setName(campaign?.name ?? "");
			setDescription(campaign?.description ?? "");
			setInviteEmail("");
			setInviteRole("viewer");
			setInviteError(null);
			setActiveTab(defaultTab);
			setMembers([]);
			setInvites([]);
		}
	}

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

	async function handleSendInvite(e: React.FormEvent) {
		e.preventDefault();
		if (!campaign || !inviteEmail.trim() || isSendingInvite) return;

		setInviteError(null);
		setIsSendingInvite(true);
		try {
			await createInvite(campaign.id, inviteEmail.trim(), inviteRole);
			setInviteEmail("");
			await fetchMembersAndInvites();
		} catch (error: any) {
			setInviteError(error.message || "Erro ao enviar convite.");
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
							onClick={() => setActiveTab("general")}
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
							onClick={() => setActiveTab("members")}
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

				{activeTab === "general" ? (
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

						<DialogFooter className="pt-2">
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
										disabled={!inviteEmail.trim() || isSendingInvite}
									>
										{isSendingInvite ? (
											<Loader2 className="h-3 w-3 animate-spin" />
										) : (
											"Convidar"
										)}
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
								Limite de 6 participantes atingido. Remova um membro ou cancele
								um convite pendente para liberar espaço.
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
														{invite.role === "editor" ? "Co-Mestre" : "Jogador"}
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
			</DialogContent>
		</Dialog>
	);
}
