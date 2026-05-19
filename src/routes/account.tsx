import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Mail, ShieldCheck, User, WandSparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/account")({
	component: AccountPage,
});

function AccountPage() {
	const { user, session } = useAuth();
	const characters = useRPGStore((state) => state.characters.length);
	const npcs = useRPGStore((state) => state.npcs.length);
	const sessions = useRPGStore((state) => state.sessions.length);
	const lores = useRPGStore((state) => state.lores.length);
	const metadataName = user?.user_metadata?.name;
	const userName =
		typeof metadataName === "string" && metadataName.trim()
			? metadataName
			: "Aventureiro";
	const userEmail = user?.email || "Sem e-mail cadastrado";
	const createdAt = user?.created_at
		? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
				new Date(user.created_at),
			)
		: "Conta local";
	const lastSignIn = user?.last_sign_in_at
		? new Intl.DateTimeFormat("pt-BR", {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(new Date(user.last_sign_in_at))
		: "Sem registro recente";

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5 sm:p-8">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative max-w-3xl">
					<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
						<User className="h-3.5 w-3.5" />
						Minha Conta
					</div>
					<h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						{userName}
					</h1>
					<p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
						Seu perfil de aventureiro, sessão atual e um resumo do arquivo
						conectado nesta campanha.
					</p>
				</div>
			</header>

			<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
				<section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
					<div className="flex items-center gap-4">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
							<User className="h-7 w-7" />
						</div>
						<div className="min-w-0">
							<p className="font-display truncate text-xl font-bold text-foreground">
								{userName}
							</p>
							<p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-muted-foreground">
								<Mail className="h-3.5 w-3.5" />
								{userEmail}
							</p>
						</div>
					</div>

					<div className="mt-5 grid gap-3">
						<InfoRow label="Conta criada" value={createdAt} />
						<InfoRow label="Último acesso" value={lastSignIn} />
						<InfoRow
							label="Sessão"
							value={session ? "Autenticada com Supabase" : "Modo local"}
						/>
					</div>
				</section>

				<section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
								Resumo
							</p>
							<h2 className="font-display mt-1 text-xl font-bold text-foreground">
								Seu arquivo em números
							</h2>
						</div>
						<WandSparkles className="h-5 w-5 text-primary" />
					</div>

					<div className="mt-5 grid gap-3 sm:grid-cols-2">
						<Metric label="Fichas no elenco" value={characters} />
						<Metric label="NPCs" value={npcs} />
						<Metric label="Sessões" value={sessions} />
						<Metric label="Registros de lore" value={lores} />
					</div>
				</section>
			</div>

			<section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
							Segurança
						</p>
						<h2 className="font-display mt-1 text-lg font-bold text-foreground">
							Dados protegidos no seu cofre
						</h2>
						<p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
							Quando o Supabase está conectado, suas criações são sincronizadas
							automaticamente entre sessões.
						</p>
					</div>
					<div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12px] font-bold text-emerald-300">
						<ShieldCheck className="h-4 w-4" />
						Proteção ativa
					</div>
				</div>
			</section>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-3">
			<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-[13px] font-semibold text-foreground">{value}</p>
		</div>
	);
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
			<BookOpen className="h-4 w-4 text-primary" />
			<p className="font-display mt-3 text-2xl font-bold text-foreground">
				{value}
			</p>
			<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</p>
		</div>
	);
}
