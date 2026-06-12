import { createFileRoute, notFound } from "@tanstack/react-router";
import { isDesignSystemEnabled } from "@/lib/feature-flags";
import {
	AlertTriangle,
	Bell,
	BookOpen,
	CheckCircle2,
	ChevronRight,
	CreditCard,
	Info,
	MousePointer2,
	Music,
	PanelLeft,
	Plus,
	Search,
	Sparkles,
	User,
	WandSparkles,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export const Route = createFileRoute("/design-system")({
	beforeLoad: () => {
		if (!isDesignSystemEnabled()) {
			throw notFound();
		}
	},
	component: DesignSystem,
});

const swatches = [
	{ name: "Background", className: "bg-background", text: "text-foreground" },
	{ name: "Card", className: "bg-card", text: "text-card-foreground" },
	{
		name: "Elevated",
		className: "bg-card-elevated",
		text: "text-card-foreground",
	},
	{ name: "Muted", className: "bg-muted", text: "text-muted-foreground" },
	{ name: "Primary", className: "bg-primary", text: "text-primary-foreground" },
];

const surfaces = [
	{
		title: "Hero editorial",
		description:
			"Abertura de páginas importantes, com gradiente radial e título display.",
	},
	{
		title: "Painel de seção",
		description: "Agrupa conteúdo estático, métricas e blocos de formulário.",
	},
	{
		title: "Card interativo",
		description:
			"Listas e entidades usam hover sutil, borda ativa e sombra leve.",
	},
	{
		title: "Empty state",
		description:
			"Usado dentro de grids quando a busca ou coleção não tem resultado.",
	},
];

function DesignSystem() {
	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5 sm:p-8">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative max-w-3xl">
					<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
						<WandSparkles className="h-3.5 w-3.5" />
						Design System
					</div>
					<h1 className="font-display mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
						Arkhiveon UI
					</h1>
					<p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
						Fonte viva do visual atual: editorial, arcano, escuro, com
						superfícies ricas e interações rápidas.
					</p>
				</div>
			</header>

			<section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
				<SpecPanel eyebrow="Tipografia" title="Hierarquia">
					<div className="space-y-5">
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
								Display
							</p>
							<p className="font-display mt-1 text-4xl font-bold text-gradient-primary">
								Crônicas do Reino
							</p>
						</div>
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
								Título
							</p>
							<p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
								Dashboard da campanha
							</p>
						</div>
						<p className="text-[14px] leading-relaxed text-muted-foreground">
							Títulos principais usam `font-display`; textos longos usam Inter
							com contraste suave. Eyebrows ficam pequenos, em uppercase e
							espaçados.
						</p>
					</div>
				</SpecPanel>

				<SpecPanel eyebrow="Tokens" title="Cores e superfícies">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
						{swatches.map((swatch) => (
							<div
								key={swatch.name}
								className={`${swatch.className} ${swatch.text} flex min-h-24 flex-col justify-end rounded-2xl border border-border/70 p-3 shadow-sm shadow-black/5`}
							>
								<span className="text-[11px] font-bold">{swatch.name}</span>
							</div>
						))}
					</div>
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						{surfaces.map((surface) => (
							<div
								key={surface.title}
								className="rounded-2xl border border-border/70 bg-background/45 p-4"
							>
								<h3 className="text-[13px] font-bold text-foreground">
									{surface.title}
								</h3>
								<p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
									{surface.description}
								</p>
							</div>
						))}
					</div>
				</SpecPanel>
			</section>

			<SpecPanel eyebrow="Page pattern" title="Hero, busca e grid">
				<div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/35">
					<PageHeader
						title="Elenco"
						description="Visão narrativa dos personagens principais da campanha."
						Icon={User}
						eyebrow="Coleção"
						count={12}
						action={
							<Button className="h-11 gap-2 px-5">
								<Plus className="h-4 w-4" />
								Criar ficha
							</Button>
						}
					/>
					<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-6 sm:px-8">
						<ListLayout />
						<div className="grid gap-4 md:grid-cols-3">
							<EntityCard title="Aelyra Moonwhisper" meta="Elfa · Maga" />
							<EntityCard title="Sessão #14" meta="Ruínas do Vale Cinzento" />
							<EntityCard title="Orbe de Âmbar" meta="Item lendário" />
						</div>
					</div>
				</div>
			</SpecPanel>

			<section className="grid gap-4 lg:grid-cols-2">
				<SpecPanel eyebrow="Componentes" title="Botões e campos">
					<div className="flex flex-wrap gap-3">
						<Button className="h-11 gap-2 px-5">
							<Plus className="h-4 w-4" />
							Primário
						</Button>
						<Button variant="outline" className="h-11 gap-2 px-5">
							<ChevronRight className="h-4 w-4" />
							Secundário
						</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="destructive" className="gap-2">
							<AlertTriangle className="h-4 w-4" />
							Perigo
						</Button>
						<Button disabled>Desabilitado</Button>
					</div>
					<div className="mt-5 grid gap-3 sm:grid-cols-2">
						<Input
							placeholder="Nome da campanha"
							aria-label="Nome da campanha"
						/>
						<Select aria-label="Sistema">
							<option>D&D 5ª Edição</option>
							<option>Tormenta 20</option>
							<option>Ordem Paranormal</option>
						</Select>
					</div>
				</SpecPanel>

				<SpecPanel eyebrow="Estados" title="Feedback e vazio">
					<div className="grid gap-3 sm:grid-cols-3">
						<StateCard
							icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
							title="Sucesso"
							description="Alterações salvas."
						/>
						<StateCard
							icon={<Info className="h-4 w-4 text-primary" />}
							title="Info"
							description="Progresso sincronizado."
						/>
						<StateCard
							icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
							title="Atenção"
							description="Ação requer revisão."
						/>
					</div>
					<div className="mt-4 grid">
						<EmptyState
							Icon={BookOpen}
							title="Nenhum registro encontrado"
							description="Use empty states para coleções vazias ou filtros sem resultado."
						/>
					</div>
				</SpecPanel>
			</section>

			<section className="grid gap-4 lg:grid-cols-2">
				<SpecPanel eyebrow="Shell" title="Sidebar, header e busca global">
					<div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
						<div className="rounded-2xl border border-border/70 bg-card-elevated p-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
									<img
										src="/favicon.svg"
										alt="Arkhiveon"
										className="h-6 w-6"
										draggable={false}
									/>
								</div>
								<div>
									<p className="font-display text-[13px] font-bold tracking-[0.2em]">
										ARKHIVEON
									</p>
									<p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
										Arkhiveon
									</p>
								</div>
							</div>
							<div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2 text-[12px] font-bold text-primary">
								Dashboard
							</div>
						</div>
						<div className="rounded-2xl border border-border/70 bg-card-elevated p-4">
							<div className="flex items-center gap-3">
								<Button variant="ghost" size="icon" className="rounded-xl">
									<PanelLeft className="h-4 w-4" />
								</Button>
								<div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border/70 bg-background/55 px-4 py-2 text-[13px] text-muted-foreground">
									<Search className="h-3.5 w-3.5" />
									Pesquisar no Arkhiveon...
								</div>
								<Button variant="ghost" size="icon" className="rounded-xl">
									<Bell className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				</SpecPanel>

				<SpecPanel eyebrow="Plano e Spotify" title="Quota e miniplayer">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="rounded-2xl border border-primary/20 bg-primary/8 p-4">
							<div className="flex items-center justify-between gap-2">
								<span className="text-[12px] font-bold text-primary">
									Plano Free
								</span>
								<CreditCard className="h-4 w-4 text-primary" />
							</div>
							<p className="mt-2 text-[12px] text-muted-foreground">
								8 de 20 criações usadas
							</p>
							<div className="mt-3 h-2 overflow-hidden rounded-full bg-background/70 ring-1 ring-border/60">
								<div className="h-full w-2/5 rounded-full bg-linear-to-r from-primary to-fuchsia-500" />
							</div>
						</div>
						<div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25">
									<Music className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[13px] font-bold text-foreground">
										Spotify Jam
									</p>
									<p className="text-[11px] text-muted-foreground">
										Miniplayer local no header
									</p>
								</div>
							</div>
						</div>
					</div>
				</SpecPanel>
			</section>

			<SpecPanel eyebrow="Motion" title="Regras de interatividade">
				<div className="grid gap-3 md:grid-cols-3">
					<MotionRule
						icon={<MousePointer2 className="h-4 w-4 text-primary" />}
						title="Press"
						description="Ações reduzem para 0.97-0.99 no toque, sem atrasar o clique."
					/>
					<MotionRule
						icon={<Sparkles className="h-4 w-4 text-primary" />}
						title="Entrada"
						description="Menus e popovers entram com scale 0.95+, nunca de zero."
					/>
					<MotionRule
						icon={<ChevronRight className="h-4 w-4 text-primary" />}
						title="Easing"
						description="Transições curtas, abaixo de 300ms, com cubic-bezier(0.16,1,0.3,1)."
					/>
				</div>
			</SpecPanel>
		</div>
	);
}

