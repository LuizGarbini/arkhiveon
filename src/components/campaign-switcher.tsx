import {
	Check,
	ChevronDown,
	Globe2,
	Pencil,
	Plus,
	Trash2,
	UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
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
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
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
	const switchCampaign = useRPGStore((state) => state.switchCampaign);
	const switchWorld = useRPGStore((state) => state.switchWorld);
	const deleteCampaign = useRPGStore((state) => state.deleteCampaign);
	const deleteWorld = useRPGStore((state) => state.deleteWorld);
	const userPlan = useRPGStore((state) => state.userPlan);
	const activeWorld = useActiveWorld();
	const toast = useToast();
	const [isOpen, setIsOpen] = useState(false);
	const [showCampaignForm, setShowCampaignForm] = useState(false);
	const [showWorldForm, setShowWorldForm] = useState(false);
	const [worldToEdit, setWorldToEdit] = useState<typeof worlds[number] | null>(null);
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
	const campaignsInWorld = activeWorld
		? campaigns.filter((campaign) => campaign.worldId === activeWorld.id)
		: [];

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
				description: err instanceof Error ? err.message : "Não foi possível excluir o Mundo.",
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
						"max-h-[min(420px,calc(100vh-8rem))] w-72",
						isMobile && "w-[224px] max-w-[calc(100vw-2rem)]",
					)}
				>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="rounded-lg px-2.5 py-2">
							<Globe2 className="h-4 w-4 text-sky-300" />
							<span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
								{activeWorld?.name ?? "Selecionar Mundo"}
							</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="w-64">
							<DropdownMenuGroup>
								<DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em]">
									Mundos
								</DropdownMenuLabel>
								{worlds.map((world) => (
									<div
										key={world.id}
										className="group/item flex items-center gap-1 rounded-xl p-1 hover:bg-muted/10"
									>
										<DropdownMenuItem
											onClick={() => void switchWorld(world.id)}
											className="min-w-0 flex-1 gap-2.5 px-2 py-1.5"
										>
											<Globe2 className="h-3.5 w-3.5 text-sky-300 shrink-0" />
											<span className="min-w-0 flex-1 truncate text-[12px]">
												{world.name}
											</span>
											{world.id === activeWorld?.id && (
												<Check className="h-3.5 w-3.5 text-primary shrink-0" />
											)}
										</DropdownMenuItem>
										{world.ownerUserId === user?.id && (
											<div className="flex items-center pr-1 gap-0.5">
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
								))}
								{worlds.length === 0 && (
									<p className="px-2.5 py-2 text-[11px] text-muted-foreground">
										Nenhum Mundo acessível.
									</p>
								)}
							</DropdownMenuGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em]">
							Campanhas
						</DropdownMenuLabel>
						{campaignsInWorld.map((campaign) => {
							const index = campaigns.findIndex(
								(item) => item.id === campaign.id,
							);
							return (
								<div
									key={campaign.id}
									className="group/item flex items-center gap-1 rounded-xl p-1 hover:bg-muted/10"
								>
									<DropdownMenuItem
										onClick={() => void switchCampaign(campaign.id)}
										className="min-w-0 flex-1 gap-3 px-2.5 py-1.5"
									>
										<div
											className={cn(
												"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-[9px] font-bold text-white",
												colorForIndex(index),
											)}
										>
											{campaignInitials(campaign.name)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex min-w-0 items-center gap-1.5">
												<span className="truncate text-[12px] font-semibold">
													{campaign.name}
												</span>
												<RoleBadge role={campaign.myRole} />
											</div>
										</div>
										{campaign.id === activeCampaignId && (
											<Check className="h-3.5 w-3.5 text-primary" />
										)}
									</DropdownMenuItem>
									{campaign.myRole === "owner" && (
										<div className="flex items-center pr-1">
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
													className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											)}
										</div>
									)}
								</div>
							);
						})}
						{activeWorld && campaignsInWorld.length === 0 && (
							<p className="px-2.5 py-2 text-[11px] text-muted-foreground">
								Nenhuma campanha neste Mundo.
							</p>
						)}
					</DropdownMenuGroup>

					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={(event) => {
							event.preventDefault();
							openCampaignForm();
						}}
						className="gap-3 py-2.5 text-primary"
					>
						<div className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-primary/40 bg-primary/8">
							<Plus className="h-3.5 w-3.5" />
						</div>
						<span className="text-[12px] font-semibold">Nova Campanha</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={(event) => {
							event.preventDefault();
							openWorldForm();
						}}
						className="gap-3 py-2.5"
					>
						<div className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-sky-400/40 bg-sky-400/8">
							<Globe2 className="h-3.5 w-3.5 text-sky-300" />
						</div>
						<span className="text-[12px] font-semibold">Novo Mundo</span>
					</DropdownMenuItem>
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
							Isso removerá a ambientação do Mundo. As campanhas pertencentes a ele continuarão acessíveis no seu Mundo Padrão. Esta ação não pode ser desfeita.
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
