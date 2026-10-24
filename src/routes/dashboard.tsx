import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { CampaignForm } from "@/components/campaign-form";
import { DashboardActiveQuests } from "@/components/dashboard/dashboard-active-quests";
import { selectDashboardDataStatus } from "@/components/dashboard/dashboard-count-status";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKeyNpcs } from "@/components/dashboard/dashboard-key-npcs";
import { DashboardLatestSession } from "@/components/dashboard/dashboard-latest-session";
import { DashboardLoadErrorNotice } from "@/components/dashboard/dashboard-load-error";
import { DashboardPartyRoster } from "@/components/dashboard/dashboard-party-roster";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardQuickNav } from "@/components/dashboard/dashboard-quick-nav";
import { DashboardQuickVault } from "@/components/dashboard/dashboard-quick-vault";
import { DiscordDitherBanner } from "@/components/discord-dither-banner";
import { InviteBanner } from "@/components/invite-banner";
import { Button } from "@/components/ui/button";
import {
	isCampaignLoadPending,
	needsAppOnboarding,
} from "@/lib/campaign-bootstrap";
import { useActiveCampaignRole, useRPGStore } from "@/lib/store";
import { useVisibleWorldEntities } from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/dashboard")({
	component: Dashboard,
});

function Dashboard() {
	const characters = useRPGStore((s) => s.characters);
	const npcs = useRPGStore((s) => s.npcs);
	const sessions = useRPGStore((s) => s.sessions);
	const items = useRPGStore((s) => s.items);
	const locations = useRPGStore((s) => s.locations);
	const lores = useRPGStore((s) => s.lores);
	const quests = useRPGStore((s) => s.quests || []);
	const factions = useRPGStore((s) => s.factions || []);
	const visibleNpcs = useVisibleWorldEntities(npcs);
	const visibleItems = useVisibleWorldEntities(items);
	const visibleLocations = useVisibleWorldEntities(locations);
	const visibleLores = useVisibleWorldEntities(lores);
	const hasAuthoritativeCampaignSnapshot = useRPGStore(
		(s) => s.hasLoadedCampaigns,
	);
	const campaignLoadStatus = useRPGStore((s) => s.campaignLoadStatus);
	const loadInvites = useRPGStore((s) => s.loadInvites);

	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const activeCampaign = useMemo(
		() => campaigns.find((c) => c.id === activeCampaignId),
		[campaigns, activeCampaignId],
	);
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const activeCampaignRole = useActiveCampaignRole();
	const isViewer = activeCampaignRole === "viewer";

	useEffect(() => {
		void loadInvites();
	}, [loadInvites]);

	const counts = useMemo(
		() => ({
			characters: characters.length,
			npcs: visibleNpcs.length,
			sessions: sessions.length,
			items: visibleItems.length,
			locations: visibleLocations.length,
			lores: visibleLores.length,
			quests: quests.length,
			factions: factions.length,
		}),
		[
			characters.length,
			visibleItems.length,
			visibleLocations.length,
			visibleLores.length,
			visibleNpcs.length,
			sessions.length,
			quests.length,
			factions.length,
		],
	);

	const countStatus = useRPGStore(selectDashboardDataStatus);
	// Seções mostram skeleton (não estado vazio/CTA) até os dados da mesa chegarem.
	const isLoading = countStatus === "loading";
	// Falha global: um aviso no topo; seções ficam neutras (sem vazio/CTA/0).
	const isUnavailable = countStatus === "error";
	const retryBaseLoad = useRPGStore((s) => s.retryBaseLoad);
	const activityLoadError = useRPGStore((s) => s.activityLoadError);
	const isLoadingActivity = useRPGStore((s) => s.isLoadingActivity);
	const retryActivity = useRPGStore((s) => s.retryActivity);

	const lastSession = useMemo(
		() =>
			sessions.reduce<(typeof sessions)[number] | undefined>(
				(latest, session) =>
					!latest || session.createdAt > latest.createdAt ? session : latest,
				undefined,
			),
		[sessions],
	);

	// Campanhas ainda chegando: o próprio painel em skeleton (sem tela de
	// texto "Carregando grimório..."); só decide onboarding com dado real.
	const campaignsPending =
		!hasAuthoritativeCampaignSnapshot &&
		isCampaignLoadPending(campaignLoadStatus);

	if (
		!campaignsPending &&
		(campaigns.length === 0 ||
			needsAppOnboarding({
				campaignLoadStatus,
				campaignCount: campaigns.length,
			}))
	) {
		return null;
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			{isUnavailable && (
				<DashboardLoadErrorNotice onRetry={() => void retryBaseLoad()} />
			)}

			<InviteBanner />

			{/* Discord Community Dithering Banner */}
			<DiscordDitherBanner />

			{/* Operational Header */}
			<DashboardHeader
				activeCampaign={activeCampaign}
				campaignRole={activeCampaignRole}
				isViewer={isViewer}
				counts={counts}
				countStatus={countStatus}
			/>

			{/* Special Ordem Paranormal Banner if applicable */}
			{activeCampaign?.system === "ordem" && (
				<section className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/70 via-purple-900/40 to-black/90 p-5 shadow-lg shadow-purple-950/30 backdrop-blur-md">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-2xl shadow-inner">
								👁️
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h3 className="font-display text-sm font-bold text-white">
										Central de Investigação Paranormal
									</h3>
									<span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-bold text-purple-300 border border-purple-500/30">
										Ordem Paranormal
									</span>
								</div>
								<p className="text-xs text-white/70 mt-0.5">
									Acesse os suplementos oficiais, mapas de combate com grid,
									bestiário de ameaças e trilhas sonoras.
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2 w-full sm:w-auto">
							<Link to="/arquivos-secretos" className="w-full sm:w-auto">
								<Button className="w-full sm:w-auto h-9 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-2 shadow-md shadow-purple-950/50">
									<BookOpen className="h-4 w-4" />
									Abrir Arquivos Secretos
								</Button>
							</Link>
						</div>
					</div>
				</section>
			)}

			{/* Bento Operational Workspace Layout */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				{/* Primary Column (Left) */}
				<div className="flex flex-col gap-6 lg:col-span-8">
					<DashboardLatestSession
						lastSession={lastSession}
						sessionCount={sessions.length}
						isViewer={isViewer}
						isLoading={isLoading}
						isUnavailable={isUnavailable}
					/>

					<DashboardActiveQuests
						quests={quests}
						isViewer={isViewer}
						isLoading={isLoading}
						isUnavailable={isUnavailable}
					/>

					<DashboardPartyRoster
						characters={characters}
						isViewer={isViewer}
						isLoading={isLoading}
						isUnavailable={isUnavailable}
					/>

					<DashboardKeyNpcs
						npcs={visibleNpcs}
						isViewer={isViewer}
						isLoading={isLoading}
						isUnavailable={isUnavailable}
					/>

					<DashboardQuickVault
						items={visibleItems}
						isViewer={isViewer}
						isLoading={isLoading}
						isUnavailable={isUnavailable}
					/>
				</div>

				{/* Secondary Column (Right / Sidebar) */}
				<div className="flex flex-col gap-6 lg:col-span-4">
					<DashboardQuickActions
						activeCampaign={activeCampaign}
						campaignRole={activeCampaignRole}
						isViewer={isViewer}
						onInviteClick={() => setShowInviteDialog(true)}
						isLoading={isLoading}
						isUnavailable={isUnavailable}
					/>

					<DashboardQuickNav counts={counts} countStatus={countStatus} />

					<ActivityFeed
						limit={6}
						isLoading={isLoading || isLoadingActivity}
						isUnavailable={isUnavailable}
						loadError={activityLoadError}
						onRetry={() => void retryActivity()}
					/>
				</div>
			</div>

			{showInviteDialog && activeCampaign && (
				<CampaignForm
					open={showInviteDialog}
					onOpenChange={setShowInviteDialog}
					campaign={activeCampaign}
					defaultTab="members"
				/>
			)}
		</div>
	);
}
