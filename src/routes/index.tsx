import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	BookOpen,
	Check,
	Crown,
	FileText,
	Map,
	ScrollText,
	ShieldCheck,
	Sparkles,
	User,
	Users,
	Zap,
} from "lucide-react";
import { useId, useState } from "react";
import { ArkhiveonGradientBackground } from "@/components/arkhiveon-gradient-background";
import { EfferdStickyFooter } from "@/components/efferd-sticky-footer";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

/* ─── Data ─── */

const features = [
	{
		Icon: User,
		title: "Personagens",
		desc: "Fichas, vínculos e elenco completo",
	},
	{
		Icon: ScrollText,
		title: "Sessões",
		desc: "Registro claro da campanha",
	},
	{
		Icon: BookOpen,
		title: "Lore",
		desc: "Mundos, lugares e segredos",
	},
];

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

const sheetModules = [
	{ label: "Atributos", value: "+3" },
	{ label: "Inventário", value: "12" },
	{ label: "Notas", value: "6" },
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
	const [activeDemoTab, setActiveDemoTab] = useState<"Personagens" | "Sessões" | "Lore">("Personagens");
	const { loading, session } = useAuth();
	const isAuthenticated = !!session;

	return (
		<div className="relative min-h-screen overflow-hidden bg-background text-foreground">
			{/* Subtle grid background */}
			<div className="pointer-events-none fixed inset-0 -z-20 arcane-grid opacity-[0.04]" />

			{/* ── Header ── */}
			<header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 px-6 backdrop-blur-xl sm:px-10 lg:px-14">
				<div className="mx-auto flex h-16 max-w-[92rem] items-center justify-between">
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
				<section className="w-full px-6 pb-16 pt-16 sm:px-10 sm:pt-20 lg:px-14 lg:pt-24 lg:pb-24">
					<div className="relative mx-auto w-full max-w-[92rem] overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-card via-card/95 to-primary-muted/15 p-8 shadow-xl shadow-black/5 sm:p-12 lg:p-14">
						{/* Decorative blobs */}
						<div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
						<div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

						<div className="relative grid gap-12 lg:grid-cols-[1fr_420px] lg:items-center">
							{/* Left: copy */}
							<div>
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<Sparkles className="h-3 w-3" />
									Arquivo narrativo de RPG
								</div>

								<h1 className="mt-7 font-display text-[clamp(3rem,6vw,5.75rem)] font-black leading-[0.88] tracking-tight text-foreground">
									Campanhas
									<br />
									<span className="text-gradient-primary">com memória.</span>
								</h1>

								<p className="mt-6 max-w-lg text-[16px] font-medium leading-7 text-muted-foreground">
									Personagens, fichas e sessões em um arquivo feito para{" "}
									<strong className="font-semibold text-foreground">
										voltar
									</strong>
									.
								</p>

								<div className="mt-9 flex flex-wrap items-center gap-3">
									{loading ? (
										<Button size="lg" className="gap-2 px-7" disabled>
											<Sparkles className="h-4 w-4" />
											Carregando
										</Button>
									) : isAuthenticated ? (
										<Link to="/dashboard">
											<Button size="lg" className="gap-2 px-7">
												Abrir arquivo
												<ArrowUpRight className="h-4 w-4" />
											</Button>
										</Link>
									) : (
										<Link to="/auth" search={{ mode: "register" }}>
											<Button size="lg" className="gap-2 px-7">
												Criar arquivo
												<ArrowUpRight className="h-4 w-4" />
											</Button>
										</Link>
									)}
									<Button
										variant="outline"
										size="lg"
										className="px-7"
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

							{/* Right: mini dashboard card */}
							<div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm shadow-black/5 sm:p-6">
								<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
									Resumo
								</p>
								<p className="mt-5 font-display text-xl font-bold leading-tight text-foreground">
									Tudo que importa
									<br />
									sem ocupar a mesa.
								</p>
								<div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
									{features.map(({ Icon, title, desc }) => (
										<button
											key={title}
											type="button"
											onClick={() => {
												setActiveDemoTab(title as "Personagens" | "Sessões" | "Lore");
												setTimeout(() => {
													document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
												}, 50);
											}}
											className={`group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${
												activeDemoTab === title 
													? "border-primary/50 bg-primary/10 shadow-primary/10" 
													: "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-primary/5 hover:shadow-primary/5"
											}`}
										>
											<Icon
												className={`h-4 w-4 transition-transform group-hover:scale-110 ${activeDemoTab === title ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}
												strokeWidth={1.8}
											/>
											<p className={`mt-3 text-[13px] font-bold ${activeDemoTab === title ? "text-primary" : "text-foreground"}`}>
												{title}
											</p>
											<p className="mt-0.5 text-[11px] text-muted-foreground">
												{desc}
											</p>
										</button>
									))}
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* ── Interactive Demo Section ── */}
				<section id="demo-section" className="w-full px-6 py-10 sm:px-10 lg:px-14">
					<div className="mx-auto w-full max-w-[92rem]">
						<div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-2xl shadow-black/20 backdrop-blur-md">
							<div className="pointer-events-none absolute inset-0 z-0 opacity-30">
								<ArkhiveonGradientBackground />
							</div>
							<div className="relative z-10 p-6 sm:p-10">
								<DemoInteractiveSection activeTab={activeDemoTab} />
							</div>
						</div>
					</div>
				</section>

				{/* ── Pillars ── */}
				<section
					id={featuresId}
					className="w-full border-t border-border/50 px-6 py-16 sm:px-10 lg:px-14 lg:py-24"
				>
					<div className="mx-auto w-full max-w-[92rem]">
						<div className="mb-10 max-w-xl">
							<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
								Estrutura
							</p>
							<h2 className="mt-5 font-display text-3xl font-black leading-[0.96] text-foreground sm:text-4xl">
								Menos tela.
								<br />
								Mais campanha.
							</h2>
						</div>

						<div className="grid gap-4 lg:grid-cols-3">
							{pillars.map(({ Icon, eyebrow, title, description }) => (
								<article
									key={eyebrow}
									className="group rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm shadow-black/5 transition-all hover:border-primary/25 hover:shadow-md"
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

				{/* ── Characters section ── */}
				<section className="w-full border-t border-border/50 px-6 py-16 sm:px-10 lg:px-14 lg:py-24">
					<div className="mx-auto grid w-full max-w-[92rem] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
								Personagens
							</p>
							<h2 className="mt-5 font-display text-3xl font-black leading-[0.96] text-foreground sm:text-4xl">
								Um personagem novo
								<br />
								sem cadastro pesado.
							</h2>
							<p className="mt-5 max-w-md text-[15px] font-medium leading-7 text-muted-foreground">
								O registro mostra o essencial e deixa os detalhes para
								crescerem depois.
							</p>
						</div>

						<article className="rounded-[1.75rem] border border-border/60 bg-card/80 p-6 shadow-sm shadow-black/5 sm:p-7 lg:ml-auto lg:w-full lg:max-w-xl">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
										Prévia
									</p>
									<h3 className="mt-4 font-display text-2xl font-black leading-none text-foreground">
										Elara Moonveil
									</h3>
								</div>
								<span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
									<User className="h-5 w-5" strokeWidth={1.8} />
								</span>
							</div>

							<div className="mt-6 grid gap-2 sm:grid-cols-3">
								<PreviewField label="Origem" value="Biblioteca perdida" />
								<PreviewField label="Papel" value="Guardiã de memória" />
								<PreviewField label="Vínculo" value="Ordem do Eclipse" />
							</div>
						</article>
					</div>
				</section>

				{/* ── Sheets section ── */}
				<section className="w-full border-t border-border/50 px-6 py-16 sm:px-10 lg:px-14 lg:py-24">
					<div className="mx-auto grid w-full max-w-[92rem] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
						<article className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/80 p-6 shadow-sm shadow-black/5 sm:p-7 lg:max-w-xl">
							<div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
							<div className="relative">
								<div className="flex items-center justify-between gap-4">
									<div>
										<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
											Ficha
										</p>
										<h3 className="mt-4 font-display text-2xl font-black leading-none text-foreground">
											Módulos vivos
										</h3>
									</div>
									<span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
										<FileText className="h-5 w-5" strokeWidth={1.8} />
									</span>
								</div>

								<div className="mt-6 grid grid-cols-3 gap-2">
									{sheetModules.map((module) => (
										<div
											key={module.label}
											className="rounded-xl border border-border/60 bg-background/40 p-3"
										>
											<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
												{module.label}
											</p>
											<p className="mt-2 font-display text-2xl font-black text-foreground">
												{module.value}
											</p>
										</div>
									))}
								</div>
							</div>
						</article>

						<div className="lg:ml-auto lg:w-full lg:max-w-xl text-right">
							<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule-right">
								Fichas
							</p>
							<h2 className="mt-5 font-display text-3xl font-black leading-[0.96] text-foreground sm:text-4xl">
								O sistema acompanha
								<br />o jeito da sua mesa.
							</h2>
							<p className="mt-5 ml-auto max-w-md text-[15px] font-medium leading-7 text-muted-foreground">
								Atributos, inventário e notas ficam próximos sem virar painel
								lotado.
							</p>
						</div>
					</div>
				</section>

				{/* ── Pricing ── */}
				<section className="w-full border-t border-border/50 px-6 py-16 sm:px-10 lg:px-14 lg:py-24">
					<div className="mx-auto w-full max-w-[92rem]">
						<div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground heading-rule">
									Planos
								</p>
								<h2 className="mt-5 font-display text-3xl font-black leading-[0.96] text-foreground sm:text-4xl">
									Comece pequeno
									<br />e cresça quando a mesa pedir.
								</h2>
							</div>
							<p className="max-w-xs text-[15px] font-medium leading-6 text-muted-foreground sm:text-right">
								Free para experimentar.
								<br />
								Pro para campanha que não para.
							</p>
						</div>

						<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
							<PlanCard
								name="Free"
								price="R$ 0"
								description="Para testar uma campanha curta."
								features={freePlanFeatures}
							/>
							<PlanCard
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

/* ─── Sub-components ─── */

function PreviewField({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
			<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-[14px] font-bold text-foreground">{value}</p>
		</div>
	);
}

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
		<article
			className={`relative overflow-hidden rounded-[1.75rem] border p-7 shadow-sm transition-all sm:p-8 ${
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
			<div className="plan-card-content relative">
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

function DemoInteractiveSection({ activeTab }: { activeTab: "Personagens" | "Sessões" | "Lore" }) {
	const [selectedTemplate, setSelectedTemplate] = useState("Fantasia Clássica");
	
	let Icon = User;
	let title = "Personagem";
	let description = "Crie um novo herói ou vilão para sua história.";

	if (activeTab === "Sessões") {
		Icon = ScrollText;
		title = "Sessão";
		description = "Registre os acontecimentos do último encontro.";
	} else if (activeTab === "Lore") {
		Icon = BookOpen;
		title = "Lore";
		description = "Adicione um novo local, facção ou lenda ao mundo.";
	}

	return (
		<div className="mx-auto max-w-2xl text-left">
			<div className="mb-8 flex items-center justify-between border-b border-border/50 pb-6">
				<div className="flex items-center gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
						<Icon className="h-6 w-6 text-primary" strokeWidth={2} />
					</div>
					<div>
						<h3 className="font-display text-2xl font-bold text-foreground">
							Novo {title}
						</h3>
						<p className="mt-1 text-[13px] text-muted-foreground">
							{description}
						</p>
					</div>
				</div>
				<span className="hidden sm:inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
					Modo Demonstração
				</span>
			</div>

			<div className="grid gap-6">
				<div className="space-y-2">
					<label className="text-[13px] font-bold text-foreground">Nome</label>
					<input
						type="text"
						placeholder={`Ex: O início da jornada`}
						className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-[13px] font-bold text-foreground">
						Template (Estrutura)
					</label>
					<div className="grid gap-3 sm:grid-cols-2">
						{["Fantasia Clássica", "Sci-Fi / Cyberpunk"].map((template) => (
							<button
								key={template}
								type="button"
								onClick={() => setSelectedTemplate(template)}
								className={`group flex flex-col rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 ${
									selectedTemplate === template
										? "border-primary/50 bg-primary/10"
										: "border-border/50 bg-background/30"
								}`}
							>
								<span className={`font-bold transition-colors group-hover:text-primary ${selectedTemplate === template ? "text-primary" : "text-foreground"}`}>
									{template}
								</span>
								<span className="mt-1 text-[11px] text-muted-foreground">
									Estrutura recomendada
								</span>
							</button>
						))}
					</div>
				</div>

				<div className="space-y-2">
					<label className="text-[13px] font-bold text-foreground">
						Resumo Inicial
					</label>
					<textarea
						placeholder="Uma breve descrição..."
						className="h-24 w-full resize-none rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
					/>
				</div>
			</div>

			<div className="mt-8 flex items-center justify-between border-t border-border/50 pt-6">
				<p className="hidden sm:block text-[12px] text-muted-foreground">
					Crie uma conta gratuita para salvar e editar.
				</p>
				<div className="flex w-full sm:w-auto justify-end gap-3">
					<Button variant="outline" className="font-bold cursor-default hover:bg-transparent hover:text-foreground">
						Cancelar
					</Button>
					<Button className="font-bold cursor-default">Simular criação</Button>
				</div>
			</div>
		</div>
	);
}
