import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRPGStore } from "@/lib/store";
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
	const [showForm, setShowForm] = useState(false);
	const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
	const isMobile = useIsMobileSidebar();

	const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
	const activeIndex = campaigns.findIndex((c) => c.id === activeCampaignId);

	const handleDelete = async () => {
		if (campaignToDelete) {
			await deleteCampaign(campaignToDelete);
			setCampaignToDelete(null);
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button
							type="button"
							aria-label="Trocar campanha"
							className={cn(
								"flex w-full items-center overflow-hidden rounded-2xl border border-border/60 bg-background/45 transition-[background-color,border-color,box-shadow,transform,padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/25 hover:bg-primary/8 active:scale-[0.98]",
								isCollapsed
									? "justify-center gap-0 p-2"
									: "justify-start gap-3 p-3",
							)}
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
									"flex min-w-0 flex-1 flex-col overflow-hidden leading-tight transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
									isCollapsed
										? "max-w-0 -translate-x-2 opacity-0"
										: "max-w-36 translate-x-0 opacity-100",
								)}
							>
								<span className="truncate text-[12px] font-bold text-foreground">
									{activeCampaign?.name ?? "Sem campanha"}
								</span>
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
								)}
							/>
						</button>
					}
				/>

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
							<DropdownMenuItem
								key={campaign.id}
								onClick={() => {
									void switchCampaign(campaign.id);
								}}
								className="group flex items-center justify-between gap-3 py-2.5"
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
										<span className="truncate text-[12px] font-semibold">
											{campaign.name}
										</span>
										{campaign.description && (
											<span className="truncate text-[10px] text-muted-foreground">
												{campaign.description}
											</span>
										)}
									</div>
								</div>

								<div className="flex items-center gap-2">
									{campaign.id === activeCampaignId && (
										<Check className="h-3.5 w-3.5 shrink-0 text-primary" />
									)}
									{campaigns.length > 1 && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setCampaignToDelete(campaign.id);
											}}
											aria-label={`Excluir campanha ${campaign.name}`}
											className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									)}
								</div>
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={() => setShowForm(true)}
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

			<Dialog
				open={!!campaignToDelete}
				onOpenChange={(open) => !open && setCampaignToDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Excluir Campanha?</DialogTitle>
						<DialogDescription>
							Isso removerá apenas o registro da campanha. Os dados associados a
							ela no banco de dados não serão deletados, mas ficarão órfãos.
							Esta ação não pode ser desfeita.
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
