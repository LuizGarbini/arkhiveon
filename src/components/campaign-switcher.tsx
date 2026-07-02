import {
	Check,
	ChevronDown,
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
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function RoleBadge({ role }: { role: MembershipRole | undefined }) {
	if (role === "owner") {
		return (
			<span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold text-amber-500 border border-amber-500/20 shadow-xs">
				Mestre
			</span>
		);
	}
	if (role === "editor") {
		return (
			<span className="inline-flex shrink-0 items-center rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[8px] font-bold text-blue-500 border border-blue-500/20 shadow-xs">
				Co-Mestre
			</span>
		);
	}
	return (
		<span className="inline-flex shrink-0 items-center rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[8px] font-bold text-indigo-400 border border-indigo-500/20 shadow-xs">
			Jogador
		</span>
	);
}

interface CampaignSwitcherProps {
	isCollapsed: boolean;
}

function campaignInitials(name: string): string {
	return name
		.split(/\s+/)
		.map((w) => w[0])
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
	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const switchCampaign = useRPGStore((s) => s.switchCampaign);
	const deleteCampaign = useRPGStore((s) => s.deleteCampaign);
	const userPlan = useRPGStore((s) => s.userPlan);
	const toast = useToast();
	const [showForm, setShowForm] = useState(false);
	const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
	const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);
	const [campaignEditTab, setCampaignEditTab] = useState<"general" | "members">(
		"general",
	);
	const isMobile = useIsMobileSidebar();
	const [isOpen, setIsOpen] = useState(false);

	const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
	const activeIndex = campaigns.findIndex((c) => c.id === activeCampaignId);
	const maxCampaigns = userPlan === "pro" ? 5 : 1;

	const handleDelete = async () => {
		if (campaignToDelete) {
			await deleteCampaign(campaignToDelete);
			setCampaignToDelete(null);
		}
	};

	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger
					className={cn(
						"flex w-full items-center overflow-hidden rounded-2xl border border-border/60 bg-background/45 transition-[background-color,border-color,box-shadow,transform,padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/25 hover:bg-primary/8 active:scale-[0.98] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15",
						isCollapsed
							? "justify-center gap-0 p-2"
							: "justify-start gap-3 p-3",
					)}
					aria-label="Trocar campanha"
				>
					<div
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-[10px] font-bold text-white shadow-sm",
							colorForIndex(activeIndex >= 0 ? activeIndex : 0),
						)}
					>
						{activeCampaign ? campaignInitials(activeCampaign.name) : "??"}
					</div>
					<div
						className={cn(
							"flex min-w-0 flex-1 flex-col overflow-hidden leading-tight text-left transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
							isCollapsed
								? "max-w-0 -translate-x-2 opacity-0"
								: "max-w-36 translate-x-0 opacity-100",
						)}
					>
						<div className="flex items-center gap-1.5 min-w-0">
							<span className="truncate text-[12px] font-bold text-foreground">
								{activeCampaign?.name ?? "Sem campanha"}
							</span>
							{activeCampaign && <RoleBadge role={activeCampaign.myRole} />}
						</div>
						<span className="truncate text-[10px] text-muted-foreground">
							{activeCampaign?.description || "Campanha ativa"}
						</span>
					</div>
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 shrink-0 text-muted-foreground transition-[opacity,transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
							isCollapsed
								? "w-0 -translate-x-2 opacity-0"
								: "w-3.5 translate-x-0 opacity-100",
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
					<DropdownMenuGroup>
						<DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
							Campanhas
						</DropdownMenuLabel>
						{campaigns.map((campaign, index) => (
							<div
								key={campaign.id}
								className="flex items-center justify-between gap-1 rounded-xl p-1 hover:bg-muted/10 group/item"
							>
								<DropdownMenuItem
									onClick={() => {
										void switchCampaign(campaign.id);
									}}
									className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-1.5 focus:bg-accent focus:text-accent-foreground select-none outline-none"
								>
									<div className="flex min-w-0 flex-1 items-center gap-3">
										<div
											className={cn(
												"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-[9px] font-bold text-white",
												colorForIndex(index),
											)}
										>
											{campaignInitials(campaign.name)}
										</div>
										<div className="flex min-w-0 flex-1 flex-col leading-tight">
											<div className="flex items-center gap-1.5 min-w-0">
												<span className="truncate text-[12px] font-semibold">
													{campaign.name}
												</span>
												<RoleBadge role={campaign.myRole} />
											</div>
											{campaign.description && (
												<span className="truncate text-[10px] text-muted-foreground">
													{campaign.description}
												</span>
											)}
										</div>
									</div>
									{campaign.id === activeCampaignId && (
										<Check className="h-3.5 w-3.5 shrink-0 text-primary" />
									)}
								</DropdownMenuItem>

								{campaign.myRole === "owner" && (
									<div className="flex items-center gap-0.5 pr-1">
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setCampaignToEdit(campaign);
												setCampaignEditTab("members");
											}}
											aria-label={`Gerenciar jogadores de ${campaign.name}`}
											title="Gerenciar convites e membros"
											className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-[0.88] transition-transform duration-100"
										>
											<UserPlus className="h-3.5 w-3.5" />
										</button>
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setCampaignToEdit(campaign);
												setCampaignEditTab("general");
											}}
											aria-label={`Editar campanha ${campaign.name}`}
											title="Editar detalhes da campanha"
											className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-[0.88] transition-transform duration-100"
										>
											<Pencil className="h-3.5 w-3.5" />
										</button>
										{campaigns.length > 1 && (
											<button
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													setCampaignToDelete(campaign.id);
												}}
												aria-label={`Excluir campanha ${campaign.name}`}
												title="Excluir campanha"
												className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-[0.88] transition-transform duration-100"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</button>
										)}
									</div>
								)}
							</div>
						))}
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={() => {
							const ownedCampaignsCount = campaigns.filter((c) => c.myRole === "owner").length;
							if (ownedCampaignsCount >= maxCampaigns) {
								toast.error({
									title: "Limite Atingido",
									description: `Você atingiu o limite de ${maxCampaigns} campanhas no plano ${userPlan === "pro" ? "Pro" : "Free"}.`,
								});
							} else {
								setShowForm(true);
							}
						}}
						className="flex items-center gap-3 py-2.5 text-primary"
					>
						<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/40 bg-primary/8">
							<Plus className="h-3.5 w-3.5" />
						</div>
						<span className="text-[12px] font-semibold">Nova Campanha</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<CampaignForm open={showForm} onOpenChange={setShowForm} />
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
							Isso removerá a campanha e TODOS os dados associados a ela
							(personagens, NPCs, sessões, lores, etc.). Esta ação é definitiva
							e não pode ser desfeita.
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
