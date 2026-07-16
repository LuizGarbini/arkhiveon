import { createFileRoute, notFound } from "@tanstack/react-router";
import {
	AlertTriangle,
	Bell,
	BookOpen,
	Calendar,
	CheckCircle2,
	ChevronRight,
	Clock,
	Coins,
	Compass,
	CreditCard,
	Eye,
	Gem,
	Info,
	Link2,
	Lock,
	MapPin,
	Mountain,
	MousePointer2,
	Music,
	PanelLeft,
	Plus,
	ScrollText,
	Search,
	Sparkles,
	User,
	Users,
	WandSparkles,
	Weight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isDesignSystemEnabled } from "@/lib/feature-flags";

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
						title="Personagens"
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

			<SpecPanel
				eyebrow="Motion Design"
				title="Showcase de Transições (transitions.dev)"
			>
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
					<div className="rounded-2xl border border-border/70 bg-card-elevated p-5 flex flex-col justify-between min-h-[220px]">
						<div>
							<h3 className="text-[14px] font-bold text-foreground mb-1">
								01 · Card Resize
							</h3>
							<p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
								Redimensiona containers de forma fluida usando variáveis de
								transição e aceleração gráfica.
							</p>
						</div>
						<CardResizeShowcase />
					</div>

					<div className="rounded-2xl border border-border/70 bg-card-elevated p-5 flex flex-col justify-between min-h-[220px]">
						<div>
							<h3 className="text-[14px] font-bold text-foreground mb-1">
								02 · Number Pop-in
							</h3>
							<p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
								Re-entrada de dígitos com desfoque e efeito staggered
								(escalonamento) nos decimais.
							</p>
						</div>
						<NumberPopInShowcase />
					</div>

					<div className="rounded-2xl border border-border/70 bg-card-elevated p-5 flex flex-col justify-between min-h-[220px]">
						<div>
							<h3 className="text-[14px] font-bold text-foreground mb-1">
								03 · Notification Badge
							</h3>
							<p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
								O badge de notificação desliza em diagonal e o número expande
								com efeito elástico.
							</p>
						</div>
						<NotificationBadgeShowcase />
					</div>

					<div className="rounded-2xl border border-border/70 bg-card-elevated p-5 flex flex-col justify-between min-h-[220px]">
						<div>
							<h3 className="text-[14px] font-bold text-foreground mb-1">
								04 · Text States Swap
							</h3>
							<p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
								Substitui textos com movimentação vertical e desfoque, ideal
								para botões de salvar/processar.
							</p>
						</div>
						<TextStatesSwapShowcase />
					</div>

					<div className="rounded-2xl border border-border/70 bg-card-elevated p-5 flex flex-col justify-between min-h-[220px]">
						<div>
							<h3 className="text-[14px] font-bold text-foreground mb-1">
								05 · Menu Dropdown
							</h3>
							<p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
								Menus de opções crescem em escala a partir da origem do gatilho
								e fecham suavemente.
							</p>
						</div>
						<MenuDropdownShowcase />
					</div>

					<div className="rounded-2xl border border-border/70 bg-card-elevated p-5 flex flex-col justify-between min-h-[220px]">
						<div>
							<h3 className="text-[14px] font-bold text-foreground mb-1">
								06 · Error State Shake
							</h3>
							<p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
								Tremedeira com overshoot e auto-reversão no timer para feedbacks
								rápidos em formulários.
							</p>
						</div>
						<ErrorStateShakeShowcase />
					</div>
				</div>
			</SpecPanel>

			<SpecPanel
				eyebrow="Coleções"
				title="Redesign dos Cards de Entidades (Mockup)"
			>
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{/* 1. NPC Card Mockup */}
					<div className="group relative flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card-elevated p-4.5 shadow-sm shadow-black/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.985]">
						<div className="flex items-start gap-4">
							<div className="relative h-15 w-15 shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-fuchsia-500/10 to-transparent ring-1 ring-fuchsia-500/25">
								<div className="flex h-full w-full items-center justify-center text-lg font-bold text-fuchsia-300">
									AV
								</div>
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="font-display truncate text-[16px] font-bold text-rose-400">
									Alistair Vance
								</h3>
								<p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
									<User className="h-3.5 w-3.5" /> Humano · Nobre
								</p>
								<div className="mt-2 flex flex-wrap items-center gap-1.5">
									<span className="rounded bg-background/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border">
										NPC
									</span>
									<span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 text-emerald-300 bg-emerald-500/10 ring-emerald-500/25">
										Amigável
									</span>
									<span className="rounded bg-muted/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border">
										Ordem da Estrela
									</span>
									<span className="font-mono rounded bg-background/50 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-muted-foreground ring-1 ring-border">
										CR 5
									</span>
								</div>
							</div>
						</div>
						<div className="mt-3.5 flex items-center gap-1.5 text-xs text-muted-foreground">
							<MapPin className="h-3.5 w-3.5 text-amber-300" />
							<span className="truncate">Vale Cinzento</span>
						</div>
						<p className="mt-3.5 line-clamp-3 border-t border-border/60 pt-3 text-xs italic leading-relaxed text-muted-foreground">
							“Um nobre caído que busca redenção a todo custo, mesmo que precise
							se aliar a forças profanas.”
						</p>
					</div>

					{/* 2. Session Card Mockup */}
					<div className="group relative flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card-elevated p-5 shadow-sm shadow-black/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.985]">
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="rounded-md bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
										SESSÃO #14
									</span>
									<span className="rounded-md bg-muted/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border">
										Tenso
									</span>
								</div>
								<h3 className="font-display mt-2.5 text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-250">
									O Segredo do Vale Cinzento
								</h3>
								<div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
									<span className="flex items-center gap-1">
										<Calendar className="h-3.5 w-3.5 text-primary" />
										14 Jul 2026
									</span>
									<span>·</span>
									<span className="flex items-center gap-1">
										<Clock className="h-3.5 w-3.5 text-primary" />
										4h 30m
									</span>
								</div>
								<div className="mt-1.5">
									<span className="inline-flex items-center gap-1 rounded bg-amber-500/5 px-2 py-0.5 border border-amber-500/20 text-[10px] text-amber-300">
										13 de Outono, 1492 DR
									</span>
								</div>
							</div>
						</div>
						<div className="mt-4 rounded-xl bg-background/30 p-3.5 ring-1 ring-border/50">
							<div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
								<ScrollText className="h-3.5 w-3.5 text-primary" />
								Resumo da Crônica
							</div>
							<p className="font-display text-xs leading-relaxed text-foreground/80">
								O grupo explorou as ruínas subterrâneas e enfrentou o guardião
								de pedra. Encontraram o Orbe de Âmbar.
							</p>
						</div>
						<div className="mt-3.5 flex items-center gap-1.5 text-xs text-muted-foreground">
							<Users className="h-3.5 w-3.5 text-primary" />
							<span>
								Participantes:{" "}
								<span className="text-foreground">
									Luiz, Gabriel, Pedro, Ana
								</span>
							</span>
						</div>
						<p className="mt-3.5 line-clamp-2 border-t border-border/60 pt-3 text-xs italic text-amber-300/80">
							"A fenda começou a desabar e um rugido ecoou das profundezas..."
						</p>
					</div>

					{/* 3. Item Card Mockup */}
					<div className="group relative flex cursor-pointer flex-col rounded-2xl border border-amber-500/35 bg-card-elevated p-4.5 shadow-sm shadow-black/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/5 active:scale-[0.985]">
						<div className="flex items-start gap-4">
							<div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-amber-500/15 to-transparent ring-1 ring-amber-500/30 text-amber-300">
								<Gem className="h-5 w-5" strokeWidth={1.6} />
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="font-display truncate text-[16px] font-bold text-foreground">
									Orbe de Âmbar
								</h3>
								<div className="mt-1 flex flex-wrap items-center gap-1.5">
									<span className="rounded bg-background/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-amber-500/35 text-amber-300">
										Lendário
									</span>
									<span className="text-xs text-muted-foreground">
										· Foco Arcano (Cristal)
									</span>
								</div>
								<div className="mt-1.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-violet-300">
									<Link2 className="h-3 w-3" /> requer sintonia
								</div>
							</div>
						</div>
						<p className="font-mono mt-3.5 line-clamp-2 rounded-xl bg-background/45 p-2 text-xs text-foreground/90 ring-1 ring-border/60">
							+2 em testes de resistência de Magia
						</p>
						<div className="mt-3.5 grid grid-cols-3 gap-1.5 text-xs">
							<div className="flex items-center gap-1 rounded-xl bg-background/45 px-1.5 py-1 ring-1 ring-border/60">
								<Weight className="h-3 w-3 text-muted-foreground" />
								<div>
									<div className="text-[7px] uppercase tracking-wider text-muted-foreground">
										Peso
									</div>
									<div className="text-[10px] font-bold text-foreground">
										1.5 kg
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1 rounded-xl bg-background/45 px-1.5 py-1 ring-1 ring-border/60">
								<Coins className="h-3 w-3 text-muted-foreground" />
								<div>
									<div className="text-[7px] uppercase tracking-wider text-muted-foreground">
										Valor
									</div>
									<div className="text-[10px] font-bold text-foreground">
										15k PO
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1 rounded-xl bg-background/45 px-1.5 py-1 ring-1 ring-border/60">
								<Gem className="h-3 w-3 text-muted-foreground" />
								<div>
									<div className="text-[7px] uppercase tracking-wider text-muted-foreground">
										Cargas
									</div>
									<div className="text-[10px] font-bold text-foreground">
										3 / 3
									</div>
								</div>
							</div>
						</div>
						<p className="mt-3.5 line-clamp-2 border-t border-border/60 pt-3 text-xs italic text-muted-foreground">
							"Um cristal reluzente que pulsa com energia elemental de terra
							aprisionada há milênios."
						</p>
					</div>

					{/* 4. Location Card Mockup */}
					<div className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 bg-card-elevated shadow-sm shadow-black/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.985]">
						<div className="relative h-28 w-full shrink-0 overflow-hidden bg-linear-to-br from-emerald-500/15 to-transparent">
							<div className="flex h-full w-full items-center justify-center text-emerald-400/30">
								<Compass className="h-10 w-10" strokeWidth={1.4} />
							</div>
							<div className="absolute inset-x-0 bottom-0 z-10 h-12 bg-linear-to-t from-card-elevated to-transparent" />
						</div>
						<div className="flex flex-1 flex-col p-4.5 pt-2">
							<h3 className="font-display truncate text-[16px] font-bold text-foreground">
								Vale Cinzento
							</h3>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Ruínas Antigas · Fronteiras do Leste
							</p>
							<div className="mt-2 flex flex-wrap items-center gap-1.5">
								<span className="rounded bg-background/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-amber-500/35 text-amber-300 bg-amber-500/5">
									Perigo Moderado
								</span>
								<span className="flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/20">
									<Eye className="h-2.5 w-2.5" /> visitado
								</span>
							</div>
							<div className="mt-3.5 grid grid-cols-2 gap-1.5 text-xs">
								<div className="flex items-center gap-1.5 rounded-xl bg-background/45 px-1.5 py-1 ring-1 ring-border/60">
									<Mountain className="h-3.5 w-3.5 text-muted-foreground" />
									<div>
										<div className="text-[7px] uppercase tracking-wider text-muted-foreground">
											Clima
										</div>
										<div className="text-[10px] font-bold text-foreground">
											Nevoeiro
										</div>
									</div>
								</div>
								<div className="flex items-center gap-1.5 rounded-xl bg-background/45 px-1.5 py-1 ring-1 ring-border/60">
									<Users className="h-3.5 w-3.5 text-muted-foreground" />
									<div>
										<div className="text-[7px] uppercase tracking-wider text-muted-foreground">
											Pop.
										</div>
										<div className="text-[10px] font-bold text-foreground">
											Desabitado
										</div>
									</div>
								</div>
							</div>
							<p className="mt-3.5 line-clamp-3 border-t border-border/60 pt-3 text-xs italic text-muted-foreground">
								"Uma floresta outrora fértil, agora coberta por névoa perpétua e
								ruínas esquecidas pela história."
							</p>
						</div>
					</div>

					{/* 5. Lore Card Mockup */}
					<div className="group relative flex cursor-pointer flex-col rounded-2xl border border-amber-500/30 bg-card-elevated p-4.5 shadow-sm shadow-black/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-amber-500/45 hover:shadow-lg hover:shadow-amber-500/5 active:scale-[0.985]">
						<div className="pointer-events-none absolute inset-y-3.5 left-0 w-[2px] rounded-full bg-linear-to-b from-transparent via-amber-500/45 to-transparent" />
						<div className="flex items-start gap-4 pl-1.5">
							<div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background/45 ring-1 ring-amber-500/25 text-amber-300">
								<BookOpen className="h-4.5 w-4.5" strokeWidth={1.6} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<h3 className="font-display truncate text-[16px] font-bold text-foreground">
										Declínio de Netheril
									</h3>
									<Lock className="h-3 w-3 shrink-0 text-rose-400" />
								</div>
								<p className="mt-0.5 text-xs text-muted-foreground">
									História · Segunda Era
								</p>
								<div className="mt-2">
									<span className="rounded bg-background/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-amber-500/30 text-amber-300">
										Pilar
									</span>
								</div>
							</div>
						</div>
						<p className="font-display mt-3.5 line-clamp-5 border-t border-border/60 pt-3 text-xs italic leading-relaxed text-foreground/80 pl-1.5">
							A queda das cidades flutuantes marcou o fim da magia arcana sem
							limites e a ascensão do atual Panteão de divindades.
						</p>
						<div className="mt-3.5 flex flex-wrap gap-1.5 pl-1.5">
							{["#magia", "#queda", "#imperio", "#netheril"].map((tag) => (
								<span
									key={tag}
									className="rounded bg-muted/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border"
								>
									{tag}
								</span>
							))}
						</div>
					</div>
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

