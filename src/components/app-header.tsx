import { useLocation, useNavigate } from "@tanstack/react-router";
import {
	Bell,
	CheckCircle2,
	CreditCard,
	Info,
	Keyboard,
	LogOut,
	Music,
	PanelLeftClose,
	PanelLeftOpen,
	Search,
	Settings,
	Sparkles,
	User,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { ChangelogPanel } from "@/components/changelog-panel";
import { GlobalSearch } from "@/components/global-search";
import { JamPresenceSync } from "@/components/jam-presence-sync";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { SpotifyJamCard } from "@/components/spotify-jam-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CHANGELOG_DATA } from "@/data/updates";
import { useAuth } from "@/lib/auth";
import {
	clickShortcutAction,
	focusMainContent,
	focusPageSearch,
	GLOBAL_SEARCH_SHORTCUT_ARIA,
	getPrimaryModifierLabel,
	hasOpenBlockingDialog,
	isEditableShortcutTarget,
	NAVIGATION_SHORTCUTS,
	SHORTCUT_HELP_SHORTCUT_ARIA,
} from "@/lib/keyboard-shortcuts";
import { useRPGStore } from "@/lib/store";
import { useShortcutViewport } from "@/lib/use-shortcut-viewport";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button, buttonVariants } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface AppHeaderProps {
	isSidebarOpen: boolean;
	onToggleSidebar: () => void;
}

