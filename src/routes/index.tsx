/**
 * Production Landing Page — Dice Hero layout
 * Focado na variante D (interatividade com Three.js d20)
 * com padrão de grid premium de fundo.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Check,
	Crown,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { lazy, Suspense, useEffect, useId, useState } from "react";
import { EfferdStickyFooter } from "@/components/efferd-sticky-footer";
import {
	freePlanFeatures,
	pillars,
	proPlanFeatures,
} from "@/components/landing/landing-shared";
import { Button } from "@/components/ui/button";
import { useDocumentMetadata } from "@/hooks/use-document-metadata";
import { useAuth } from "@/lib/auth";

// Lazy-load the heavy Three.js component so it doesn't block initial render
const D20Canvas = lazy(() =>
	import("@/components/d20-canvas").then((m) => ({ default: m.D20Canvas })),
);

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	const { loading, session } = useAuth();
	const isAuthenticated = !!session;
	const featuresId = useId();

	// ── Header: starts inline, becomes floating sticky after scrolling ───
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 60);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useDocumentMetadata(
		"Arkhiveon - O Grimório do seu RPG de Mesa",
		"Organize seus personagens, fichas, NPCs e sessões de RPG em um ambiente conectado e responsivo. Experimente grátis.",
	);

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[#060408] text-foreground font-sans">
			{/* Premium Grid Pattern Background */}
			<div
				className="pointer-events-none absolute inset-0 -z-20 opacity-70"
				style={{
					backgroundImage: `
						radial-gradient(circle at 50% -20%, rgba(139, 92, 246, 0.18) 0%, transparent 50%),
						radial-gradient(circle at 75% 40%, rgba(168, 85, 247, 0.08) 0%, transparent 45%),
						linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
						linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
					`,
					backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
					backgroundPosition: "center, center, center, center",
					maskImage: "linear-gradient(to bottom, black, transparent)",
					WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
				}}
			/>

			{/* ── Header Nav ── */}
			<header
				className={`z-50 w-full flex justify-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
					scrolled
						? "fixed top-0 px-6 pt-4 pointer-events-none animate-[headerSlideIn_0.4s_ease_forwards]"
						: "relative px-6 pt-6 pointer-events-none"
				}`}
			>
				<div
					className={`pointer-events-auto mx-auto flex h-14 w-full items-center justify-between px-6 transition-all duration-500 ${
						scrolled
							? "max-w-3xl rounded-2xl border border-purple-500/20 bg-[#0d091a]/85 shadow-xl backdrop-blur-xl"
							: "max-w-5xl bg-transparent"
					}`}
				>
					<Link to="/" className="flex items-center gap-3">
						<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
							<img
								src="/favicon.svg"
								alt="Arkhiveon"
								className="h-5 w-5"
								draggable={false}
							/>
						</span>
						<span className="font-display text-[14px] font-bold tracking-[0.2em] text-white">
							ARKHIVEON
						</span>
					</Link>

					<nav className="hidden md:flex items-center gap-6">
						<button
							type="button"
							onClick={() =>
								document
									.getElementById(featuresId)
									?.scrollIntoView({ behavior: "smooth" })
							}
							className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors cursor-pointer"
						>
							Estrutura
						</button>
						<button
							type="button"
							onClick={() =>
								document
									.getElementById("pricing-section")
									?.scrollIntoView({ behavior: "smooth" })
							}
							className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors cursor-pointer"
						>
							Planos
						</button>
					</nav>

					{!loading && (
						<div className="flex items-center gap-2">
							{isAuthenticated ? (
								<Link to="/dashboard">
									<Button
										size="sm"
										className="gap-2 bg-purple-600 hover:bg-purple-500 text-white border-0"
									>
										<Sparkles className="h-3.5 w-3.5" />
										Dashboard
									</Button>
								</Link>
							) : (
								<>
									<Link to="/auth" search={{ mode: "login" }}>
										<Button
											variant="ghost"
											size="sm"
											className="text-white/60 hover:text-white hover:bg-white/5"
										>
											Entrar
										</Button>
									</Link>
									<Link to="/auth" search={{ mode: "register" }}>
										<Button
											size="sm"
											className="gap-2 bg-purple-600 hover:bg-purple-500 text-white border-0"
										>
											<Sparkles className="h-3.5 w-3.5" />
											Criar conta
										</Button>
									</Link>
								</>
							)}
						</div>
					)}
				</div>
			</header>

			<main className="relative z-10">
				{/* ── Hero: split layout ── */}
				<section className="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden pt-16">
					<div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-12 lg:flex-row lg:gap-16 px-6">
						{/* Left: copy */}
						<div className="flex max-w-lg flex-col items-center lg:items-start text-center lg:text-left">
							<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-purple-300 backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.1)]">
								<Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
								Grimório de RPG para Campanhas
							</div>

							<h1 className="font-display text-[clamp(3rem,6.5vw,5.5rem)] font-black leading-[0.9] tracking-tight text-white max-w-lg">
								Role o dado.
								<br />
								<span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
									Conte a história.
								</span>
							</h1>

							<p className="mt-8 max-w-md text-[16px] sm:text-[18px] font-medium leading-8 text-white/50">
								O grimório digital feito para mesas que levam RPG a sério.
								Personagens, lore, sessões — tudo conectado.
							</p>

							<div className="mt-9 flex flex-wrap justify-center lg:justify-start items-center gap-3.5">
								{loading ? (
									<Button
										disabled
										size="lg"
										className="bg-purple-600 text-white border-0"
									>
										Carregando
									</Button>
								) : isAuthenticated ? (
									<Link to="/dashboard">
										<Button
											size="lg"
											className="gap-2 rounded-xl border border-purple-500/30 bg-[linear-gradient(to_bottom,rgba(35,20,70,0.4),rgba(15,8,30,0.6))] text-white hover:border-purple-500 hover:bg-[linear-gradient(to_bottom,rgba(50,30,95,0.5),rgba(25,12,50,0.7))] hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-300 shadow-sm"
										>
											Abrir arquivo
											<ArrowUpRight className="h-4 w-4" />
										</Button>
									</Link>
								) : (
									<Link to="/auth" search={{ mode: "register" }}>
										<Button
											size="lg"
											className="gap-2 rounded-xl border border-purple-500/30 bg-[linear-gradient(to_bottom,rgba(35,20,70,0.4),rgba(15,8,30,0.6))] text-white hover:border-purple-500 hover:bg-[linear-gradient(to_bottom,rgba(50,30,95,0.5),rgba(25,12,50,0.7))] hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-300 shadow-sm"
										>
											Criar campanha
											<ArrowUpRight className="h-4 w-4" />
										</Button>
									</Link>
								)}
								<Button
									variant="outline"
									size="lg"
									className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
									onClick={() =>
										document
											.getElementById(featuresId)
											?.scrollIntoView({ behavior: "smooth" })
									}
								>
									Ver estrutura
								</Button>
							</div>

							{/* d20 hint */}
							<p className="mt-8 text-[11px] font-medium text-white/30 text-center lg:text-left">
								↗ arraste para interagir ou clique para rolar o d20 à direita
							</p>
						</div>

						{/* Right: Three.js d20 */}
						<div className="relative mt-16 h-[400px] w-full max-w-[420px] shrink-0 lg:mt-0 lg:h-[520px]">
							{/* Ambient glow under die */}
							<div className="pointer-events-none absolute inset-x-10 bottom-10 -z-10 h-40 rounded-full bg-purple-600/20 blur-3xl" />
							<Suspense
								fallback={
									<div className="flex h-full items-center justify-center text-white/20">
										<div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
									</div>
								}
							>
								<D20Canvas className="h-full w-full" />
							</Suspense>
						</div>
					</div>
				</section>

				{/* ── Features ── */}
				<section
					id={featuresId}
					className="w-full border-t border-white/5 px-6 py-20 sm:px-10 lg:px-20 lg:py-32"
				>
					<div className="mx-auto w-full max-w-5xl">
						<div className="mb-16 flex flex-col items-center lg:items-start text-center lg:text-left w-full">
							<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-purple-400">
								Estrutura
							</p>
							<h2 className="mt-4 font-display text-4xl font-black leading-tight text-white">
								Menos tela.
								<br />
								Mais campanha.
							</h2>
						</div>

						<div className="grid gap-4 lg:grid-cols-3">
							{pillars.map(({ Icon, eyebrow, title, description }) => (
								<article
									key={eyebrow}
									className="group rounded-2xl border border-white/8 bg-white/3 p-7 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-purple-500/35 hover:bg-purple-500/5 hover:shadow-[0_12px_30px_rgba(139,92,246,0.1)]"
								>
									<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/25 bg-purple-500/10 text-purple-400 transition-transform group-hover:scale-105">
										<Icon className="h-5 w-5" strokeWidth={1.8} />
									</span>
									<p className="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
										{eyebrow}
									</p>
									<h3 className="mt-2 font-display text-lg font-bold leading-tight text-white group-hover:text-purple-300 transition-colors">
										{title}
									</h3>
									<p className="mt-3 text-[13px] font-medium leading-6 text-white/50">
										{description}
									</p>
								</article>
							))}
						</div>
					</div>
				</section>

				{/* ── Pricing ── */}
				<section
					id="pricing-section"
					className="w-full border-t border-white/5 px-6 py-20 sm:px-10 lg:px-20"
				>
					<div className="mx-auto w-full max-w-4xl">
						<div className="mb-12 flex flex-col items-center lg:items-start text-center lg:text-left w-full">
							<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-purple-400">
								Planos
							</p>
							<h2 className="mt-4 font-display text-3xl font-black text-white">
								Comece pequeno
								<br />e cresça quando a mesa pedir.
							</h2>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<PlanCardDark
								name="Free"
								price="R$ 0"
								description="Para testar uma campanha curta."
								features={freePlanFeatures}
							/>
							<PlanCardDark
								name="Pro"
								price="R$ 19"
								description="Para mesas longas, mundos grandes e fichas completas."
								features={proPlanFeatures}
								highlight
							/>
						</div>
					</div>
				</section>
			</main>

			<EfferdStickyFooter />
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PlanCardDark({
	name,
	price,
	description,
	features,
	highlight = false,
}: {
	name: string;
	price: string;
	description: string;
	features: string[];
	highlight?: boolean;
}) {
	if (highlight) {
		return (
			<div className="relative p-[1.5px] rounded-2xl overflow-hidden transition-all duration-300 ease-out bg-purple-500/10 shadow-[0_0_60px_-20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] h-full">
				{/* The Spinning Spark Background */}
				<div className="absolute inset-[-400%] z-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_90%,rgba(168,85,247,0.85)_97%,#ffffff_100%)]" />

				{/* Inner Card content */}
				<article className="relative z-10 rounded-[15px] bg-[#0d091a] p-7 h-full w-full flex flex-col justify-between">
					<div>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
									Plano
								</p>
								<h3 className="mt-3 font-display text-2xl font-black text-white">
									{name}
								</h3>
							</div>
							<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-400">
								<Crown className="h-4 w-4" strokeWidth={1.8} />
							</span>
						</div>

						<div className="mt-5 flex items-end gap-2">
							<span className="font-display text-4xl font-black text-white">
								{price}
							</span>
							<span className="pb-1 text-[12px] font-bold text-white/30">
								/mês
							</span>
						</div>
						<p className="mt-2 text-[13px] leading-6 text-white/40">
							{description}
						</p>

						<ul className="mt-6 space-y-2.5">
							{features.map((f) => (
								<li
									key={f}
									className="flex items-center gap-3 text-[13px] font-semibold text-white/70"
								>
									<Check
										className="h-3.5 w-3.5 shrink-0 text-violet-400"
										strokeWidth={2.5}
									/>
									{f}
								</li>
							))}
						</ul>
					</div>

					<Link
						to="/auth"
						search={{ mode: "register" }}
						className="mt-8 block w-full"
					>
						<Button className="w-full gap-2 rounded-xl text-[13px] font-black h-10 transition-all duration-300 border border-purple-500/30 bg-[linear-gradient(to_bottom,rgba(35,20,70,0.4),rgba(15,8,30,0.6))] text-white hover:border-purple-500 hover:bg-[linear-gradient(to_bottom,rgba(50,30,95,0.5),rgba(25,12,50,0.7))] hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] shadow-sm">
							Começar com Pro
							<ArrowUpRight className="h-3.5 w-3.5" />
						</Button>
					</Link>
				</article>
			</div>
		);
	}

	return (
		<article className="relative rounded-2xl border border-white/8 bg-white/2 p-7 transition-all duration-300 ease-out hover:border-purple-500/35 hover:bg-purple-500/5 hover:shadow-[0_12px_30px_rgba(139,92,246,0.1)] h-full flex flex-col justify-between">
			<div>
				<div className="flex items-start justify-between">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
							Plano
						</p>
						<h3 className="mt-3 font-display text-2xl font-black text-white">
							{name}
						</h3>
					</div>
					<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/30">
						<ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
					</span>
				</div>

				<div className="mt-5 flex items-end gap-2">
					<span className="font-display text-4xl font-black text-white">
						{price}
					</span>
					<span className="pb-1 text-[12px] font-bold text-white/30">/mês</span>
				</div>
				<p className="mt-2 text-[13px] leading-6 text-white/40">
					{description}
				</p>

				<ul className="mt-6 space-y-2.5">
					{features.map((f) => (
						<li
							key={f}
							className="flex items-center gap-3 text-[13px] font-semibold text-white/70"
						>
							<Check
								className="h-3.5 w-3.5 shrink-0 text-white/30"
								strokeWidth={2.5}
							/>
							{f}
						</li>
					))}
				</ul>
			</div>

			<Link to="/billing" className="mt-8 block w-full">
				<Button className="w-full gap-2 rounded-xl text-[13px] font-black h-10 transition-all duration-300 border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white">
					Começar gratuitamente
					<ArrowUpRight className="h-3.5 w-3.5" />
				</Button>
			</Link>
		</article>
	);
}