// ─── Componentes de Demonstração Interativa (transitions.dev) ───

function CardResizeShowcase() {
	const [isExpanded, setIsExpanded] = useState(false);
	return (
		<div className="flex flex-col gap-3">
			<Button
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-fit h-9 text-[12px] rounded-xl px-4"
			>
				{isExpanded ? "Contrair Card" : "Expandir Card"}
			</Button>
			<div
				className="t-resize overflow-hidden border border-border bg-background rounded-2xl p-4"
				style={{
					width: isExpanded ? "100%" : "230px",
					height: isExpanded ? "150px" : "80px",
				}}
			>
				<h4 className="font-display font-bold text-[13px] text-foreground">
					Aelyra Moonwhisper
				</h4>
				<p className="text-[11px] text-muted-foreground mt-0.5">
					Elfa · Maga Nível 5
				</p>
				{isExpanded && (
					<div className="mt-3 pt-3 border-t border-border/50 text-[11px] leading-relaxed text-muted-foreground">
						<p>
							<strong>PV:</strong> 28/28 | <strong>PM:</strong> 15/15
						</p>
						<p className="mt-1">Equipada com o Orbe de Âmbar e Cajado.</p>
					</div>
				)}
			</div>
		</div>
	);
}

function NumberPopInShowcase() {
	const [count, setCount] = useState(128.5);

	const digitsStr = count.toFixed(1);
	const digits = digitsStr.split("");

	return (
		<div className="flex flex-col gap-3">
			<div className="flex gap-1.5">
				<Button
					size="sm"
					variant="outline"
					className="h-8 text-[11px] rounded-xl px-3"
					onClick={() => setCount((prev) => prev + 1.2)}
				>
					+1.2
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="h-8 text-[11px] rounded-xl px-3"
					onClick={() => setCount((prev) => prev - 0.7)}
				>
					-0.7
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="h-8 text-[11px] rounded-xl px-3"
					onClick={() => setCount(100.0)}
				>
					Reset
				</Button>
			</div>
			<div className="text-2xl font-bold text-primary">
				<span key={count} className="t-digit-group is-animating">
					{digits.map((digit, i) => {
						let staggerVal: string | undefined;
						if (i === digits.length - 2) staggerVal = "1";
						else if (i === digits.length - 1) staggerVal = "2";
						return (
							// biome-ignore lint/suspicious/noArrayIndexKey: static digits mapping
							<span key={i} className="t-digit" data-stagger={staggerVal}>
								{digit}
							</span>
						);
					})}
				</span>
			</div>
		</div>
	);
}