export function AppHeader({ isSidebarOpen, onToggleSidebar }: AppHeaderProps) {
	const { user, signOut } = useAuth();
	const clearLocalData = useRPGStore((state) => state.clearLocalData);
	const spotifyJamLink = useRPGStore((state) => state.spotifyJamLink);
	const spotifyUser = useRPGStore((state) => state.spotifyUser);
	const notifications = useRPGStore((state) => state.notifications);
	const markAllNotificationsAsRead = useRPGStore((state) => state.markAllNotificationsAsRead);
	const clearNotifications = useRPGStore((state) => state.clearNotifications);
	const navigate = useNavigate();
	const location = useLocation();
	const toast = useToast();
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [isChangelogOpen, setIsChangelogOpen] = useState(false);
	const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);
	const latestUpdateId = CHANGELOG_DATA[0]?.id;

	useEffect(() => {
		const lastSeenId = localStorage.getItem("arkhiveon_last_seen_update");
		if (latestUpdateId && lastSeenId !== latestUpdateId) {
			setHasUnreadUpdates(true);
			if (user) {
				setIsChangelogOpen(true);
				localStorage.setItem("arkhiveon_last_seen_update", latestUpdateId);
				setHasUnreadUpdates(false);
			}
		}
	}, [user, latestUpdateId]);

	const metadataName = user?.user_metadata?.name;
	const userName =
		typeof metadataName === "string" && metadataName.trim()
			? metadataName
			: "Aventureiro";
	const userEmail = user?.email || "contato@arkhiveon.com";
	const userImage = spotifyUser?.image || "";
	const initials = userName
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
	const pageTitle = getPageTitle(location.pathname);

	async function handleSignOut() {
		if (isSigningOut) return;
		setIsSigningOut(true);
		const error = await signOut();
		setIsSigningOut(false);

		if (error) {
			toast.error({
				title: "Não foi possível sair",
				description: error,
			});
			return;
		}

		clearLocalData();
		toast.success({
			title: "Sessão encerrada",
			description: "Você saiu do Arkhiveon com segurança.",
		});
		await navigate({ to: "/auth", search: { mode: "login" }, replace: true });
	}

	const isLoading = useRPGStore((state) => state.isLoadingRemote);

	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
	const [shortcutAnnouncement, setShortcutAnnouncement] = useState("");
	const supportsShortcuts = useShortcutViewport();
	const primaryModifierLabel = getPrimaryModifierLabel();

	useEffect(() => {
		if (!supportsShortcuts) {
			setIsShortcutsOpen(false);
			return;
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			const isPrimaryModifier = e.metaKey || e.ctrlKey;
			const isDialogOpen = hasOpenBlockingDialog();

			if (
				isPrimaryModifier &&
				!e.altKey &&
				!e.shiftKey &&
				key === "k" &&
				!isDialogOpen
			) {
				e.preventDefault();
				setIsSearchOpen(true);
				setIsShortcutsOpen(false);
				return;
			}

			if (
				isPrimaryModifier &&
				!e.altKey &&
				!e.shiftKey &&
				e.key === "/" &&
				!isDialogOpen
			) {
				e.preventDefault();
				setIsShortcutsOpen(true);
				setIsSearchOpen(false);
				return;
			}

			if (isDialogOpen || isEditableShortcutTarget(e.target)) return;

			if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
				const navigationShortcut = NAVIGATION_SHORTCUTS.find(
					(shortcut) => shortcut.key === key,
				);

				if (navigationShortcut) {
					e.preventDefault();
					setShortcutAnnouncement(`Navegando para ${navigationShortcut.label}`);
					void navigate({ to: navigationShortcut.to });
					return;
				}

				if (key === "s") {
					e.preventDefault();
					if (focusPageSearch()) {
						setShortcutAnnouncement("Filtro da página em foco");
					} else {
						setIsSearchOpen(true);
					}
					return;
				}

				if (key === "n") {
					e.preventDefault();
					if (clickShortcutAction("new")) {
						setShortcutAnnouncement("Ação de novo registro aberta");
					}
					return;
				}

				if (key === "m") {
					e.preventDefault();
					if (focusMainContent()) {
						setShortcutAnnouncement("Conteúdo principal em foco");
					}
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [navigate, supportsShortcuts]);

	return (
		<>
			{spotifyJamLink && <JamPresenceSync />}
			{isSearchOpen && (
				<GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
			)}
			{supportsShortcuts && isShortcutsOpen && (
				<KeyboardShortcutsDialog
					open={isShortcutsOpen}
					onOpenChange={setIsShortcutsOpen}
				/>
			)}
			<span className="sr-only" aria-live="polite">
				{shortcutAnnouncement}
			</span>
			<header className="sticky top-0 z-50 flex min-h-16 w-full items-center justify-between border-b border-border/40 bg-card px-6">
				<div className="flex flex-1 items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						aria-label={
							isSidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"
						}
						onClick={onToggleSidebar}
						className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground md:hidden"
					>
						{isSidebarOpen ? (
							<PanelLeftClose className="h-4 w-4" />
						) : (
							<PanelLeftOpen className="h-4 w-4" />
						)}
					</Button>

					<div className="hidden h-4 w-px bg-border/40 sm:block md:hidden" />
					<div className="hidden min-w-36 flex-col sm:flex">
						<span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
							Arkhiveon
						</span>
						<span className="mt-0.5 text-[13px] font-bold text-foreground">
							{pageTitle}
						</span>
					</div>

					<div className="hidden flex-1 items-center justify-center md:flex">
						<button
							type="button"
							aria-label="Abrir pesquisa global"
							aria-keyshortcuts={GLOBAL_SEARCH_SHORTCUT_ARIA}
							onClick={() => setIsSearchOpen(true)}
							className="relative w-full max-w-md group"
						>
							<Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors" />
							<div className="flex h-10 w-full items-center gap-2 rounded-2xl border border-border/70 bg-background/55 px-9 text-[13px] text-muted-foreground shadow-sm shadow-black/5 transition-[border-color,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:border-primary/45 group-hover:bg-background/75">
								<span>Pesquisar no Arkhiveon...</span>
								<kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
									<span>{primaryModifierLabel}</span>K
								</kbd>
							</div>
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2.5">
					{supportsShortcuts && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Abrir atalhos de teclado"
							aria-keyshortcuts={SHORTCUT_HELP_SHORTCUT_ARIA}
							title={`Atalhos de teclado (${primaryModifierLabel}+/)`}
							onClick={() => setIsShortcutsOpen(true)}
							className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
						>
							<Keyboard className="h-4 w-4" />
						</Button>
					)}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Abrir novidades e changelog"
						title="Novidades e Atualizações"
						onClick={() => {
							setIsChangelogOpen(true);
							if (latestUpdateId) {
								localStorage.setItem(
									"arkhiveon_last_seen_update",
									latestUpdateId,
								);
							}
							setHasUnreadUpdates(false);
						}}
						className="relative h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
					>
						<Sparkles className="h-4 w-4" />
						{hasUnreadUpdates && (
							<span className="absolute right-2 top-2 flex h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
						)}
					</Button>
					<Popover>
						<PopoverTrigger
							className={cn(
								buttonVariants({ variant: "ghost", size: "icon" }),
								"relative h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground",
							)}
							aria-label="Abrir notificações"
						>
							<Bell className="h-4 w-4" />
							{notifications.some((n) => !n.read) && (
								<span className="absolute right-2 top-2 flex h-1.5 w-1.5 rounded-full bg-primary" />
							)}
						</PopoverTrigger>
						<PopoverContent className="w-80 overflow-hidden p-0" align="end">
							<div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
								<span className="text-xs font-bold uppercase tracking-wider text-foreground">
									Notificações
								</span>
								{notifications.length > 0 && (
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => markAllNotificationsAsRead()}
											className="text-[10px] font-bold text-primary hover:underline"
										>
											Marcar lidas
										</button>
										<span className="text-[10px] text-muted-foreground">•</span>
										<button
											type="button"
											onClick={() => clearNotifications()}
											className="text-[10px] font-bold text-destructive hover:underline"
										>
											Limpar
										</button>
									</div>
								)}
							</div>
							<div className="max-h-[300px] overflow-y-auto">
								{notifications.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
										<Bell className="h-8 w-8 opacity-25" />
										<span className="mt-2 text-xs font-semibold">Tudo calmo por aqui</span>
										<span className="text-[10px] opacity-60">Você não tem novas notificações</span>
									</div>
								) : (
									notifications.map((n) => (
										<NotificationItem
											key={n.id}
											icon={
												n.variant === "success" ? (
													<CheckCircle2 className="h-3 w-3 text-emerald-400" />
												) : (
													<Info className="h-3 w-3 text-blue-400" />
												)
											}
											time={formatRelativeTime(n.createdAt)}
											title={n.title}
											description={n.description || ""}
											read={n.read}
										/>
									))
								)}
							</div>
						</PopoverContent>
					</Popover>

					<Popover>
						<PopoverTrigger
							className={cn(
								buttonVariants({ variant: "ghost", size: "icon" }),
								"relative h-9 w-9 rounded-xl text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400",
							)}
							aria-label="Abrir Spotify Jam"
							title="Spotify Jam"
						>
							<Music className="h-4 w-4" />
							{spotifyJamLink && (
								<span className="absolute right-2 top-2 flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
							)}
						</PopoverTrigger>
						<PopoverContent
							className="w-[380px] overflow-hidden p-0"
							align="end"
						>
							<SpotifyJamCard isDM={true} />
						</PopoverContent>
					</Popover>

					<div className="mx-1 h-4 w-px bg-border/40" />

					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								"flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border/70 transition-[opacity,transform,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 hover:shadow-md active:scale-[0.97] focus:outline-none",
							)}
							aria-label="Abrir menu da conta"
						>
							{isLoading ? (
								<Skeleton className="h-full w-full rounded-full" />
							) : (
								<Avatar className="h-full w-full">
									<AvatarImage src={userImage} />
									<AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
										{initials}
									</AvatarFallback>
								</Avatar>
							)}
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-56" align="end">
							<DropdownMenuGroup>
								<DropdownMenuLabel className="font-normal">
									<div className="flex items-center gap-3 px-1 py-1.5">
										<Avatar className="h-9 w-9 border border-border/60">
											<AvatarImage src={userImage} />
											<AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
												{initials}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col space-y-0.5 min-w-0 flex-1">
											<p className="text-sm font-bold text-foreground truncate">
												{userName}
											</p>
											<p className="text-xs text-muted-foreground truncate">
												{userEmail}
											</p>
										</div>
									</div>
								</DropdownMenuLabel>
							</DropdownMenuGroup>
							<DropdownMenuSeparator className="bg-border/50" />
							<DropdownMenuGroup>
								<DropdownMenuItem
									onClick={() => void navigate({ to: "/account" })}
									className="gap-2 text-xs font-medium focus:bg-primary/10 focus:text-primary cursor-pointer"
								>
									<User className="h-3.5 w-3.5" />
									<span>Minha Conta</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => void navigate({ to: "/settings" })}
									className="gap-2 text-xs font-medium focus:bg-primary/10 focus:text-primary cursor-pointer"
								>
									<Settings className="h-3.5 w-3.5" />
									<span>Configurações</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => void navigate({ to: "/billing", search: {} })}
									className="gap-2 text-xs font-medium focus:bg-primary/10 focus:text-primary cursor-pointer"
								>
									<CreditCard className="h-3.5 w-3.5" />
									<span>Plano & Assinatura</span>
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator className="bg-border/50" />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => void handleSignOut()}
								disabled={isSigningOut}
								className="gap-2 text-xs font-bold cursor-pointer"
							>
								<LogOut className="h-3.5 w-3.5" />
								<span>{isSigningOut ? "Saindo..." : "Sair do Arkhiveon"}</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>
			<ChangelogPanel
				open={isChangelogOpen}
				onClose={() => setIsChangelogOpen(false)}
			/>
		</>
	);
}

