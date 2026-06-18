import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ArrowUpRight,
	CheckCircle2,
	CreditCard,
	Crown,
	Loader2,
	Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SparklesCanvas } from "@/components/ui/sparkles-canvas";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { FREE_CREATION_LIMIT } from "@/lib/store/sync-slice";

export const Route = createFileRoute("/billing")({
	validateSearch: (search: Record<string, unknown>): { success?: boolean; canceled?: boolean; mock?: boolean } => ({
		success: search.success === "true" || search.success === true ? true : undefined,
		canceled: search.canceled === "true" || search.canceled === true ? true : undefined,
		mock: search.mock === "true" || search.mock === true ? true : undefined,
	}),
	component: BillingPage,
});

const benefits = [
	"Mais espaço para personagens, NPCs e locais",
	"Histórico avançado de sessões e alterações",
	"Recursos premium para mestre e jogadores",
];

function BillingPage() {
	const { isPro, planLoading } = useAuth();
	const { success, canceled } = Route.useSearch();
	const navigate = useNavigate();
	const toast = useToast();
	const [checkoutLoading, setCheckoutLoading] = useState(false);
	const [showSparkles, setShowSparkles] = useState(success);
	const charactersCount = useRPGStore((state) => state.characters.length);
	const npcsCount = useRPGStore((state) => state.npcs.length);
	const sessionsCount = useRPGStore((state) => state.sessions.length);
	const itemsCount = useRPGStore((state) => state.items.length);
	const locationsCount = useRPGStore((state) => state.locations.length);
	const loresCount = useRPGStore((state) => state.lores.length);

	const totals = {
		characters: charactersCount,
		npcs: npcsCount,
		sessions: sessionsCount,
		items: itemsCount,
		locations: locationsCount,
		lores: loresCount,
	};
	const used =
		totals.characters +
		totals.npcs +
		totals.sessions +
		totals.items +
		totals.locations +
		totals.lores;
	const usagePercent = isPro
		? 100
		: Math.min(100, Math.round((used / FREE_CREATION_LIMIT) * 100));
	const planName = isPro ? "Pro" : "Free";
	const usageTitle = isPro
		? "Criações ilimitadas"
		: `${used} de ${FREE_CREATION_LIMIT} criações`;

	async function handleUpgrade() {
		const supabase = getSupabase();
		if (!supabase) {
			toast.error({
				title: "Erro",
				description: "Supabase não está configurado.",
			});
			return;
		}

		setCheckoutLoading(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session) {
				toast.error({
					title: "Sessão expirada",
					description: "Faça login novamente para continuar.",
				});
				return;
			}

			const response = await supabase.functions.invoke("stripe-checkout", {
				body: { origin: window.location.origin },
			});

			if (response.error) {
				throw new Error(response.error.message || "Erro ao criar sessão de pagamento.");
			}

			const data = response.data as { url?: string; error?: string };

			if (data.error) {
				throw new Error(data.error);
			}

			if (data.url) {
				window.location.href = data.url;
			}
		} catch (err) {
			toast.error({
				title: "Erro no checkout",
				description:
					err instanceof Error ? err.message : "Tente novamente mais tarde.",
			});
		} finally {
			setCheckoutLoading(false);
		}
	}

	function handleDismissSuccess() {
		setShowSparkles(false);
		void navigate({ to: "/billing", search: { success: undefined, canceled: undefined, mock: undefined }, replace: true });
	}

	// ── Success celebration screen ───────────────────────────────────
	if (success) {
		return (
			<>
				{showSparkles && (
					<SparklesCanvas
						count={150}
						duration={5000}
						onComplete={() => setShowSparkles(false)}
					/>
				)}
				<div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-12">
					<div className="relative w-full overflow-hidden rounded-[2rem] border border-primary/30 bg-linear-to-br from-card via-card/95 to-primary/10 p-8 text-center shadow-2xl shadow-primary/10 backdrop-blur-xl sm:p-12">
						{/* Decorative glow */}
						<div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
						<div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />

						<div className="relative">
							{/* Crown icon */}
							<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-linear-to-br from-amber-400/20 to-amber-600/10 shadow-lg shadow-amber-500/20">
								<Crown className="h-10 w-10 text-amber-400" strokeWidth={1.5} />
							</div>

							<h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
								Bem-vindo ao Pro!
							</h1>
							<p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
								Seu grimório foi desbloqueado. Agora você tem acesso ilimitado a
								todas as ferramentas para mestrar e jogar suas aventuras.
							</p>

							{/* Benefits mini-list */}
							<div className="mx-auto mt-8 grid max-w-sm gap-3">
								{benefits.map((benefit) => (
									<div
										key={benefit}
										className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5"
									>
										<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
										<span className="text-left text-[13px] font-medium text-foreground">
											{benefit}
										</span>
									</div>
								))}
							</div>

							<Button
								className="mt-8 h-12 gap-2 px-8"
								onClick={handleDismissSuccess}
							>
								<Sparkles className="h-4 w-4" />
								Começar a explorar
							</Button>
						</div>
					</div>
				</div>
			</>
		);
	}

	// ── Canceled toast ───────────────────────────────────────────────
	useEffect(() => {
		if (canceled) {
			toast.info({
				title: "Checkout cancelado",
				description: "Você pode tentar novamente quando quiser.",
			});
			void navigate({ to: "/billing", search: { success: undefined, canceled: undefined, mock: undefined }, replace: true });
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canceled]);

	// ── Normal billing page ──────────────────────────────────────────
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
							{planLoading
								? "Verificando plano"
								: isPro
									? "Plano Pro ativo"
									: "Plano Free ativo"}
						</h1>
						<p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
							{isPro
								? "Seu grimório está liberado para crescer sem limite de criações."
								: "Acompanhe o uso atual do seu grimório e veja o que entra quando o upgrade estiver disponível."}
						</p>
					</div>
					<Button
						className="h-11 gap-2 px-5"
						disabled={isPro || planLoading || checkoutLoading}
						variant={isPro ? "outline" : "default"}
						onClick={handleUpgrade}
					>
						{checkoutLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Crown className="h-4 w-4" />
						)}
						{isPro
							? "Pro ativo"
							: checkoutLoading
								? "Redirecionando..."
								: "Fazer upgrade"}
					</Button>
				</div>
			</header>

			<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
				<section className="rounded-2xl border border-primary/25 bg-primary/8 p-5 shadow-sm shadow-black/5">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
								{planName}
							</p>
							<h2 className="font-display mt-1 text-2xl font-bold text-foreground">
								{usageTitle}
							</h2>
						</div>
						<span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
							{planLoading ? "Verificando" : "Ativo"}
						</span>
					</div>
					<div className="mt-5 h-2 overflow-hidden rounded-full bg-background/70 ring-1 ring-border/60">
						<div
							className="h-full rounded-full bg-linear-to-r from-primary to-fuchsia-500 transition-all duration-500"
							style={{ width: `${usagePercent}%` }}
						/>
					</div>
					<p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
						{isPro
							? `Você já tem ${used} criações salvas e pode continuar criando sem limite.`
							: "Contabilizamos personagens, NPCs, sessões, itens, locais e lore para representar o uso total da campanha."}
					</p>
				</section>

				<section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
								Upgrade
							</p>
							<h2 className="font-display mt-1 text-xl font-bold text-foreground">
								{isPro ? "Benefícios liberados" : "Benefícios planejados"}
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
							{isPro ? "Assinatura Pro via Stripe" : "Sem cobrança ativa"}
						</h2>
						<p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
							{isPro
								? "Sua assinatura é gerenciada pelo Stripe. Use o portal para alterar forma de pagamento ou cancelar."
								: "Faça upgrade para o plano Pro e desbloqueie todo o potencial do seu grimório."}
						</p>
					</div>
					<Button
						variant="outline"
						className="h-10 gap-2"
						disabled={!isPro}
						onClick={() => {
							toast.info({
								title: "Portal Stripe",
								description: "O portal de gerenciamento da assinatura será integrado em breve.",
							});
						}}
					>
						Gerenciar assinatura
						<ArrowUpRight className="h-4 w-4" />
					</Button>
				</div>
			</section>
		</div>
	);
}