function NotificationBadgeShowcase() {
	const [count, setCount] = useState(0);

	return (
		<div className="flex flex-col gap-3 items-start">
			<div className="flex gap-1.5">
				<Button
					size="sm"
					variant="outline"
					className="h-8 text-[11px] rounded-xl px-3"
					onClick={() => setCount((prev) => prev + 1)}
				>
					Notificar
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="h-8 text-[11px] rounded-xl px-3"
					onClick={() => setCount(0)}
				>
					Limpar
				</Button>
			</div>
			<div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary cursor-pointer hover:bg-primary/15 transition-colors">
				<Bell className="h-5 w-5" />
				<span className="t-badge" data-open={count > 0 ? "true" : "false"}>
					<span className="t-badge-dot flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[9px] font-bold text-white leading-none">
						{count}
					</span>
				</span>
			</div>
		</div>
	);
}

function TextStatesSwapShowcase() {
	const [step, setStep] = useState(0);
	const [text, setText] = useState("Salvar Ficha");
	const [stateClass, setStateClass] = useState("");

	const texts = ["Salvar Ficha", "Salvando...", "Salvo!"];

	const handleTrigger = () => {
		const nextStep = (step + 1) % 3;
		setStep(nextStep);

		setStateClass("is-exit");

		setTimeout(() => {
			setText(texts[nextStep]);
			setStateClass("is-enter-start");

			setTimeout(() => {
				setStateClass("");
			}, 20);
		}, 200); // 200ms
	};

	return (
		<div className="flex flex-col gap-2">
			<Button
				onClick={handleTrigger}
				variant={step === 2 ? "outline" : "default"}
				className="w-36 h-9 text-[12px] rounded-xl"
			>
				<span className={`t-text-swap ${stateClass}`}>{text}</span>
			</Button>
			<p className="text-[10px] text-muted-foreground">
				Transição vertical suave e desfoque ao trocar.
			</p>
		</div>
	);
}

