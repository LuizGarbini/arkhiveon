import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Check,
	Crown,
	Map,
	ShieldCheck,
	Sparkles,
	Users,
	Zap,
} from "lucide-react";
import { useId } from "react";
import { ArkhiveonGradientBackground } from "@/components/arkhiveon-gradient-background";
import { EfferdStickyFooter } from "@/components/efferd-sticky-footer";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
	component: LandingPage,
});



const pillars = [
	{
		Icon: Map,
		eyebrow: "Mesa",
		title: "Tudo volta para o mesmo lugar.",
		description:
			"Nada de procurar anotação perdida quando a sessão já começou.",
	},
	{
		Icon: Zap,
		eyebrow: "Ritmo",
		title: "Menos ruído entre uma ideia e outra.",
		description: "A interface fica quieta para a campanha aparecer primeiro.",
	},
	{
		Icon: Users,
		eyebrow: "Arquivo",
		title: "Um mundo cresce sem virar bagunça.",
		description: "Personagens, lugares e sessões conectados por contexto.",
	},
];


const freePlanFeatures = [
	"20 registros de campanha",
	"Personagens e sessões essenciais",
	"Backup manual do arquivo",
];

const proPlanFeatures = [
	"Campanhas sem limite prático",
	"Fichas avançadas e módulos extras",
	"Organização visual para mesas longas",
];

/* ─── Page ─── */