function getPageTitle(pathname: string) {
	if (pathname === "/dashboard") return "Dashboard";
	if (pathname.startsWith("/account")) return "Minha Conta";
	if (pathname.startsWith("/settings")) return "Configurações";
	if (pathname.startsWith("/dashboard")) return "Dashboard";
	if (pathname.startsWith("/characters")) return "Personagens";
	if (pathname.startsWith("/sheets")) return "Personagens";
	if (pathname.startsWith("/family-tree")) return "Árvore Genealógica";
	if (pathname.startsWith("/npcs")) return "NPCs";
	if (pathname.startsWith("/sessions")) return "Sessões";
	if (pathname.startsWith("/items")) return "Itens";
	if (pathname.startsWith("/locations")) return "Locais";
	if (pathname.startsWith("/lore")) return "Lore";
	if (pathname.startsWith("/design-system")) return "Design System";
	return "Arkhiveon";
}

function NotificationItem({
	icon,
	time,
	title,
	description,
	read,
}: {
	icon: ReactNode;
	time: string;
	title: string;
	description: string;
	read: boolean;
}) {
	return (
		<div
			className={cn(
				"flex gap-3 border-b border-border/40 p-3 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/30",
				!read && "bg-primary/5",
			)}
		>
			<div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background/50 ring-1 ring-border/60">
				{icon}
			</div>
			<div className="flex flex-1 flex-col gap-0.5">
				<div className="flex items-center justify-between gap-2">
					<span
						className={cn(
							"text-[11px] font-bold truncate",
							read ? "text-foreground/80 font-semibold" : "text-foreground font-extrabold",
						)}
					>
						{title}
					</span>
					<span className="text-[9px] text-muted-foreground whitespace-nowrap">
						{time}
					</span>
				</div>
				<p className="text-[11px] leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>
		</div>
	);
}