function MenuDropdownShowcase() {
	const [isOpen, setIsOpen] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const toggleDropdown = () => {
		if (isOpen) {
			setIsClosing(true);
			setIsOpen(false);
			setTimeout(() => setIsClosing(false), 150);
		} else {
			setIsOpen(true);
		}
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				if (isOpen) {
					setIsClosing(true);
					setIsOpen(false);
					setTimeout(() => setIsClosing(false), 150);
				}
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div className="relative inline-block text-left" ref={containerRef}>
			<Button
				onClick={toggleDropdown}
				variant="outline"
				className="gap-2 h-9 text-[12px] rounded-xl px-4"
			>
				Menu de Opções
				<ChevronRight
					className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
				/>
			</Button>

			<div
				data-origin="top-left"
				className={`t-dropdown absolute left-0 mt-2 w-48 rounded-2xl border border-border/75 bg-card-elevated p-1.5 shadow-xl shadow-black/15 z-50 ${isOpen ? "is-open" : ""} ${isClosing ? "is-closing" : ""}`}
			>
				<div className="flex flex-col gap-0.5">
					<button
						type="button"
						className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] hover:bg-muted text-foreground text-left transition-colors"
					>
						Visualizar Perfil
					</button>
					<button
						type="button"
						className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] hover:bg-muted text-foreground text-left transition-colors"
					>
						Configurações
					</button>
					<hr className="border-border/50 my-1" />
					<button
						type="button"
						className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] hover:bg-destructive/10 text-destructive text-left transition-colors"
					>
						Excluir
					</button>
				</div>
			</div>
		</div>
	);
}

