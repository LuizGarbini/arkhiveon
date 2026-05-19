import {
	createRootRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { GlobalError } from "@/components/global-error";
import { NotFound } from "@/components/not-found";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "@/lib/auth";
import { usePerformanceMode } from "@/lib/performance-mode";
import { useRPGStore } from "@/lib/store";
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

	if (isLanding || isAuth || isErrorPreview) {
		return <Outlet />;
	}

	return <ProtectedLayout />;
}

function ProtectedLayout() {
	const navigate = useNavigate();
	const { loading, session, plan } = useAuth();
	const loadRemoteData = useRPGStore((s) => s.loadRemoteData);
	const setupRealtime = useRPGStore((s) => s.setupRealtime);
	const clearLocalData = useRPGStore((s) => s.clearLocalData);
	const loadCampaigns = useRPGStore((s) => s.loadCampaigns);
	const createCampaign = useRPGStore((s) => s.createCampaign);
	const syncError = useRPGStore((s) => s.syncError);
	const setUserPlan = useRPGStore((s) => s.setUserPlan);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	// Sincroniza o plano do Auth Context → Zustand Store
	useEffect(() => {
		setUserPlan(plan);
	}, [plan, setUserPlan]);

	useEffect(() => {
		if (loading) return;
		if (!session) {
			clearLocalData();
			void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
			return;
		}

		async function initCampaigns() {
			await loadCampaigns();

			// Se não há campanhas, criar a padrão
			const state = useRPGStore.getState();
			if (state.campaigns.length === 0) {
				const defaultCampaign = await createCampaign(
					"Campanha Principal",
					"Sua primeira aventura",
				);
				await useRPGStore.getState().switchCampaign(defaultCampaign.id);
			} else if (!state.activeCampaignId) {
				await useRPGStore.getState().switchCampaign(state.campaigns[0].id);
			}

			await loadRemoteData();
		}

		void initCampaigns();
		const cleanup = setupRealtime();

		return () => {
			cleanup();
		};
	}, [
		clearLocalData,
		createCampaign,
		loadCampaigns,
		loadRemoteData,
		loading,
		navigate,
		session,
		setupRealtime,
	]);

	if (loading || (!session && !loading)) {
		return (
			<div className="flex min-h-screen items-center justify-center text-[13px] text-muted-foreground">
				Carregando sess├úo...
			</div>
		);
	}

	return (
		<div className="relative flex h-screen overflow-hidden bg-background sm:gap-3 sm:p-3">
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
				<main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden bg-background scrollbar-none">
					{syncError && (
						<div className="mx-4 mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-[12px] font-medium text-destructive sm:mx-6">
							Falha ao sincronizar: {syncError}
						</div>
					)}
					<Outlet />
				</main>
			</div>
		</div>
	);
}