function SpecPanel({
	eyebrow,
	title,
	children,
}: {
	eyebrow: string;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
			<div className="mb-4">
				<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
					{eyebrow}
				</p>
				<h2 className="font-display mt-1 text-xl font-bold tracking-tight text-foreground">
					{title}
				</h2>
			</div>
			{children}
		</section>
	);
}

function EntityCard({ title, meta }: { title: string; meta: string }) {
	return (
		<div className="group rounded-2xl border border-border/70 bg-card-elevated p-4 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5">
			<div className="flex items-start justify-between gap-3">
				<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
					<BookOpen className="h-4 w-4" />
				</div>
				<span className="rounded-full border border-border/70 bg-background/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
					Ativo
				</span>
			</div>
			<h3 className="font-display mt-4 text-[16px] font-bold text-foreground">
				{title}
			</h3>
			<p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
				{meta}
			</p>
		</div>
	);
}

function StateCard({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-card-elevated p-4">
			<div className="flex items-center gap-2">
				{icon}
				<h3 className="text-[13px] font-bold text-foreground">{title}</h3>
			</div>
			<p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function MotionRule({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-card-elevated p-4">
			<div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
				{icon}
			</div>
			<h3 className="mt-3 text-[13px] font-bold text-foreground">{title}</h3>
			<p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
				{description}
			</p>
		</div>
	);
}
