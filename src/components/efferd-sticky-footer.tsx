import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Mail } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";

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
		],
	},
	{
		label: "Legal",
		links: [
			{ label: "Privacidade", href: "/privacy" },
			{ label: "Termos", href: "/terms" },
		],
	},
];

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 127.14 96.36"
			fill="currentColor"
			role="img"
			aria-label="Discord"
			{...props}
		>
			<path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.8,6.83,77.19,77.19,0,0,0,49.5,0,105.15,105.15,0,0,0,19.06,8.07C3.58,31.21-1.92,53.7,1,75.87a107.94,107.94,0,0,0,32,16.15,86.23,86.23,0,0,0,6.72-11A72.82,72.82,0,0,1,25,74.55c.9-.66,1.8-1.34,2.66-2a74.75,74.75,0,0,0,79,0c.87.69,1.76,1.37,2.66,2a72.82,72.82,0,0,1-14.73,6.51,86.23,86.23,0,0,0,6.72,11,107.94,107.94,0,0,0,32-16.15C129.8,49.12,123.63,26.83,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.35,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
		</svg>
	);
}

export function EfferdStickyFooter() {
	const overlayRef = useRef<HTMLDivElement>(null);
	const interactionRef = useRef<HTMLDivElement>(null);
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		// App defaults to dark mode
		document.body.classList.add("dark");
		document.documentElement.style.colorScheme = "dark";
	}, []);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		const interaction = interactionRef.current;
		const overlay = overlayRef.current;
		if (!interaction || !overlay || isMobile) return;

		const onMouseMove = (e: MouseEvent) => {
			const rect = interaction.getBoundingClientRect();
			const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
			const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

			overlay.style.opacity = "1";
			const mask = `radial-gradient(circle 180px at ${xPercent}% ${yPercent}%, black 10%, transparent 80%)`;
			overlay.style.maskImage = mask;
			overlay.style.webkitMaskImage = mask;
		};

		const onMouseLeave = () => {
			overlay.style.opacity = "0";
		};

		interaction.addEventListener("mousemove", onMouseMove);
		interaction.addEventListener("mouseleave", onMouseLeave);

		return () => {
			interaction.removeEventListener("mousemove", onMouseMove);
			interaction.removeEventListener("mouseleave", onMouseLeave);
		};
	}, [isMobile]);

	if (isMobile) {
		return (
			<footer className="relative z-10 w-full border-t border-border/70 bg-card text-foreground py-10 px-6">
				<div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
					{/* Brand */}
					<div className="flex flex-col items-center gap-3">
						<Link
							to="/"
							aria-label="Arkhiveon - Início"
							className="inline-flex items-center gap-3 rounded-2xl transition-all duration-150 ease-out hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
						>
							<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
								<BookOpen className="h-4.5 w-4.5" strokeWidth={2.1} />
							</span>
							<span className="text-xl font-bold tracking-tight">
								Arkhiveon
							</span>
						</Link>
						<p className="mt-2 text-[13px] font-semibold leading-5 text-muted-foreground">
							Um grimório digital para
							<br />
							organizar campanhas, personagens e mundos.
						</p>
					</div>

					{/* Links */}
					<div className="grid grid-cols-2 gap-8 w-full max-w-sm">
						{footerLinkGroups.map((group) => (
							<div
								key={group.label}
								className="flex flex-col items-center gap-3"
							>
								<h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
									{group.label}
								</h2>
								<ul className="space-y-2">
									{group.links.map((link) => (
										<li key={link.label}>
											<a
												href={link.href}
												className="text-[13px] font-semibold text-foreground transition-colors hover:text-primary"
											>
												{link.label}
											</a>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>

					{/* Social & Contact */}
					<div className="flex flex-col items-center gap-4">
						<h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
							Social
						</h2>
						<a
							href="https://discord.gg/Fd4XEDYBP"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Discord"
							className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/45 text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
						>
							<DiscordIcon className="h-4.5 w-4.5" />
						</a>

						<a
							href="mailto:contato@arkhiveon.com"
							className="inline-flex items-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary"
						>
							<Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
							contato@arkhiveon.com
						</a>
					</div>

					{/* Divider */}
					<div className="w-full border-t border-border/70 my-2" />

					{/* Action Buttons */}
					<div className="flex flex-col gap-3 w-full max-w-xs">
						<a
							href="/dashboard"
							className={buttonVariants({
								className:
									"h-10 w-full gap-2 px-4 text-[12px] font-black justify-center",
							})}
						>
							Abrir arquivo
							<ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
						</a>
						<a
							href="/characters"
							className={buttonVariants({
								variant: "outline",
								className:
									"h-10 w-full px-4 text-[12px] font-black justify-center",
							})}
						>
							Ver personagens
						</a>
					</div>

					<p className="text-[11px] font-semibold text-muted-foreground">
						&copy; 2026 Arkhiveon. Todos os direitos reservados.
					</p>
				</div>
			</footer>
		);
	}

	return (
		<footer
			className="relative z-10 h-[var(--footer-height)] w-full border-t border-border/70 bg-card text-foreground [--footer-height:760px] sm:[--footer-height:680px] md:[--footer-height:500px] xl:[--footer-height:440px]"
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
						<div className="mx-auto w-full max-w-5xl pt-6 sm:pt-8 lg:pt-10">
							{/* 4-column grid: brand | conta | legal | social */}
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
								{/* Brand + CTA */}
								<AnimatedContainer className="space-y-4">
									<Link
										to="/"
										aria-label="Arkhiveon - Início"
										className="inline-flex w-fit items-center gap-3 rounded-2xl transition-all duration-150 ease-out hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
									>
										<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[0_8px_20px_-16px_var(--primary)]">
											<BookOpen className="h-4.5 w-4.5" strokeWidth={2.1} />
										</span>
										<span className="text-xl font-bold tracking-tight">
											Arkhiveon
										</span>
									</Link>

									<div>
										<p className="max-w-md font-display text-[1.4rem] sm:text-[1.6rem] font-black leading-[0.9] text-foreground">
											Pronto para a{" "}
											<span className="text-primary">aventura?</span>
										</p>
										<p className="mt-2.5 max-w-sm text-[13px] font-semibold leading-5 text-muted-foreground">
											Um grimório digital para
											<br />
											organizar campanhas, personagens e mundos.
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
										<ul className="mt-3.5 space-y-2">
											{group.links.map((link) => (
												<li key={link.label}>
													<a
														href={link.href}
														className="group inline-flex items-center gap-2 text-[13px] font-semibold text-foreground transition-colors hover:text-primary"
													>
														<span className="h-px w-3 bg-border-hover transition-all group-hover:w-5 group-hover:bg-primary" />
														{link.label}
													</a>
												</li>
											))}
										</ul>
									</AnimatedContainer>
								))}

								{/* Social + email */}
								<AnimatedContainer className="flex flex-col gap-4" delay={0.3}>
									<h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
										Social
									</h2>
									<ul className="flex flex-wrap gap-2">
										<li>
											<a
												href="https://discord.gg/Fd4XEDYBP"
												target="_blank"
												rel="noopener noreferrer"
												aria-label="Discord"
												className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-border/70 bg-background/45 text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
											>
												<DiscordIcon className="h-4 w-4" />
											</a>
										</li>
									</ul>

									<a
										href="mailto:contato@arkhiveon.com"
										className="inline-flex items-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary"
									>
										<Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
										contato@arkhiveon.com
									</a>
								</AnimatedContainer>
							</div>

							{/* Separator */}
							<div className="mt-6 border-t border-border/70" />

							{/* Bottom bar: Buttons + Copyright */}
							<div className="mt-4 flex flex-wrap items-center justify-between gap-4 pb-4">
								<div className="flex flex-wrap items-center gap-3">
									<a
										href="/dashboard"
										className={buttonVariants({
											className: "h-9.5 gap-2 px-4 text-[12px] font-black",
										})}
									>
										Abrir arquivo
										<ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
									</a>
									<a
										href="/characters"
										className={buttonVariants({
											variant: "outline",
											className: "h-9.5 px-4 text-[12px] font-black",
										})}
									>
										Ver personagens
									</a>
								</div>
								<p className="text-[12px] font-semibold text-muted-foreground">
									&copy; 2026 Arkhiveon. Todos os direitos reservados.
								</p>
							</div>
						</div>
					</div>
					{/* ── Decorative ARKHIVEON wordmark ── */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-0 bottom-0 z-0 translate-y-[30%] overflow-hidden px-6 sm:px-10 lg:px-14 select-none"
					>
						<div className="mx-auto w-full max-w-[1400px] relative">
							<svg
								viewBox="0 0 2400 350"
								className="h-auto w-full overflow-visible text-white/[0.03]"
								role="img"
								aria-label="Arkhiveon"
							>
								<title>Arkhiveon</title>
								<text
									x="1200"
									y="315"
									textAnchor="middle"
									className="fill-current font-display text-[460px] font-black"
								>
									Arkhiveon
								</text>
							</svg>

							{/* Glowing Purple Spotlight Overlay Wrapper (HTML DIV) */}
							<div
								ref={overlayRef}
								className="absolute inset-0 transition-opacity duration-300 pointer-events-none opacity-0"
								style={{
									maskImage:
										"radial-gradient(circle 180px at 0px 0px, black 10%, transparent 80%)",
									WebkitMaskImage:
										"radial-gradient(circle 180px at 0px 0px, black 10%, transparent 80%)",
								}}
							>
								<svg
									viewBox="0 0 2400 350"
									className="h-auto w-full overflow-visible text-purple-500/80"
									role="presentation"
								>
									<text
										x="1200"
										y="315"
										textAnchor="middle"
										className="fill-current font-display text-[460px] font-black"
									>
										Arkhiveon
									</text>
								</svg>
							</div>

							{/* Transparent Interaction Cover (HTML DIV) */}
							<div
								ref={interactionRef}
								className="absolute inset-0 z-10 pointer-events-auto cursor-default"
							/>
						</div>
					</div>
				</div>
			</div>
		</footer>
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
