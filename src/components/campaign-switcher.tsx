import {
	Check,
	ChevronDown,
	Globe2,
	Pencil,
	Plus,
	Trash2,
	UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import type { Campaign, MembershipRole } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { useActiveWorld } from "@/lib/worldbuilding/hooks";
import {
	campaignPerWorldLimitError,
	countOwnedCampaignsInWorld,
	countOwnedWorlds,
	maxOwnedCampaignsPerWorld,
	maxOwnedWorlds,
	worldLimitError,
} from "@/lib/worldbuilding/plan-limits";
import { isSharedWorld } from "@/lib/worldbuilding/shared-world";
import { CampaignForm } from "./campaign-form";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { WorldForm } from "./world-form";

function RoleBadge({ role }: { role: MembershipRole | undefined }) {
	const styles =
		role === "owner"
			? "border-amber-500/20 bg-amber-500/15 text-amber-500"
			: role === "editor"
				? "border-blue-500/20 bg-blue-500/15 text-blue-500"
				: "border-indigo-500/20 bg-indigo-500/15 text-indigo-400";
	const label =
		role === "owner" ? "Mestre" : role === "editor" ? "Co-Mestre" : "Jogador";
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[8px] font-bold shadow-xs",
				styles,
			)}
		>
			{label}
		</span>
	);
}

interface CampaignSwitcherProps {
	isCollapsed: boolean;
}

function campaignInitials(name: string): string {
	return name
		.split(/\s+/)
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const CAMPAIGN_COLORS = [
	"from-primary to-fuchsia-600",
	"from-emerald-500 to-teal-600",
	"from-amber-500 to-orange-600",
	"from-rose-500 to-pink-600",
	"from-sky-500 to-blue-600",
	"from-violet-500 to-purple-600",
];

function colorForIndex(index: number): string {
	return CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length];
}

