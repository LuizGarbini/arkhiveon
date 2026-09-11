import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Flag } from "lucide-react";
import { useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useRPGStore } from "@/lib/store";
import { canViewScopedContent } from "@/lib/worldbuilding/visibility";

export function VTTJournal({
	campaignId,
	open,
	onOpenChange,
}: {
	campaignId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const sessions = useRPGStore((s) => s.sessions);
	const quests = useRPGStore((s) => s.quests);
	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const campaign = campaigns.find((c) => c.id === campaignId);
	const latest = useMemo(
		() =>
			activeCampaignId === campaignId
				? [...sessions].sort((a, b) => b.number - a.number)[0]
				: undefined,
		[sessions, activeCampaignId, campaignId],
	);
	const activeQuests = useMemo(
		() =>
			quests.filter(
				(q) =>
					q.status === "active" &&
					canViewScopedContent(q, campaign, campaign?.myRole, campaigns),
			),
		[quests, campaign, campaigns],
	);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="vtt-dialog max-h-[85dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 font-display text-xl">
						<BookOpen className="size-5 text-primary" />
						Diário da campanha
					</DialogTitle>
					<DialogDescription>
						Retome a história sem perder o lugar na mesa. Conteúdo de apoio do
						mestre.
					</DialogDescription>
				</DialogHeader>
				<section className="rounded-2xl border border-border/70 bg-card-elevated p-5">
					<p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
						Onde paramos
					</p>
					<h3 className="mt-2 font-display text-lg font-bold">
						{latest?.title || "Sua próxima crônica começa aqui"}
					</h3>
					<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
						{latest?.summary ||
							"Registre a sessão na campanha para consultar o resumo durante o jogo."}
					</p>
					{latest?.cliffhanger && (
						<p className="mt-4 border-l-2 border-primary pl-3 text-sm leading-relaxed">
							{latest.cliffhanger}
						</p>
					)}
					<Link
						to="/sessions"
						target="_blank"
						rel="noopener noreferrer"
						className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-primary focus-visible:ring-2"
					>
						Abrir sessões em outra aba
						<ArrowUpRight className="size-4" />
					</Link>
				</section>
				<section className="space-y-3">
					<h3 className="flex items-center gap-2 text-sm font-semibold">
						<Flag className="size-4 text-primary" />
						Missões em andamento{" "}
						<span className="ml-auto tabular-nums text-muted-foreground">
							{activeQuests.length}
						</span>
					</h3>
					{activeQuests.map((quest) => (
						<article
							key={quest.id}
							className="rounded-xl border border-border/70 p-4"
						>
							<h4 className="text-sm font-semibold">{quest.title}</h4>
							<p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
								{quest.description}
							</p>
							{quest.giverNpcName && (
								<p className="mt-2 text-xs text-primary">
									Contato: {quest.giverNpcName}
								</p>
							)}
						</article>
					))}
					{activeQuests.length === 0 && (
						<p className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
							Nenhuma missão ativa nesta campanha.
						</p>
					)}
					<Link
						to="/quests"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-primary focus-visible:ring-2"
					>
						Abrir missões em outra aba
						<ArrowUpRight className="size-4" />
					</Link>
				</section>
			</DialogContent>
		</Dialog>
	);
}
