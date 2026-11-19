/**
 * Production Landing Page — Arkhiveon Editorial Grimório Layout
 * Interactive Three.js d20 hero, zero layout-shift header, semantic design tokens,
 * and conversion-focused structure grounded in actual product capabilities.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Check,
	Crown,
	ShieldCheck,
	Sparkles,
	Users,
} from "lucide-react";
import { lazy, Suspense, useEffect, useId, useState } from "react";
import { EfferdStickyFooter } from "@/components/efferd-sticky-footer";
import {
	freePlanFeatures,
	howItWorksSteps,
	longFormPricingCopy,
	pillars,
	proPlanFeatures,
} from "@/components/landing/landing-shared";
import { Button } from "@/components/ui/button";
import { useDocumentMetadata } from "@/hooks/use-document-metadata";
import { useAuth } from "@/lib/auth";

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
	const pricingId = useId();

	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 48);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useDocumentMetadata(
		"Arkhiveon - O Grimório do seu RPG de Mesa",
		"VTT em tempo real, fichas de D&D 5e e Ordem Paranormal, mundos conectados e IA da Mesa em um único grimório digital.",
	);

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-background text-foreground font-sans">
			{/* Subtle Editorial Grid */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[920px] arcane-grid opacity-75"
			/>

			{/* ── Fixed Header Spacer (prevents 80px layout jump on scroll) ── */}
			<div aria-hidden="true" className="h-20 w-full shrink-0" />

			{/* ── Floating Header Nav ── */}
			<header className="fixed inset-x-0 top-0 z-50 flex w-full justify-center px-6 pt-4 pointer-events-none">
				<div
					className={`pointer-events-auto mx-auto flex h-14 w-full items-center justify-between px-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
						scrolled
							? "max-w-3xl rounded-2xl border border-border/80 bg-card/85 shadow-xl shadow-black/25 backdrop-blur-xl"
							: "max-w-5xl rounded-2xl border border-transparent bg-transparent"
					}`}
				>
					<Link
						to="/"
						className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-1 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<img
							src="/favicon.svg"
							alt=""
							className="h-6 w-6 shrink-0"
							draggable={false}
						/>
						<span className="font-display text-[15px] font-bold tracking-[0.2em] text-foreground">
							ARKHIVEON
						</span>
					</Link>

					<nav className="hidden md:flex items-center gap-7">
						<button
							type="button"
							onClick={() =>
								document
									.getElementById(featuresId)
									?.scrollIntoView({ behavior: "smooth" })
							}
							className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
						>
							Recursos
						</button>
						<button
							type="button"
							onClick={() =>
								document
									.getElementById(pricingId)
									?.scrollIntoView({ behavior: "smooth" })
							}
							className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
						>
							Planos
						</button>
					</nav>

					{!loading && (
						<div className="flex items-center gap-2">
							{isAuthenticated ? (
								<Link to="/dashboard">
									<Button size="sm" className="h-9 gap-2 px-4 font-bold">
										Abrir arquivo
										<ArrowUpRight className="h-3.5 w-3.5" />
									</Button>
								</Link>
							) : (
								<>
									<Link to="/auth" search={{ mode: "login" }}>
										<Button
											variant="ghost"
											size="sm"
											className="h-9 text-muted-foreground hover:text-foreground"
										>
											Entrar
										</Button>
									</Link>
									<Link to="/auth" search={{ mode: "register" }}>
										<Button size="sm" className="h-9 gap-1.5 px-4 font-bold">
											Criar conta
											<ArrowUpRight className="h-3.5 w-3.5" />
										</Button>
									</Link>
								</>
							)}
						</div>
					)}
				</div>
			</header>

			<main className="relative z-10">
				{/* ── Hero: Split Editorial Layout ── */}
				<section className="relative flex min-h-[calc(90vh-5rem)] w-full flex-col items-center justify-center py-12 lg:py-16">
					<div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-10 px-6 lg:flex-row lg:gap-14">
						{/* Left: Copy */}
						<div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
							<p className="mb-5 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
								<span
									aria-hidden="true"
									className="hidden h-px w-6 bg-primary/60 lg:inline-block"
								/>
								VTT · Fichas D&D 5e & Ordem · Mundos
							</p>

							<h1 className="font-display text-[clamp(2.75rem,5.8vw,4.75rem)] font-black leading-[0.94] tracking-tight text-foreground">
								Sua campanha inteira.
								<br />
								<span className="text-primary">Em um único grimório.</span>
							</h1>

							<p className="mt-6 max-w-lg text-[16px] sm:text-[17px] font-medium leading-relaxed text-muted-foreground">
								Mesa virtual a 60fps, fichas automatizadas, árvore de facções e
								notas de sessão conectadas. Feito para mestres e jogadores que
								não querem perder o fio da história entre uma semana e outra.
							</p>

							<div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
								{loading ? (
									<Button disabled size="lg" className="h-11 px-6 font-bold">
										Carregando...
									</Button>
								) : isAuthenticated ? (
									<Link to="/dashboard">
										<Button
											size="lg"
											className="h-11 gap-2 rounded-xl px-6 font-bold shadow-lg shadow-primary/20 active:scale-[0.98]"
										>
											Abrir meu grimório
											<ArrowUpRight className="h-4 w-4" />
										</Button>
									</Link>
								) : (
									<Link to="/auth" search={{ mode: "register" }}>
										<Button
											size="lg"
											className="h-11 gap-2 rounded-xl px-6 font-bold shadow-lg shadow-primary/20 active:scale-[0.98]"
										>
											Começar campanha grátis
											<ArrowUpRight className="h-4 w-4" />
										</Button>
									</Link>
								)}
								<Button
									variant="outline"
									size="lg"
									className="h-11 rounded-xl border-border/80 bg-card/60 px-5 font-semibold text-foreground hover:bg-card active:scale-[0.98]"
									onClick={() =>
										document
											.getElementById(featuresId)
											?.scrollIntoView({ behavior: "smooth" })
									}
								>
									Explorar recursos
								</Button>
							</div>

							{/* Concrete trust facts instead of generic filler */}
							<div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-semibold text-muted-foreground lg:justify-start">
								<span className="inline-flex items-center gap-1.5">
									<Check className="h-3.5 w-3.5 text-primary" />
									Sem cartão para começar
								</span>
								<span className="inline-flex items-center gap-1.5">
									<Check className="h-3.5 w-3.5 text-primary" />
									Convidados jogam grátis na mesa do Mestre
								</span>
							</div>
						</div>

						{/* Right: Interactive 3D d20 */}
						<div className="relative h-[360px] w-full max-w-[400px] shrink-0 sm:h-[420px] lg:h-[480px]">
							<div
								aria-hidden="true"
								className="pointer-events-none absolute inset-x-10 bottom-12 -z-10 h-40 rounded-full bg-primary/20 blur-3xl"
							/>
							<Suspense
								fallback={
									<div className="flex h-full items-center justify-center text-muted-foreground">
										<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
									</div>
								}
							>
								<D20Canvas className="h-full w-full" />
							</Suspense>
						</div>
					</div>
				</section>

				{/* ── Pillars: Concrete Capabilities ── */}
				<section
					id={featuresId}
					className="w-full border-t border-border/60 px-6 py-20 sm:px-10 lg:px-20 lg:py-28"
				>
					<div className="mx-auto w-full max-w-5xl">
						<div className="mb-14 flex flex-col items-center text-center lg:items-start lg:text-left">
							<p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary heading-rule">
								Arquitetura de Campanha
							</p>
							<h2 className="mt-4 font-display text-3xl font-black leading-tight text-foreground sm:text-4xl">
								Da preparação do Mestre ao combate na mesa.
							</h2>
							<p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
								Substitua dezenas de documentos soltos por ferramentas feitas
								especificamente para sessões de RPG ao vivo e campanhas longas.
							</p>
						</div>

						<div className="grid gap-5 lg:grid-cols-3">
							{pillars.map(({ Icon, eyebrow, title, description, meta }) => (
								<article
									key={eyebrow}
									className="group panel corner-mark flex flex-col justify-between rounded-2xl border border-border/80 bg-card-elevated p-7 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-black/20"
								>
									<div>
										<div className="flex items-center justify-between gap-3">
											<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
												<Icon className="h-5 w-5" strokeWidth={1.9} />
											</span>
											<span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
												{eyebrow}
											</span>
										</div>

										<h3 className="mt-5 font-display text-lg font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
											{title}
										</h3>
										<p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
											{description}
										</p>
									</div>

									<div className="mt-6 border-t border-border/60 pt-3.5">
										<p className="text-[11px] font-semibold text-foreground/80">
											{meta}
										</p>
									</div>
								</article>
							))}
						</div>

						{/* Workflow Steps Strip */}
						<div className="mt-12 grid gap-4 rounded-2xl border border-border/70 bg-card/55 p-6 sm:p-8 lg:grid-cols-3">
							{howItWorksSteps.map((item) => (
								<div key={item.step} className="flex flex-col gap-2">
									<div className="flex items-center gap-2.5">
										<span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/35 bg-primary/15 font-mono text-[11px] font-bold text-primary tabular-nums">
											{item.step}
										</span>
										<span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
											{item.benefit}
										</span>
									</div>
									<h3 className="mt-1 font-display text-[15px] font-bold text-foreground">
										{item.title}
									</h3>
									<p className="text-[13px] leading-relaxed text-muted-foreground">
										{item.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* ── Pricing ── */}
				<section
					id={pricingId}
					className="w-full border-t border-border/60 px-6 py-20 sm:px-10 lg:px-20 lg:py-28"
				>
					<div className="mx-auto w-full max-w-4xl">
						<div className="mb-12 flex flex-col items-center text-center lg:items-start lg:text-left">
							<p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary heading-rule">
								Planos & Assinatura
							</p>
							<h2 className="mt-4 font-display text-3xl font-black text-foreground sm:text-4xl">
								{longFormPricingCopy.headline}
							</h2>
							<p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
								{longFormPricingCopy.subline}
							</p>
						</div>

						<div className="grid gap-5 md:grid-cols-2">
							<PlanCard
								name="Free"
								price="R$ 0"
								description={longFormPricingCopy.freeDescription}
								features={freePlanFeatures}
								isAuthenticated={isAuthenticated}
							/>
							<PlanCard
								name="Pro"
								price="R$ 19"
								description={longFormPricingCopy.proDescription}
								features={proPlanFeatures}
								isAuthenticated={isAuthenticated}
								highlight
							/>
						</div>

						{/* Shared Table Highlight Banner */}
						<div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/8 px-6 py-4 sm:flex-row">
							<div className="flex items-center gap-3.5 text-center sm:text-left">
								<span className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
									<Users className="h-4 w-4" />
								</span>
								<p className="text-[13px] font-medium text-foreground">
									<strong className="font-bold text-primary">
										Regra da Mesa Compartilhada:
									</strong>{" "}
									se o Mestre da campanha for Pro, todos os jogadores convidados
									usam fichas, itens e registros sem consumir o limite gratuito
									deles.
								</p>
							</div>
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

function PlanCard({
	name,
	price,
	description,
	features,
	isAuthenticated,
	highlight = false,
}: {
	name: string;
	price: string;
	description: string;
	features: string[];
	isAuthenticated: boolean;
	highlight?: boolean;
}) {
	if (highlight) {
		return (
			<article className="pro-plan-card relative flex h-full flex-col justify-between rounded-2xl border p-7 shadow-xl shadow-black/25">
				<div className="plan-card-content">
					<div className="flex items-start justify-between gap-3">
						<div>
							<span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
								<Sparkles className="h-3 w-3" />
								Mais escolhido por Mestres
							</span>
							<h3 className="mt-3 font-display text-2xl font-black text-foreground">
								{name}
							</h3>
						</div>
						<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary">
							<Crown className="h-4.5 w-4.5" strokeWidth={1.9} />
						</span>
					</div>

					<div className="mt-5 flex items-baseline gap-2">
						<span className="font-display text-4xl font-black tabular-nums text-foreground">
							{price}
						</span>
						<span className="text-[13px] font-semibold text-muted-foreground">
							/mês
						</span>
					</div>
					<p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
						{description}
					</p>

					<ul className="mt-6 space-y-3 border-t border-border/70 pt-5">
						{features.map((f) => (
							<li
								key={f}
								className="flex items-start gap-3 text-[13px] font-medium leading-snug text-foreground"
							>
								<Check
									className="mt-0.5 h-4 w-4 shrink-0 text-primary"
									strokeWidth={2.5}
								/>
								<span>{f}</span>
							</li>
						))}
					</ul>
				</div>

				<div className="plan-card-content mt-8">
					{isAuthenticated ? (
						<Link to="/billing" className="block w-full">
							<Button className="h-11 w-full gap-2 rounded-xl text-[13px] font-bold shadow-md shadow-primary/20 active:scale-[0.98]">
								Fazer upgrade para o Pro
								<ArrowUpRight className="h-4 w-4" />
							</Button>
						</Link>
					) : (
						<Link
							to="/auth"
							search={{ mode: "register" }}
							className="block w-full"
						>
							<Button className="h-11 w-full gap-2 rounded-xl text-[13px] font-bold shadow-md shadow-primary/20 active:scale-[0.98]">
								Começar com Pro
								<ArrowUpRight className="h-4 w-4" />
							</Button>
						</Link>
					)}
				</div>
			</article>
		);
	}

	return (
		<article className="relative flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-card-elevated p-7 transition-colors duration-200 hover:border-primary/35">
			<div>
				<div className="flex items-start justify-between gap-3">
					<div>
						<span className="inline-flex items-center rounded-full border border-border/80 bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							Para conhecer
						</span>
						<h3 className="mt-3 font-display text-2xl font-black text-foreground">
							{name}
						</h3>
					</div>
					<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-muted/50 text-muted-foreground">
						<ShieldCheck className="h-4.5 w-4.5" strokeWidth={1.9} />
					</span>
				</div>

				<div className="mt-5 flex items-baseline gap-2">
					<span className="font-display text-4xl font-black tabular-nums text-foreground">
						{price}
					</span>
					<span className="text-[13px] font-semibold text-muted-foreground">
						/sempre grátis
					</span>
				</div>
				<p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
					{description}
				</p>

				<ul className="mt-6 space-y-3 border-t border-border/70 pt-5">
					{features.map((f) => (
						<li
							key={f}
							className="flex items-start gap-3 text-[13px] font-medium leading-snug text-foreground/90"
						>
							<Check
								className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
								strokeWidth={2.5}
							/>
							<span>{f}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="mt-8">
				{isAuthenticated ? (
					<Link to="/dashboard" className="block w-full">
						<Button
							variant="outline"
							className="h-11 w-full gap-2 rounded-xl border-border/80 text-[13px] font-bold active:scale-[0.98]"
						>
							Ir para o Dashboard
							<ArrowUpRight className="h-4 w-4" />
						</Button>
					</Link>
				) : (
					<Link
						to="/auth"
						search={{ mode: "register" }}
						className="block w-full"
					>
						<Button
							variant="outline"
							className="h-11 w-full gap-2 rounded-xl border-border/80 text-[13px] font-bold active:scale-[0.98]"
						>
							Criar conta grátis
							<ArrowUpRight className="h-4 w-4" />
						</Button>
					</Link>
				)}
			</div>
		</article>
	);
}
