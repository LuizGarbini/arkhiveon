import { Check, Loader2, Mail, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRPGStore } from "@/lib/store";

export function InviteBanner() {
	const pendingInvites = useRPGStore((s) => s.pendingInvites);
	const acceptInvite = useRPGStore((s) => s.acceptInvite);
	const declineInvite = useRPGStore((s) => s.declineInvite);
	const toast = useToast();

	const [processingId, setProcessingId] = useState<string | null>(null);

	if (!pendingInvites || pendingInvites.length === 0) return null;

	const handleAccept = async (inviteId: string, campaignName: string) => {
		setProcessingId(inviteId);
		try {
			await acceptInvite(inviteId);
			toast.success({
				title: "Convite aceito!",
				description: `Você agora faz parte da campanha "${campaignName}".`,
			});
		} catch (error: any) {
			toast.error({
				title: "Erro ao aceitar convite",
				description: error.message || "Tente novamente mais tarde.",
			});
		} finally {
			setProcessingId(null);
		}
	};

	const handleDecline = async (inviteId: string, campaignName: string) => {
		setProcessingId(inviteId);
		try {
			await declineInvite(inviteId);
			toast.info({
				title: "Convite recusado",
				description: `Você recusou o convite para a campanha "${campaignName}".`,
			});
		} catch (error: any) {
			toast.error({
				title: "Erro ao recusar convite",
				description: error.message || "Tente novamente mais tarde.",
			});
		} finally {
			setProcessingId(null);
		}
	};

	return (
		<div className="space-y-3">
			{pendingInvites.map((invite) => {
				const isProcessing = processingId === invite.id;
				return (
					<div
						key={invite.id}
						className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-card/85 via-card/90 to-primary-muted/20 p-5 shadow-xl shadow-black/5 backdrop-blur-md transition-all duration-300"
					>
						{/* Subtle glowing effect */}
						<div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl animate-pulse" />

						<div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-start gap-4">
								<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
									<Mail className="h-5 w-5" />
								</div>
								<div className="space-y-1">
									<h4 className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
										<Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />{" "}
										Convite para Nova Campanha
									</h4>
									<p className="text-[12px] text-muted-foreground leading-normal">
										Você foi convidado para a mesa{" "}
										<span className="font-bold text-foreground">
											{invite.campaignName || "Campanha sem nome"}
										</span>{" "}
										como{" "}
										<span className="font-semibold text-primary">
											{invite.role === "editor" ? "Co-Mestre" : "Jogador"}
										</span>
										.
									</p>
								</div>
							</div>

							<div className="flex items-center gap-2 self-end sm:self-center">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									disabled={isProcessing}
									onClick={() =>
										handleDecline(
											invite.id,
											invite.campaignName || "Campanha sem nome",
										)
									}
									className="h-8 text-[11px] font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive gap-1.5"
								>
									{isProcessing ? (
										<Loader2 className="h-3 w-3 animate-spin" />
									) : (
										<X className="h-3.5 w-3.5" />
									)}
									Recusar
								</Button>
								<Button
									type="button"
									size="sm"
									disabled={isProcessing}
									onClick={() =>
										handleAccept(
											invite.id,
											invite.campaignName || "Campanha sem nome",
										)
									}
									className="h-8 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
								>
									{isProcessing ? (
										<Loader2 className="h-3 w-3 animate-spin" />
									) : (
										<Check className="h-3.5 w-3.5" />
									)}
									Aceitar Convite
								</Button>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