export function CampaignSwitcher({ isCollapsed }: CampaignSwitcherProps) {
	const { user } = useAuth();
	const campaigns = useRPGStore((state) => state.campaigns);
	const worlds = useRPGStore((state) => state.worlds);
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const pendingInvites = useRPGStore((state) => state.pendingInvites);
	const acceptInvite = useRPGStore((state) => state.acceptInvite);
	const switchCampaign = useRPGStore((state) => state.switchCampaign);
	const switchWorld = useRPGStore((state) => state.switchWorld);
	const deleteCampaign = useRPGStore((state) => state.deleteCampaign);
	const deleteWorld = useRPGStore((state) => state.deleteWorld);
	const userPlan = useRPGStore((state) => state.userPlan);
	const activeWorld = useActiveWorld();
	const sharedWorldIds = useMemo(
		() =>
			new Set(
				worlds
					.filter((world) => isSharedWorld(world, campaigns, user?.id))
					.map((world) => world.id),
			),
		[worlds, campaigns, user?.id],
	);
	const isActiveWorldShared = activeWorld
		? sharedWorldIds.has(activeWorld.id)
		: false;
	const toast = useToast();
	const [isOpen, setIsOpen] = useState(false);
	const [showCampaignForm, setShowCampaignForm] = useState(false);
	const [showWorldForm, setShowWorldForm] = useState(false);
	const [worldToEdit, setWorldToEdit] = useState<
		(typeof worlds)[number] | null
	>(null);
	const [worldToDelete, setWorldToDelete] = useState<string | null>(null);
	const [isDeletingWorld, setIsDeletingWorld] = useState(false);
	const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
	const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);
	const [campaignEditTab, setCampaignEditTab] = useState<"general" | "members">(
		"general",
	);
	const isMobile = useIsMobileSidebar();

	const activeCampaign = campaigns.find(
		(campaign) => campaign.id === activeCampaignId,
	);
	const activeIndex = campaigns.findIndex(
		(campaign) => campaign.id === activeCampaignId,
	);

	function openCampaignForm() {
		if (!activeWorld) {
			toast.error({
				title: "Nenhum Mundo ativo",
				description: "Crie ou selecione um Mundo antes de criar uma campanha.",
			});
			return;
		}
		if (
			countOwnedCampaignsInWorld(campaigns, activeWorld.id) >=
			maxOwnedCampaignsPerWorld(userPlan)
		) {
			toast.error({
				title: "Limite atingido",
				description: campaignPerWorldLimitError(userPlan),
			});
			return;
		}
		setIsOpen(false);
		setShowCampaignForm(true);
	}

	function openWorldForm() {
		if (countOwnedWorlds(worlds, user?.id) >= maxOwnedWorlds(userPlan)) {
			toast.error({
				title: "Limite atingido",
				description: worldLimitError(userPlan),
			});
			return;
		}
		setIsOpen(false);
		setShowWorldForm(true);
	}

	async function handleDelete() {
		if (!campaignToDelete) return;
		await deleteCampaign(campaignToDelete);
		setCampaignToDelete(null);
	}

	async function handleDeleteWorld() {
		if (!worldToDelete || isDeletingWorld) return;
		setIsDeletingWorld(true);
		try {
			await deleteWorld(worldToDelete);
			setWorldToDelete(null);
			toast.success({
				title: "Mundo excluído",
				description: "O Mundo foi removido com sucesso.",
			});
		} catch (err) {
			toast.error({
				title: "Erro ao excluir Mundo",
				description:
					err instanceof Error
						? err.message
						: "Não foi possível excluir o Mundo.",
			});
		} finally {
			setIsDeletingWorld(false);
		}
	}

	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger
					className={cn(
						"flex w-full items-center overflow-hidden rounded-2xl border border-border/60 bg-background/45 transition-[background-color,border-color,box-shadow,transform,padding] duration-300 hover:border-primary/25 hover:bg-primary/8 active:scale-[0.98] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15",
						isCollapsed ? "justify-center p-2" : "justify-start gap-3 p-3",
					)}
					aria-label="Trocar Mundo ou campanha"
				>
					<div
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-[10px] font-bold text-white shadow-sm",
							colorForIndex(activeIndex >= 0 ? activeIndex : 0),
						)}
					>
						{activeCampaign ? (
							campaignInitials(activeCampaign.name)
						) : (
							<Globe2 className="h-4 w-4" />
						)}
					</div>
					<div
						className={cn(
							"flex min-w-0 flex-1 flex-col overflow-hidden text-left leading-tight transition-[max-width,opacity,transform] duration-300",
							isCollapsed
								? "max-w-0 -translate-x-2 opacity-0"
								: "max-w-36 translate-x-0 opacity-100",
						)}
					>
						<div className="flex min-w-0 items-center gap-1.5">
							<span className="truncate text-[12px] font-bold">
								{activeCampaign?.name ?? "Sem campanha"}
							</span>
							{activeCampaign && <RoleBadge role={activeCampaign.myRole} />}
						</div>
						<span className="truncate text-[10px] text-muted-foreground">
							{activeWorld?.name ?? "Selecione um Mundo"}
						</span>
						{isActiveWorldShared && (
							<span className="truncate text-[10px] text-muted-foreground">
								Mundo compartilhado
							</span>
						)}
					</div>
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 shrink-0 text-muted-foreground transition-[opacity,transform,width] duration-300",
							isCollapsed ? "w-0 opacity-0" : "w-3.5 opacity-100",
							isOpen ? "rotate-0" : "-rotate-90",
						)}
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					side={isMobile ? "bottom" : "right"}
					align="start"
					sideOffset={8}
					positionerClassName={isMobile ? "z-[160]" : undefined}
					className={cn(
						"max-h-[min(520px,calc(100vh-6rem))] w-80 overflow-y-auto p-1.5 shadow-2xl",
						isMobile && "w-[calc(100vw-1.5rem)] max-w-sm",
					)}
				>
					{/* Convites Pendentes */}
					{pendingInvites && pendingInvites.length > 0 && (
						<DropdownMenuGroup className="mb-2">
							<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-2">
								<span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
									✉️ Convites Pendentes ({pendingInvites.length})
								</span>
								{pendingInvites.map((inv) => (
									<div
										key={inv.id}
										className="flex items-center justify-between gap-2"
									>
										<div className="min-w-0 flex-1">
											<p className="text-[11px] font-bold text-foreground truncate">
												{inv.campaignName}
											</p>
											<span className="text-[9px] text-muted-foreground">
												Função:{" "}
												{inv.role === "editor" ? "Co-Mestre" : "Jogador"}
											</span>
										</div>
										<Button
											type="button"
											size="xs"
											onClick={async () => {
												await acceptInvite(inv.id);
												setIsOpen(false);
												toast.success({
													title: "Convite Aceito!",
													description: `Você entrou na campanha "${inv.campaignName}".`,
												});
											}}
											className="bg-amber-500 text-black hover:bg-amber-400 text-[10px] font-bold h-6 px-2 shrink-0"
										>
											Aceitar
										</Button>
									</div>
								))}
							</div>
							<DropdownMenuSeparator className="my-1.5" />
						</DropdownMenuGroup>
					)}

					{/* Seção de Mundos */}
					<DropdownMenuGroup>
						<div className="flex items-center justify-between px-2 py-1.5">
							<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
								Mundos ({worlds.length})
							</span>
							<button
								type="button"
								onClick={(event) => {
									event.preventDefault();
									openWorldForm();
								}}
								className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:underline"
							>
								<Plus className="h-3 w-3" /> Novo
							</button>
						</div>
						<div className="space-y-0.5">
							{worlds.map((world) => {
								const isSelected = world.id === activeWorld?.id;
								return (
									<div
										key={world.id}
										className={cn(
											"group/item flex items-center justify-between rounded-xl px-2 py-1.5 transition-colors",
											isSelected
												? "bg-sky-500/15 border border-sky-500/30 text-sky-200"
												: "hover:bg-muted/40 text-muted-foreground hover:text-foreground",
										)}
									>
										<button
											type="button"
											onClick={() => {
												void switchWorld(world.id);
												setIsOpen(false);
											}}
											className="flex min-w-0 flex-1 items-center gap-2 text-left"
										>
											<Globe2
												className={cn(
													"h-3.5 w-3.5 shrink-0",
													isSelected ? "text-sky-300" : "text-muted-foreground",
												)}
											/>
											<span className="min-w-0 flex-1 truncate text-[12px] font-medium">
												{world.name}
											</span>
											{sharedWorldIds.has(world.id) && (
												<span className="shrink-0 text-[10px] text-muted-foreground">
													Mundo compartilhado
												</span>
											)}
											{isSelected && (
												<Check className="h-3.5 w-3.5 text-sky-400 shrink-0" />
											)}
										</button>

										{world.ownerUserId === user?.id && (
											<div className="flex items-center gap-0.5 pl-1">
												<button
													type="button"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();
														setWorldToEdit(world);
													}}
													aria-label={`Editar nome do Mundo ${world.name}`}
													className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
												>
													<Pencil className="h-3 w-3" />
												</button>
												{!world.isDefault && (
													<button
														type="button"
														onClick={(event) => {
															event.preventDefault();
															event.stopPropagation();
															setWorldToDelete(world.id);
														}}
														aria-label={`Excluir Mundo ${world.name}`}
														className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
													>
														<Trash2 className="h-3 w-3" />
													</button>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</DropdownMenuGroup>

					<DropdownMenuSeparator className="my-1.5" />

					{/* Seção de Campanhas */}
					<DropdownMenuGroup>
						<div className="flex items-center justify-between px-2 py-1.5">
							<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
								Minhas Campanhas ({campaigns.length})
							</span>
							<button
								type="button"
								onClick={(event) => {
									event.preventDefault();
									openCampaignForm();
								}}
								className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
							>
								<Plus className="h-3 w-3" /> Nova
							</button>
						</div>

						<div className="space-y-1">
							{campaigns.map((campaign) => {
								const isSelected = campaign.id === activeCampaignId;
								const index = campaigns.findIndex((c) => c.id === campaign.id);
								const campaignWorld = worlds.find(
									(w) => w.id === campaign.worldId,
								);

								return (
									<div
										key={campaign.id}
										className={cn(
											"group/item flex items-center justify-between rounded-xl p-1.5 transition-colors",
											isSelected
												? "bg-primary/15 border border-primary/30"
												: "hover:bg-muted/40",
										)}
									>
										<button
											type="button"
											onClick={() => {
												void switchCampaign(campaign.id);
												setIsOpen(false);
											}}
											className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
										>
											<div
												className={cn(
													"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-[9px] font-bold text-white shadow-xs",
													colorForIndex(index),
												)}
											>
												{campaignInitials(campaign.name)}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex min-w-0 items-center gap-1.5">
													<span className="truncate text-[12px] font-semibold text-foreground">
														{campaign.name}
													</span>
													<RoleBadge role={campaign.myRole} />
												</div>
												{campaignWorld && (
													<span className="block truncate text-[10px] text-muted-foreground">
														{campaignWorld.name}
													</span>
												)}
											</div>
											{isSelected && (
												<Check className="h-3.5 w-3.5 text-primary shrink-0" />
											)}
										</button>

										{campaign.myRole === "owner" && (
											<div className="flex items-center pr-0.5">
												<button
													type="button"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();
														setCampaignToEdit(campaign);
														setCampaignEditTab("members");
													}}
													aria-label={`Gerenciar jogadores de ${campaign.name}`}
													className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
												>
													<UserPlus className="h-3.5 w-3.5" />
												</button>
												<button
													type="button"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();
														setCampaignToEdit(campaign);
														setCampaignEditTab("general");
													}}
													aria-label={`Editar campanha ${campaign.name}`}
													className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
												>
													<Pencil className="h-3.5 w-3.5" />
												</button>
												{campaigns.length > 1 && (
													<button
														type="button"
														onClick={(event) => {
															event.preventDefault();
															event.stopPropagation();
															setCampaignToDelete(campaign.id);
														}}
														aria-label={`Excluir campanha ${campaign.name}`}
														className="flex h-7 w-7 items-center justify-center rounded-md text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												)}
											</div>
										)}
									</div>
								);
							})}

							{campaigns.length === 0 && (
								<p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
									Nenhuma campanha encontrada.
								</p>
							)}
						</div>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<CampaignForm
				open={showCampaignForm}
				onOpenChange={setShowCampaignForm}
				defaultWorldId={activeWorld?.id}
			/>
			<WorldForm
				open={showWorldForm}
				onOpenChange={setShowWorldForm}
				onCreated={() => setShowCampaignForm(true)}
			/>
			<WorldForm
				open={!!worldToEdit}
				onOpenChange={(open) => !open && setWorldToEdit(null)}
				world={worldToEdit}
			/>
			<CampaignForm
				open={!!campaignToEdit}
				onOpenChange={(open) => !open && setCampaignToEdit(null)}
				campaign={campaignToEdit}
				defaultTab={campaignEditTab}
			/>

			<Dialog
				open={!!campaignToDelete}
				onOpenChange={(open) => !open && setCampaignToDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Excluir Campanha?</DialogTitle>
						<DialogDescription>
							Isso removerá a campanha e todos os dados associados. Esta ação é
							definitiva e não pode ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setCampaignToDelete(null)}>
							Cancelar
						</Button>
						<Button onClick={handleDelete} variant="destructive">
							Excluir
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!worldToDelete}
				onOpenChange={(open) => !open && setWorldToDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Excluir Mundo?</DialogTitle>
						<DialogDescription>
							Isso removerá a ambientação do Mundo. As campanhas pertencentes a
							ele continuarão acessíveis no seu Mundo Padrão. Esta ação não pode
							ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setWorldToDelete(null)}>
							Cancelar
						</Button>
						<Button
							onClick={handleDeleteWorld}
							variant="destructive"
							loading={isDeletingWorld}
							loadingText="Excluindo..."
						>
							Excluir Mundo
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function useIsMobileSidebar() {
	const [isMobile, setIsMobile] = useState(() =>
		typeof window === "undefined"
			? false
			: window.matchMedia("(max-width: 767px)").matches,
	);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 767px)");
		const updateIsMobile = () => setIsMobile(mediaQuery.matches);
		updateIsMobile();
		mediaQuery.addEventListener("change", updateIsMobile);
		return () => mediaQuery.removeEventListener("change", updateIsMobile);
	}, []);

	return isMobile;
}