function LandingPage() {
	const featuresId = useId();
	const { loading, session } = useAuth();
	const isAuthenticated = !!session;

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
			{/* Subtle grid background */}
			<div className="pointer-events-none fixed inset-0 -z-20 arcane-grid opacity-[0.04]" />

			<header className="sticky top-4 z-50 w-full px-6 flex justify-center pointer-events-none">
				<div className="lp-enter-down lp-d1 pointer-events-auto mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-2xl border border-border/60 bg-card/85 px-6 shadow-lg shadow-black/10 backdrop-blur-xl">
					<Link to="/" className="flex items-center gap-3">
						<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[0_8px_24px_-14px_var(--primary)]">
							<img
								src="/favicon.svg"
								alt="Arkhiveon"
								className="h-5 w-5"
								draggable={false}
							/>
						</span>
						<span className="font-display text-[14px] font-bold tracking-[0.2em] text-foreground">
							ARKHIVEON
						</span>
					</Link>

					<nav className="hidden md:flex items-center gap-6">
						<button
							onClick={() =>
								document
									.getElementById(featuresId)
									?.scrollIntoView({ behavior: "smooth" })
							}
							className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
						>
							Estrutura
						</button>
						<button
							onClick={() =>
								document
									.getElementById("pricing-section")
									?.scrollIntoView({ behavior: "smooth" })
							}
							className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
						>
							Planos
						</button>
					</nav>

					{!loading && (
						<div className="flex items-center gap-2">
							{isAuthenticated ? (
								<Link to="/dashboard">
									<Button size="sm" className="gap-2">
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
											className="text-muted-foreground hover:text-foreground"
										>
											Entrar
										</Button>
									</Link>
									<Link to="/auth" search={{ mode: "register" }}>
										<Button size="sm" className="gap-2">
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
				{/* ── Hero ── */}
				<section className="w-full px-6 pb-0 pt-16 sm:px-10 sm:pt-20 lg:px-14 lg:pt-24 relative overflow-hidden flex flex-col items-center">
					{/* Decorative glows / ambient lighting */}
					<div className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
					<div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-fuchsia-500/5 blur-[100px]" />

					{/* Centered Copy */}
					<div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
						<div className="lp-enter lp-d2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
							<Sparkles className="h-3 w-3 animate-pulse" />
							Arquivo narrativo de RPG
						</div>

						<h1 className="lp-enter lp-d3 mt-8 font-display text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[0.9] tracking-tight text-foreground">
							Campanhas
							<br />
							<span className="text-gradient-primary">com memória.</span>
						</h1>

						<p className="lp-enter lp-d4 mt-6 max-w-2xl text-[16px] sm:text-[18px] font-medium leading-8 text-muted-foreground">
							Personagens, fichas e sessões em um arquivo minimalista e potente feito para{" "}
							<strong className="font-semibold text-foreground">
								voltar
							</strong>
							. Organização inteligente para contar histórias marcantes.
						</p>

						<div className="lp-enter lp-d5 mt-9 flex flex-wrap items-center justify-center gap-3.5">
							{loading ? (
								<Button size="lg" className="gap-2 px-8" disabled>
									<Sparkles className="h-4 w-4" />
									Carregando
								</Button>
							) : isAuthenticated ? (
								<Link to="/dashboard">
									<Button size="lg" className="gap-2 px-8 shadow-lg shadow-primary/20">
										Abrir arquivo
										<ArrowUpRight className="h-4 w-4" />
									</Button>
								</Link>
							) : (
								<Link to="/auth" search={{ mode: "register" }}>
									<Button size="lg" className="gap-2 px-8 shadow-lg shadow-primary/20">
										Criar arquivo
										<ArrowUpRight className="h-4 w-4" />
									</Button>
								</Link>
							)}
							<Button
								variant="outline"
								size="lg"
								className="px-8 bg-card/45 backdrop-blur-xs"
								onClick={() =>
									document
										.getElementById(featuresId)
										?.scrollIntoView({ behavior: "smooth" })
								}
							>
								Ver estrutura
							</Button>
						</div>
					</div>

					{/* Character Card mockup below, centered, cut off by half with a blur/fade */}
					<div className="relative mt-8 w-full max-w-5xl px-4 md:px-0 z-10 lp-enter lp-d6 translate-y-24">
						{/* Overlapping Container */}
						<div className="relative h-[540px] rounded-2xl border border-border/80 bg-card-elevated shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden">

							{/* Mini Browser/Header bar to make it look premium */}
							<div className="flex items-center gap-2 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur-sm">
								<div className="flex gap-1.5">
									<div className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
									<div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
									<div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
								</div>
								<div className="mx-auto flex h-5 w-48 items-center justify-center rounded bg-background/60 px-3 ring-1 ring-border/60">
									<span className="text-[8px] text-muted-foreground/60 font-mono">arkhiveon.com/characters/elara</span>
								</div>
							</div>

							<div className="p-6 md:p-8">
								{/* Inside is a detailed Character view or big Character Card */}
								<div className="grid md:grid-cols-[180px_1fr] gap-6">
									{/* Portrait column */}
									<div className="flex flex-col items-center">
										<div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 to-transparent">
											<img
												src="/elara-portrait.png"
												alt="Elara Moonveil"
												className="h-full w-full object-cover object-top"
												draggable={false}
											/>
											<div className="absolute right-3 bottom-3 flex h-7 min-w-7 items-center justify-center rounded-lg bg-background/90 px-1.5 backdrop-blur ring-1 ring-border/60">
												<span className="text-[8px] font-semibold text-muted-foreground font-sans">Lv</span>
												<span className="ml-0.5 font-display text-[12px] font-bold text-foreground">12</span>
											</div>
										</div>

										<div className="mt-4 flex flex-col items-center gap-1">
											<span className="rounded bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/20">
												D&D 5e
											</span>
											<span className="text-[10px] text-muted-foreground font-semibold mt-1">Neutro Bom</span>
										</div>
									</div>

									{/* Stats and Info column */}
									<div className="flex flex-col justify-between">
										<div>
											<div className="flex items-start justify-between">
												<div>
													<h3 className="font-display text-xl font-bold text-foreground">Elara Moonveil</h3>
													<p className="text-xs text-muted-foreground font-semibold mt-0.5">Elfa · Maga de Transmutação</p>
												</div>
												<span className="text-[10px] font-mono text-muted-foreground/80 font-bold bg-muted px-2 py-0.5 rounded">XP: 7.200</span>
											</div>

											{/* HP Bar */}
											<div className="mt-5">
												<div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
													<span className="flex items-center gap-1 font-bold">
														<svg viewBox="0 0 24 24" className="h-3 w-3 text-rose-500" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
														Pontos de Vida
													</span>
													<span className="font-mono tabular-nums text-foreground/80 font-bold">68 / 68</span>
												</div>
												<div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
													<div className="absolute inset-y-0 left-0 rounded-full bg-rose-500" style={{ width: "100%" }} />
												</div>
											</div>

											{/* Combat stats grid */}
											<div className="mt-5 grid grid-cols-3 gap-2 text-center">
												<div className="flex flex-col items-center gap-1 rounded-xl bg-background/55 p-2.5 ring-1 ring-border/50">
													<span className="text-xs">🛡</span>
													<span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Armadura</span>
													<span className="font-mono text-xs font-bold text-foreground">15</span>
												</div>
												<div className="flex flex-col items-center gap-1 rounded-xl bg-background/55 p-2.5 ring-1 ring-border/50">
													<span className="text-xs">⚡</span>
													<span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Iniciativa</span>
													<span className="font-mono text-xs font-bold text-foreground">+3</span>
												</div>
												<div className="flex flex-col items-center gap-1 rounded-xl bg-background/55 p-2.5 ring-1 ring-border/50">
													<span className="text-xs">👣</span>
													<span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Deslocamento</span>
													<span className="font-mono text-xs font-bold text-foreground">9m</span>
												</div>
											</div>

											{/* Abilities row */}
											<div className="mt-5 grid grid-cols-6 gap-1 border-t border-border/60 pt-4">
												{[
													{ label: "FOR", value: 10, mod: "+0" },
													{ label: "DES", value: 16, mod: "+3" },
													{ label: "CON", value: 13, mod: "+1" },
													{ label: "INT", value: 19, mod: "+4" },
													{ label: "SAB", value: 14, mod: "+2" },
													{ label: "CAR", value: 12, mod: "+1" },
												].map((ab) => (
													<div key={ab.label} className="flex flex-col items-center bg-background/30 rounded-lg py-1.5">
														<span className="text-[8px] font-bold text-muted-foreground">{ab.label}</span>
														<span className="font-mono text-[11px] font-bold text-foreground">{ab.value}</span>
														<span className="font-mono text-[9px] text-primary">{ab.mod}</span>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Blur & Gradient Overlay Mask to cut it off half-way */}
						<div className="absolute inset-x-0 bottom-0 h-[180px] bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-20 flex items-end justify-center">
							<div className="absolute inset-0 backdrop-blur-[4px] [mask-image:linear-gradient(to_top,black_10%,transparent_90%)] pointer-events-none" />
						</div>
					</div>
				</section>

				<section
					id={featuresId}
					className="w-full border-t border-border/50 px-6 py-16 sm:px-10 lg:px-14 lg:py-24"
				>
					<div className="mx-auto w-full max-w-5xl">
						<div className="lp-reveal mb-12 max-w-xl mx-auto text-center flex flex-col items-center">
							<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule-center">
								Estrutura
							</p>
							<h2 className="mt-5 font-display text-3xl font-black leading-[0.96] text-foreground sm:text-4xl">
								Menos tela.
								<br />
								Mais campanha.
							</h2>
						</div>

						<div className="grid gap-4 lg:grid-cols-3">
							{pillars.map(({ Icon, eyebrow, title, description }, i) => (
								<article
									key={eyebrow}
									className={`group rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm shadow-black/5 transition-all hover:border-primary/25 hover:shadow-md flex flex-col items-center text-center ${["lp-reveal-s1","lp-reveal-s2","lp-reveal-s3"][i] ?? "lp-reveal"}`}
								>
									<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary transition-transform group-hover:scale-105">
										<Icon className="h-5 w-5" strokeWidth={1.8} />
									</span>
									<p className="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
										{eyebrow}
									</p>
									<h3 className="mt-2 font-display text-lg font-bold leading-tight text-foreground">
										{title}
									</h3>
									<p className="mt-3 text-[13px] font-medium leading-6 text-muted-foreground">
										{description}
									</p>
								</article>
							))}
						</div>
					</div>
				</section>

				{/* ── Pricing ── */}
				<section id="pricing-section" className="w-full border-t border-border/50 px-6 py-16 sm:px-10 lg:px-14 lg:py-24">
					<div className="mx-auto w-full max-w-5xl">
						<div className="lp-reveal mb-12 max-w-2xl mx-auto text-center flex flex-col items-center">
							<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule-center">
								Planos
							</p>
							<h2 className="mt-5 font-display text-3xl font-black leading-[0.96] text-foreground sm:text-4xl">
								Comece pequeno
								<br />e cresça quando a mesa pedir.
							</h2>
							<p className="mt-5 max-w-md text-[15px] font-medium leading-7 text-muted-foreground">
								Free para experimentar.
								<br />
								Pro para campanha que não para.
							</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
							<div className="lp-reveal-s1">
								<PlanCard
									name="Free"
									price="R$ 0"
									description="Para testar uma campanha curta."
									features={freePlanFeatures}
								/>
							</div>
							<div className="lp-reveal-s2">
								<PlanCard
									name="Pro"
									price="R$ 19"
									description="Para mesas longas, mundos grandes e fichas completas."
									features={proPlanFeatures}
									highlight
								/>
							</div>
						</div>
					</div>
				</section>
			</main>

			{/* ── Scroll into footer indicator ── */}
			<div className="lp-reveal relative z-10 flex flex-col items-center gap-2 border-t border-border/50 bg-background py-6">
				<p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/50">
					Continue explorando
				</p>
				<div className="flex flex-col items-center gap-1">
					<div
						className="h-1.5 w-1.5 rounded-full bg-primary/60"
						style={{ animation: "footer-dot-pulse 1.6s ease-in-out infinite" }}
					/>
					<div
						className="h-1.5 w-1.5 rounded-full bg-primary/40"
						style={{ animation: "footer-dot-pulse 1.6s ease-in-out 0.2s infinite" }}
					/>
					<div
						className="h-1.5 w-1.5 rounded-full bg-primary/20"
						style={{ animation: "footer-dot-pulse 1.6s ease-in-out 0.4s infinite" }}
					/>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2.2}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="mt-0.5 h-3.5 w-3.5 text-primary/50"
						style={{ animation: "footer-dot-pulse 1.6s ease-in-out 0.6s infinite" }}
					>
						<path d="m6 9 6 6 6-6" />
					</svg>
				</div>
			</div>

			<EfferdStickyFooter />
		</div>
	);
}

/* ─── Sub-components ─── */



function PlanCard({
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
	return (
		<article className={`relative h-full flex flex-col justify-between overflow-hidden rounded-[1.75rem] border p-7 shadow-sm transition-all sm:p-8 ${
			highlight
				? "pro-plan-card border-primary/45 bg-linear-to-br from-primary/16 via-card to-card shadow-[0_28px_90px_-55px_var(--primary)]"
				: "border-border/60 bg-card/60"
		}`}
		>
			{highlight && (
				<>
					<div className="pointer-events-none absolute inset-0 z-0 hidden dark:block">
						<ArkhiveonGradientBackground />
					</div>
					<div className="pointer-events-none absolute inset-0 z-0 hidden bg-background/28 dark:block" />
					<div className="pointer-events-none absolute -right-20 -top-20 z-[1] h-56 w-56 rounded-full bg-sky-950/28 blur-3xl" />
					<div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
				</>
			)}
			<div className="plan-card-content relative flex-1 flex flex-col justify-between">
				<div>
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
								Plano
							</p>
							<h3 className="mt-4 font-display text-3xl font-black leading-none text-foreground">
								{name}
							</h3>
						</div>
						<span
							className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
								highlight
									? "border-primary/35 bg-primary/15 text-primary"
									: "border-border/70 bg-background/45 text-muted-foreground"
							}`}
						>
							{highlight ? (
								<Crown className="h-5 w-5" strokeWidth={1.8} />
							) : (
								<ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
							)}
						</span>
					</div>

					<div className="mt-7 flex items-end gap-2">
						<span className="font-display text-5xl font-black leading-none text-foreground">
							{price}
						</span>
						<span className="pb-1 text-[13px] font-bold text-muted-foreground">
							/mês
						</span>
					</div>
					<p className="mt-3 max-w-md text-[14px] font-medium leading-6 text-muted-foreground">
						{description}
					</p>

					<ul className="mt-7 space-y-3">
						{features.map((feature) => (
							<li
								key={feature}
								className="flex items-center gap-3 text-[14px] font-semibold text-foreground"
							>
								<span
									className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
										highlight
											? "bg-primary/15 text-primary"
											: "bg-muted text-muted-foreground"
									}`}
								>
									<Check className="h-3.5 w-3.5" strokeWidth={2.2} />
								</span>
								{feature}
							</li>
						))}
					</ul>
				</div>

				<a
					href={highlight ? "/auth?mode=register" : "/billing"}
					className={buttonVariants({
						variant: highlight ? "default" : "outline",
						className: "mt-8 h-11 w-full gap-2 text-[13px] font-black",
					})}
				>
					{highlight ? "Começar com Pro" : "Começar gratuitamente"}
					<ArrowUpRight className="h-4 w-4" />
				</a>
			</div>
		</article>
	);
}
