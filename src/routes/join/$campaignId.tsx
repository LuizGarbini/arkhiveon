import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import { getSupabase, SUPABASE_TABLES } from "@/lib/supabase";

export const Route = createFileRoute("/join/$campaignId")({
	component: JoinCampaignPage,
});

function JoinCampaignPage() {
	const { campaignId } = Route.useParams();
	const { user, loading: authLoading } = useAuth();
	const navigate = useNavigate();
	const toast = useToast();

	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [campaignName, setCampaignName] = useState<string>("");

	useEffect(() => {
		if (authLoading) return;

		if (!user) {
			// Redirecionar para login mantendo o redirecionamento pós-login
			void navigate({
				to: "/auth",
				search: { mode: "login" },
				replace: true,
			});
			return;
		}

		const currentUserId = user.id;

		async function join() {
			const supabase = getSupabase();
			if (!supabase) {
				setStatus("error");
				setErrorMessage("Supabase não está configurado.");
				return;
			}

			try {
				// 1. Obter dados da campanha
				const { data: camp, error: fetchErr } = await supabase
					.from(SUPABASE_TABLES.campaigns)
					.select("id, name, world_id")
					.eq("id", campaignId)
					.maybeSingle();

				if (fetchErr || !camp) {
					setStatus("error");
					setErrorMessage("Campanha não encontrada ou link inválido.");
					return;
				}

				setCampaignName(camp.name || "Mesa de RPG");

				// 2. Registrar membro na tabela memberships
				const { error: memberErr } = await supabase
					.from(SUPABASE_TABLES.memberships)
					.upsert(
						{
							campaign_id: campaignId,
							user_id: currentUserId,
							role: "viewer",
						},
						{ onConflict: "campaign_id, user_id" },
					);

				if (memberErr) {
					console.warn("Erro ao vincular membro:", memberErr.message);
				}

				// 3. Atualizar store local e trocar contexto para a campanha
				await useRPGStore.getState().loadCampaigns();
				await useRPGStore.getState().switchCampaign(campaignId);

				setStatus("success");
				toast.success({
					title: "Você entrou na campanha! 🎉",
					description: `Bem-vindo à mesa "${camp.name}". Contexto trocado com sucesso.`,
				});

				// Redirecionar para o dashboard
				setTimeout(() => {
					void navigate({ to: "/dashboard", replace: true });
				}, 1200);
			} catch (err: any) {
				setStatus("error");
				setErrorMessage(err.message || "Não foi possível entrar na campanha.");
			}
		}

		void join();
	}, [authLoading, user, campaignId, navigate, toast]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
			<div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center shadow-xl">
				{status === "loading" && (
					<div className="flex flex-col items-center justify-center gap-3 py-6">
						<Loader2 className="h-10 w-10 animate-spin text-primary" />
						<h2 className="text-lg font-bold">Entrando na campanha...</h2>
						<p className="text-xs text-muted-foreground">
							Vinculando sua conta à mesa no Arkhiveon.
						</p>
					</div>
				)}

				{status === "success" && (
					<div className="flex flex-col items-center justify-center gap-3 py-6">
						<CheckCircle2 className="h-12 w-12 text-emerald-400" />
						<h2 className="text-lg font-bold">Tudo pronto!</h2>
						<p className="text-sm font-medium text-foreground">
							Você agora faz parte da campanha <strong>{campaignName}</strong>.
						</p>
						<span className="text-xs text-muted-foreground">
							Redirecionando para o Dashboard...
						</span>
					</div>
				)}

				{status === "error" && (
					<div className="flex flex-col items-center justify-center gap-3 py-4">
						<ShieldAlert className="h-12 w-12 text-rose-400" />
						<h2 className="text-lg font-bold text-rose-300">
							Não foi possível entrar
						</h2>
						<p className="text-xs text-muted-foreground">
							{errorMessage || "Ocorreu um erro ao processar o convite."}
						</p>
						<Button
							className="mt-4 w-full"
							onClick={() => void navigate({ to: "/dashboard", replace: true })}
						>
							Ir para o Dashboard
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
