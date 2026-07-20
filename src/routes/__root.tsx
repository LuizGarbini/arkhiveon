import {
	createRootRoute,
	Link,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowUpRight,
	CheckCircle2,
	Crown,
	X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { GlobalError } from "@/components/global-error";
import { LegacyWorldNamingGate } from "@/components/legacy-world-naming-gate";
import { NotFound } from "@/components/not-found";
import { Sidebar } from "@/components/sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { useDocumentMetadata } from "@/hooks/use-document-metadata";
import { AuthProvider, useAuth } from "@/lib/auth";
import { needsAppOnboarding } from "@/lib/campaign-bootstrap";
import { usePerformanceMode } from "@/lib/performance-mode";
import { useRPGStore } from "@/lib/store";
import { FREE_CREATION_LIMIT } from "@/lib/store/sync-slice";
import { cn } from "@/lib/utils";

export const Route = createRootRoute({
	component: RootLayout,
	errorComponent: GlobalError,
	notFoundComponent: NotFound,
});

function RootLayout() {
	usePerformanceMode();

	return (
		<ToastProvider>
			<AuthProvider>
				<RootContent />
			</AuthProvider>
		</ToastProvider>
	);
}

function RootContent() {
	const location = useLocation();
	const isLanding = location.pathname === "/";
	const isAuth = location.pathname === "/auth";
	const isErrorPreview = location.pathname === "/error-preview";
	const isPrivacy = location.pathname === "/privacy";
	const isTerms = location.pathname === "/terms";

	if (isLanding || isAuth || isErrorPreview || isPrivacy || isTerms) {
		return <Outlet />;
	}

	return <ProtectedLayout />;
}

function ProtectedLayout() {
	const navigate = useNavigate();
	const mainContentId = useId();
	const { loading, session, plan } = useAuth();
	const loadRemoteData = useRPGStore((s) => s.loadRemoteData);
	const setupRealtime = useRPGStore((s) => s.setupRealtime);
	const clearLocalData = useRPGStore((s) => s.clearLocalData);
	const loadCampaigns = useRPGStore((s) => s.loadCampaigns);
	const syncError = useRPGStore((s) => s.syncError);
	const setUserPlan = useRPGStore((s) => s.setUserPlan);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [dismissedLimitError, setDismissedLimitError] = useState<string | null>(
		null,
	);
	const isLimitError = Boolean(syncError && isCreationLimitError(syncError));
	const showLimitDialog = Boolean(
		syncError && isLimitError && dismissedLimitError !== syncError,
	);

	const location = useLocation();

	const getPageTitle = (pathname: string) => {
		if (pathname.startsWith("/dashboard")) return "Dashboard - Arkhiveon";
		if (pathname.startsWith("/characters")) return "Personagens - Arkhiveon";
		if (pathname.startsWith("/npcs")) return "NPCs - Arkhiveon";
		if (pathname.startsWith("/sessions")) return "Sessões - Arkhiveon";
		if (pathname.startsWith("/sheets/new"))
			return "Novo Personagem - Arkhiveon";
		if (pathname.startsWith("/sheets")) return "Fichas - Arkhiveon";
		if (pathname.startsWith("/settings")) return "Configurações - Arkhiveon";
		if (pathname.startsWith("/account")) return "Minha Conta - Arkhiveon";
		if (pathname.startsWith("/billing")) return "Assinatura - Arkhiveon";
		if (pathname.startsWith("/onboarding")) return "Começar - Arkhiveon";
		if (pathname.startsWith("/family-tree"))
			return "Árvore Genealógica - Arkhiveon";
		if (pathname.startsWith("/images")) return "Galeria de Imagens - Arkhiveon";
		return "Arkhiveon";
	};

	useDocumentMetadata(getPageTitle(location.pathname), "", false);

	// Sincroniza o plano do Auth Context → Zustand Store
	useEffect(() => {
		setUserPlan(plan);
	}, [plan, setUserPlan]);

	useEffect(() => {
		if (!syncError || !isCreationLimitError(syncError)) {
			setDismissedLimitError(null);
		}
	}, [syncError]);

	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const hasLoadedCampaigns = useRPGStore((s) => s.hasLoadedCampaigns);
	const campaigns = useRPGStore((s) => s.campaigns);

	useEffect(() => {
		if (loading) return;
		if (!session) {
			clearLocalData();
			void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
			return;
		}

		async function initCampaigns() {
			await loadCampaigns();

			const state = useRPGStore.getState();
			if (state.campaigns.length > 0 && !state.activeCampaignId) {
				await useRPGStore.getState().switchCampaign(state.campaigns[0].id);
			}

			await loadRemoteData();
		}

		void initCampaigns();
	}, [
		clearLocalData,
		loadCampaigns,
		loadRemoteData,
		loading,
		navigate,
		session,
	]);

	useEffect(() => {
		if (loading || !session || !hasLoadedCampaigns) return;

		const onboarding = needsAppOnboarding({
			hasLoadedCampaigns,
			campaignCount: campaigns.length,
		});
		const onOnboardingRoute = location.pathname.startsWith("/onboarding");

		if (onboarding && !onOnboardingRoute) {
			void navigate({ to: "/onboarding", replace: true });
			return;
		}

		if (!onboarding && onOnboardingRoute) {
			void navigate({ to: "/dashboard", replace: true });
			return;
		}

		const campaignDependentPrefixes = [
			"/characters",
			"/npcs",
			"/sessions",
			"/sheets",
			"/family-tree",
			"/images",
			"/items",
			"/locations",
			"/lore",
			"/templates",
			"/factions",
			"/news",
			"/world",
		];
		const isCampaignDependentRoute = campaignDependentPrefixes.some((prefix) =>
			location.pathname.startsWith(prefix),
		);

		if (campaigns.length === 0 && isCampaignDependentRoute) {
			void navigate({
				to: onboarding ? "/onboarding" : "/dashboard",
				replace: true,
			});
		}
	}, [
		loading,
		session,
		hasLoadedCampaigns,
		campaigns.length,
		location.pathname,
		navigate,
	]);

	useEffect(() => {
		if (loading || !session || !activeCampaignId) return;

		const cleanup = setupRealtime();
		return () => {
			cleanup();
		};
	}, [loading, session, activeCampaignId, setupRealtime]);

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center text-[13px] text-muted-foreground">
				Autenticando...
			</div>
		);
	}

	if (!session) {
		return null; // The useEffect handles the redirect without flickering the UI
	}

	if (!hasLoadedCampaigns) {
		return (
			<div className="flex min-h-screen items-center justify-center text-[13px] text-muted-foreground">
				Carregando campanhas...
			</div>
		);
	}

	const onboarding = needsAppOnboarding({
		hasLoadedCampaigns,
		campaignCount: campaigns.length,
	});

	if (onboarding || location.pathname.startsWith("/onboarding")) {
		return <Outlet />;
	}

	return (
		<div className="relative flex h-screen overflow-hidden bg-background sm:gap-3 sm:p-3">
			<a
				href={`#${mainContentId}`}
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-lg focus:border focus:border-primary/30 focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-primary focus:shadow-lg"
			>
				Pular para o conteúdo
			</a>
			{/* Mobile Sidebar Overlay */}
			{isSidebarOpen && (
				<button
					type="button"
					aria-label="Fechar menu lateral"
					className="fixed inset-0 z-90 bg-background/80 md:hidden"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			{/* Sidebar Island */}
			<div
				className={cn(
					"fixed inset-y-0 left-0 z-100 flex flex-col overflow-hidden bg-background transition-transform duration-150 md:relative md:z-0 md:flex md:translate-x-0 md:rounded-xl md:border md:border-border/60 md:bg-card",
					isSidebarOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<Sidebar
					isOpen={true}
					onItemClick={() => {
						if (window.innerWidth < 768) {
							setIsSidebarOpen(false);
						}
					}}
				/>
			</div>

			{/* Dashboard Island */}
			<div className="flex flex-1 flex-col overflow-hidden bg-card sm:rounded-xl sm:border sm:border-border/60">
				<AppHeader
					isSidebarOpen={isSidebarOpen}
					onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
				/>
				<main
					id={mainContentId}
					tabIndex={-1}
					aria-label="Conteúdo principal"
					data-shortcut-target="main-content"
					className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden bg-background scrollbar-none focus:outline-none"
				>
					{syncError && !isLimitError && <SyncErrorBanner error={syncError} />}
					<Outlet />
				</main>
			</div>
			<LegacyWorldNamingGate />
			{showLimitDialog && (
				<UpgradeLimitDialog
					onDismiss={() => {
						if (syncError) {
							setDismissedLimitError(syncError);
						}
					}}
				/>
			)}
		</div>
	);
}

function UpgradeLimitDialog({ onDismiss }: { onDismiss: () => void }) {
	const titleId = useId();
	const descriptionId = useId();

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur-sm">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-border/70 bg-card text-foreground shadow-2xl shadow-black/20"
			>
				<button
					type="button"
					aria-label="Fechar aviso de upgrade"
					className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onClick={onDismiss}
				>
					<X className="h-4 w-4" />
				</button>

				<div className="px-6 pb-5 pt-6">
					<div className="flex items-start gap-4 pr-8">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
							<Crown className="h-5 w-5" />
						</div>
						<div className="min-w-0">
							<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
								Plano Free
							</p>
							<h2
								id={titleId}
								className="font-display mt-1 text-xl font-bold leading-tight tracking-tight text-foreground"
							>
								Limite de criações atingido
							</h2>
							<p
								id={descriptionId}
								className="mt-2 text-[13px] leading-relaxed text-muted-foreground"
							>
								Você usou os {FREE_CREATION_LIMIT} registros do plano gratuito.
								Com o Pro, seu grimório continua crescendo sem travar sua
								sessão.
							</p>
						</div>
					</div>

					<div className="mt-5 grid gap-2 rounded-xl border border-border/70 bg-background/55 p-3">
						<div className="flex items-center gap-2 text-[12px] font-medium">
							<CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
							<span>Crie personagens, fichas, NPCs e notas sem limite.</span>
						</div>
						<div className="flex items-center gap-2 text-[12px] font-medium">
							<CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
							<span>Mantenha suas campanhas e anotações sincronizadas.</span>
						</div>
					</div>
				</div>

				<div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-background/50 px-6 py-4 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="ghost"
						className="sm:min-w-28"
						onClick={onDismiss}
					>
						Agora não
					</Button>
					<Link
						to="/billing"
						search={{}}
						onClick={onDismiss}
						className={cn(
							buttonVariants({ variant: "default" }),
							"h-10 gap-2 px-4 font-bold sm:min-w-36",
						)}
					>
						Ver plano Pro
						<ArrowUpRight className="h-4 w-4" />
					</Link>
				</div>
			</div>
		</div>
	);
}

function SyncErrorBanner({ error }: { error: string }) {
	return (
		<div
			role="alert"
			className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[12px] font-medium text-destructive sm:mx-6"
		>
			<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
			<div>
				<p className="font-bold">Falha ao sincronizar</p>
				<p className="mt-0.5 leading-relaxed">{error}</p>
			</div>
		</div>
	);
}

function isCreationLimitError(error: string): boolean {
	return /limite de registros atingido/i.test(error);
}
