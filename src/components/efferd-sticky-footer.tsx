import {
	ArrowUpRight,
	BookOpen,
	Instagram,
	Linkedin,
	type LucideIcon,
	Mail,
	Monitor,
	Moon,
	Sun,
	Twitch,
	Twitter,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";

type ThemeMode = "system" | "light" | "dark";

type FooterLink = {
	label: string;
	href: string;
};

type FooterLinkGroup = {
	label: string;
	links: FooterLink[];
};

const footerLinkGroups: FooterLinkGroup[] = [
	{
		label: "Conta",
		links: [
			{ label: "Entrar", href: "/auth?mode=login" },
			{ label: "Criar conta", href: "/auth?mode=register" },
			{ label: "Planos", href: "/billing" },
			{ label: "Status", href: "/" },
		],
	},
	{
		label: "Legal",
		links: [
			{ label: "Política LGPD", href: "/" },
			{ label: "Privacidade", href: "/" },
			{ label: "Termos", href: "/" },
		],
	},
];

const socialLinks: Array<{
	label: string;
	href: string;
	Icon: LucideIcon;
}> = [
	{ label: "Instagram", href: "https://www.instagram.com", Icon: Instagram },
	{ label: "X (Twitter)", href: "https://x.com", Icon: Twitter },
	{ label: "Twitch", href: "https://www.twitch.tv", Icon: Twitch },
	{ label: "LinkedIn", href: "https://www.linkedin.com", Icon: Linkedin },
];

export function EfferdStickyFooter() {
	const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
		if (typeof window === "undefined") return "dark";
		const stored = window.localStorage.getItem("arkhiveon-theme");
		return stored === "system" || stored === "light" || stored === "dark"
			? stored
			: "dark";
	});

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");

		function applyTheme() {
			const shouldUseDark =
				themeMode === "dark" || (themeMode === "system" && media.matches);

			document.body.classList.toggle("dark", shouldUseDark);
			document.documentElement.style.colorScheme = shouldUseDark
				? "dark"
				: "light";
			window.localStorage.setItem("arkhiveon-theme", themeMode);
		}

		applyTheme();
		media.addEventListener("change", applyTheme);

		return () => {
			media.removeEventListener("change", applyTheme);
		};
	}, [themeMode]);

	return (
		<footer
			className="relative z-10 h-[var(--footer-height)] w-full border-t border-border/70 bg-card text-foreground [--footer-height:1100px] sm:[--footer-height:960px] md:[--footer-height:740px] xl:[--footer-height:620px]"
			style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
		>
			<div className="fixed bottom-0 left-0 h-[var(--footer-height)] w-full">
				<div className="sticky top-[calc(100vh-var(--footer-height))] h-full overflow-hidden bg-linear-to-br from-card via-card/95 to-primary-muted/20">
					{/* Ambient background glow */}
					<div
						aria-hidden="true"
						className="absolute inset-0 isolate z-0 opacity-70 contain-strict dark:opacity-80"
					>
						<div className="absolute left-0 top-0 h-[80rem] w-[35rem] -translate-y-[21.875rem] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,oklch(0.66_0.2_290/0.13)_0,oklch(0.66_0.2_290/0.035)_52%,transparent_80%)]" />
						<div className="absolute left-0 top-0 h-[80rem] w-[15rem] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,oklch(0.96_0.01_290/0.07)_0,oklch(0.66_0.2_290/0.025)_82%,transparent_100%)] [translate:5%_-50%]" />
						<div className="absolute left-0 top-0 h-[80rem] w-[15rem] -translate-y-[21.875rem] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,oklch(0.96_0.01_290/0.06)_0,oklch(0.66_0.2_290/0.02)_82%,transparent_100%)]" />
					</div>

					{/* ── Main content ── */}
					<div className="relative z-10 px-6 sm:px-10 lg:px-14">
						<div className="mx-auto w-full max-w-[92rem] pt-10 sm:pt-12 lg:pt-14">
							{/* 4-column grid: brand | conta | legal | social */}
							<div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
								{/* Brand + CTA */}
								<AnimatedContainer className="space-y-7">
									<a href="/" className="inline-flex w-fit items-center gap-3">
										<span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_12px_28px_-22px_var(--primary)]">
											<BookOpen className="h-5 w-5" strokeWidth={2.1} />
										</span>
										<span className="text-3xl font-bold tracking-tight">
											Arkhiveon
										</span>
									</a>

									<div>
										<p className="max-w-md font-display text-[clamp(2rem,4vw,4.1rem)] font-black leading-[0.9] text-foreground">
											Pronto para a{" "}
											<span className="text-primary">aventura?</span>
										</p>
										<p className="mt-5 max-w-sm text-[15px] font-semibold leading-6 text-muted-foreground">
											Um arquivo vivo para organizar
											<br />
											campanhas, personagens e mundos.
										</p>
									</div>
								</AnimatedContainer>

								{footerLinkGroups.map((group, index) => (
									<AnimatedContainer
										className="w-full"
										delay={0.1 + index * 0.1}
										key={group.label}
									>
										<h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
											{group.label}
										</h2>
										<ul className="mt-5 space-y-2.5">
											{group.links.map((link) => (
												<li key={link.label}>
													<a
														href={link.href}
														className="group inline-flex items-center gap-2 text-[14px] font-semibold text-foreground transition-colors hover:text-primary"
													>
														<span className="h-px w-4 bg-border-hover transition-all group-hover:w-6 group-hover:bg-primary" />
														{link.label}
													</a>
												</li>
											))}
										</ul>
									</AnimatedContainer>
								))}

								{/* Social + theme + email */}
								<AnimatedContainer className="flex flex-col gap-5" delay={0.3}>
									<h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
										Social
									</h2>
									<ul className="flex flex-wrap gap-2">
										{socialLinks.map(({ label, href, Icon }) => (
											<li key={label}>
												<a
													href={href}
													aria-label={label}
													className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/45 text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
												>
													<Icon className="h-4 w-4" strokeWidth={1.8} />
												</a>
											</li>
										))}
									</ul>

									<div className="flex w-fit items-center gap-1 rounded-2xl border border-border/70 bg-background/55 p-1 text-muted-foreground shadow-sm shadow-black/5">
										<ThemeButton
											active={themeMode === "system"}
											label="Tema do sistema"
											onClick={() => setThemeMode("system")}
										>
											<Monitor className="h-4 w-4" strokeWidth={1.8} />
										</ThemeButton>
										<ThemeButton
											active={themeMode === "light"}
											label="Tema claro"
											onClick={() => setThemeMode("light")}
										>
											<Sun className="h-4 w-4" strokeWidth={1.8} />
										</ThemeButton>
										<ThemeButton
											active={themeMode === "dark"}
											label="Tema escuro"
											onClick={() => setThemeMode("dark")}
										>
											<Moon className="h-4 w-4" strokeWidth={1.8} />
										</ThemeButton>
									</div>

									<a
										href="mailto:contato@arkhiveon.com"
										className="inline-flex items-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary"
									>
										<Mail className="h-4 w-4" strokeWidth={1.8} />
										contato@arkhiveon.com
									</a>
								</AnimatedContainer>
							</div>

							{/* Separator */}
							<div className="mt-10 border-t border-border/70" />

							{/* Bottom bar: Buttons + Copyright */}
							<div className="mt-5 flex flex-wrap items-center justify-between gap-4 pb-5">
								<div className="flex flex-wrap items-center gap-3">
									<a
										href="/dashboard"
										className={buttonVariants({
											className: "h-11 gap-2 px-5 text-[13px] font-black",
										})}
									>
										Abrir arquivo
										<ArrowUpRight className="h-4 w-4" strokeWidth={2} />
									</a>
									<a
										href="/characters"
										className={buttonVariants({
											variant: "outline",
											className: "h-11 px-5 text-[13px] font-black",
										})}
									>
										Ver personagens
									</a>
								</div>
								<p className="text-[13px] font-semibold text-muted-foreground">
									&copy; 2026 Arkhiveon. Todos os direitos reservados.
								</p>
							</div>
						</div>
					</div>

					{/* ── Decorative ARKHIVEON wordmark ── */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-0 bottom-0 z-0 translate-y-[30%] overflow-hidden px-6 sm:px-10 lg:px-14"
					>
						<div className="mx-auto w-full max-w-[92rem]">
							<svg
								viewBox="0 0 1400 240"
								className="h-auto w-full overflow-visible text-primary/14 dark:text-primary/20"
								role="img"
								aria-label="Arkhiveon"
							>
								<title>Arkhiveon</title>
								<text
									x="700"
									y="210"
									textLength="1340"
									lengthAdjust="spacingAndGlyphs"
									textAnchor="middle"
									className="fill-current font-display text-[250px] font-black"
								>
									Arkhiveon
								</text>
							</svg>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}

function ThemeButton({
	active,
	children,
	label,
	onClick,
}: {
	active: boolean;
	children: ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={active}
			className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted hover:text-foreground ${
				active ? "bg-primary/12 text-primary ring-1 ring-primary/25" : ""
			}`}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function AnimatedContainer({
	children,
	className,
	delay = 0.1,
}: {
	children: ReactNode;
	className?: string;
	delay?: number;
}) {
	return (
		<div
			className={[className, "efferd-footer-reveal"].filter(Boolean).join(" ")}
			style={{ animationDelay: `${delay}s` }}
		>
			{children}
		</div>
	);
}