function ErrorStateShakeShowcase() {
	const [value, setValue] = useState("");
	const [isError, setIsError] = useState(false);
	const [isShaking, setIsShaking] = useState(false);
	const revertTimerRef = useRef<NodeJS.Timeout | null>(null);

	const triggerError = () => {
		setIsError(true);
		setIsShaking(false);

		setTimeout(() => {
			setIsShaking(true);
		}, 10);

		setTimeout(() => {
			setIsShaking(false);
		}, 290);

		if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
		revertTimerRef.current = setTimeout(() => {
			setIsError(false);
			revertTimerRef.current = null;
		}, 3280);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setValue(e.target.value);
		if (revertTimerRef.current) {
			clearTimeout(revertTimerRef.current);
			revertTimerRef.current = null;
		}
		setIsError(false);
		setIsShaking(false);
	};

	useEffect(() => {
		return () => {
			if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
		};
	}, []);

	return (
		<div
			className={`t-input-wrap flex flex-col gap-1.5 w-full ${isError ? "is-error" : ""}`}
		>
			<div className="flex gap-2 w-full">
				<div
					className={`t-input flex-1 rounded-2xl border ${isError ? "border-destructive is-error" : "border-border/70"} ${isShaking ? "is-shaking" : ""} overflow-hidden bg-background`}
				>
					<input
						type="text"
						placeholder="Digite seu e-mail"
						value={value}
						onChange={handleInputChange}
						className="w-full h-9 px-3 bg-transparent text-[12px] border-none outline-none focus:ring-0"
					/>
				</div>
				<Button
					onClick={triggerError}
					className="h-9 text-[12px] rounded-xl px-4"
				>
					Validar
				</Button>
			</div>
			{isError && (
				<p className="t-error-msg text-[11px] text-destructive font-semibold pl-1 leading-none">
					E-mail inválido.
				</p>
			)}
		</div>
	);
}
