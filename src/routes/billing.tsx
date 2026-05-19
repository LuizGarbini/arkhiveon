import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowUpRight,
	CheckCircle2,
	CreditCard,
	Crown,
	Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/billing")({
	component: BillingPage,
});

const FREE_LIMIT = 20;

const benefits = [
	"Mais espaço para personagens, NPCs e locais",
	"Histórico avançado de sessões e alterações",
	"Recursos premium para mestre e jogadores",
];

function BillingPage() {
	const totals = useRPGStore((state) => ({
		characters: state.characters.length,
		npcs: state.npcs.length,
		sessions: state.sessions.length,
		items: state.items.length,
		locations: state.locations.length,
		lores: state.lores.length,
	}));
	const used =
		totals.characters +
		totals.npcs +
		totals.sessions +
		totals.items +
		totals.locations +
		totals.lores;
	const usagePercent = Math.min(100, Math.round((used / FREE_LIMIT) * 100));

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5 sm:p-8">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-3xl">
						<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
							<CreditCard className="h-3.5 w-3.5" />
							Plano & Assinatura
						</div>
						<h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							Plano Free ativo
						</h1>
						<p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
							Acompanhe o uso atual do arquivo e veja o que entra quando o
							upgrade estiver disponível.
						</p>
					</div>
					<Button className="h-11 gap-2 px-5">
						<Crown className="h-4 w-4" />
						Fazer upgrade
					</Button>
				</div>
			</header>

			<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
				<section className="rounded-2xl border border-primary/25 bg-primary/8 p-5 shadow-sm shadow-black/5">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
								Free
							</p>
							<h2 className="font-display mt-1 text-2xl font-bold text-foreground">
								{used} de {FREE_LIMIT} criações
							</h2>
						</div>
						<span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
							Ativo
						</span>
					</div>
					<div className="mt-5 h-2 overflow-hidden rounded-full bg-background/70 ring-1 ring-border/60">
						<div
							className="h-full rounded-full bg-linear-to-r from-primary to-fuchsia-500 transition-all duration-500"
							style={{ width: `${usagePercent}%` }}
						/>
					</div>
					<p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
						Contabilizamos personagens, NPCs, sessões, itens, locais e lore para
						representar o uso total da campanha.
					</p>
				</section>

				<section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
								Upgrade
							</p>
							<h2 className="font-display mt-1 text-xl font-bold text-foreground">
								Benefícios planejados
							</h2>
						</div>
						<Sparkles className="h-5 w-5 text-primary" />
					</div>
					<div className="mt-5 grid gap-3">
						{benefits.map((benefit) => (
							<div
								key={benefit}
								className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/45 p-3"
							>
								<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
								<span className="text-[13px] font-medium text-foreground">
									{benefit}
								</span>
							</div>
						))}
					</div>
				</section>
			</div>

			<section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
							Cobrança
						</p>
						<h2 className="font-display mt-1 text-lg font-bold text-foreground">
							Sem cobrança ativa
						</h2>
						<p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
							Esta tela já está pronta para receber uma integração de pagamento
							no futuro, sem alterar os fluxos atuais.
						</p>
					</div>
					<Button variant="outline" className="h-10 gap-2">
						Ver detalhes
						<ArrowUpRight className="h-4 w-4" />
					</Button>
				</div>
			</section>
		</div>
	);
}
