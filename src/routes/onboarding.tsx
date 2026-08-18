import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Globe2, LogOut, Swords } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { DashboardHeroBackground } from "@/components/dashboard-hero-background";
import { InviteBanner } from "@/components/invite-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { appOnboardingStep } from "@/lib/campaign-bootstrap";
import {
	normalizeOnboardingName,
	ONBOARDING_MAX_DESC_LENGTH,
	ONBOARDING_MAX_NAME_LENGTH,
	validateOnboardingName,
} from "@/lib/onboarding-validation";
import { useRPGStore } from "@/lib/store";
import { remoteErrorMessage } from "@/lib/store/helpers";
import { cn } from "@/lib/utils";
import { countOwnedWorlds } from "@/lib/worldbuilding/plan-limits";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});

function OnboardingPage() {
	const navigate = useNavigate();
	const toast = useToast();
	const { user, signOut } = useAuth();
	const worldNameId = useId();
	const campaignNameId = useId();
	const campaignDescId = useId();

	const worlds = useRPGStore((s) => s.worlds);
	const createWorld = useRPGStore((s) => s.createWorld);
	const createCampaign = useRPGStore((s) => s.createCampaign);
	const switchCampaign = useRPGStore((s) => s.switchCampaign);
	const loadRemoteData = useRPGStore((s) => s.loadRemoteData);
	const loadInvites = useRPGStore((s) => s.loadInvites);
	const clearLocalData = useRPGStore((s) => s.clearLocalData);

	const ownedWorldCount = useMemo(
		() => countOwnedWorlds(worlds, user?.id),
		[worlds, user?.id],
	);
	const step = appOnboardingStep({ ownedWorldCount });

	const [worldName, setWorldName] = useState("");
	const [campaignName, setCampaignName] = useState("");
	const [campaignDesc, setCampaignDesc] = useState("");
	const [submissionError, setSubmissionError] = useState<{
		message: string;
		step: "world" | "campaign";
	} | null>(null);
	const [busy, setBusy] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const error = submissionError?.step === step ? submissionError.message : null;
	const setError = (message: string | null) => {
		setSubmissionError(message ? { message, step } : null);
	};

	const ownedWorld = useMemo(
		() => worlds.find((w) => w.ownerUserId === user?.id) ?? null,
		[worlds, user?.id],
	);

	useEffect(() => {
		void loadInvites();
	}, [loadInvites]);

	const worldValid = !validateOnboardingName(worldName, "nome do Mundo");
	const campaignValid = !validateOnboardingName(
		campaignName,
		"nome da campanha",
	);

	async function handleCreateWorld(e: React.FormEvent) {
		e.preventDefault();
		if (busy) return;

		const validationError = validateOnboardingName(worldName, "nome do Mundo");
		if (validationError) {
			setError(validationError);
			return;
		}
		// Já tem Mundo (ex.: refresh no meio do fluxo) — só avança pelo estado.
		if (ownedWorldCount > 0) return;

		setError(null);
		setBusy(true);
		try {
			await createWorld(normalizeOnboardingName(worldName));
		} catch (err) {
			setError(remoteErrorMessage(err) || "Erro ao criar o Mundo.");
		} finally {
			setBusy(false);
		}
	}

	async function handleCreateCampaign(e: React.FormEvent) {
		e.preventDefault();
		if (busy) return;

		const validationError = validateOnboardingName(
			campaignName,
			"nome da campanha",
		);
		if (validationError) {
			setError(validationError);
			return;
		}

		const worldId = ownedWorld?.id;
		if (!worldId) {
			setError("Crie um Mundo antes da campanha.");
			return;
		}

		const description = campaignDesc
			.trim()
			.slice(0, ONBOARDING_MAX_DESC_LENGTH);
		setError(null);
		setBusy(true);
		try {
			const created = await createCampaign(
				normalizeOnboardingName(campaignName),
				description,
				{ worldId },
			);
			await switchCampaign(created.id);
			await loadRemoteData();
			toast.success({
				title: "Tudo pronto!",
				description: `"${created.name}" está no ar em ${ownedWorld.name}. Bom jogo!`,
			});
			void navigate({ to: "/dashboard", replace: true });
		} catch (err) {
			setError(remoteErrorMessage(err) || "Erro ao criar a campanha.");
		} finally {
			setBusy(false);
		}
	}

	async function handleSignOut() {
		if (isSigningOut || busy) return;
		setIsSigningOut(true);
		const signOutError = await signOut();
		setIsSigningOut(false);

		if (signOutError) {
			toast.error({
				title: "Não foi possível sair",
				description: signOutError,
			});
			return;
		}

		clearLocalData();
		toast.success({
			title: "Sessão encerrada",
			description: "Entre de novo com a conta certa quando quiser.",
		});
		void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
	}

	return (
		<div className="relative flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto bg-dashboard-deep text-white">
			<div className="absolute inset-0">
				<DashboardHeroBackground />
			</div>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/35 via-transparent to-black/55"
			/>

			<div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
				<div className="space-y-3 text-center">
					<p className="font-display text-[12px] font-bold tracking-[0.28em] text-white/70 sm:text-[13px]">
						ARKHIVEON
					</p>
					<h1 className="font-display text-[clamp(1.85rem,7vw,3.25rem)] font-black leading-[0.95] tracking-tight">
						{step === "world"
							? "Comece pelo seu Mundo"
							: "Agora, a primeira mesa"}
					</h1>
					<p className="mx-auto max-w-md text-[14px] leading-relaxed text-white/65 sm:text-[15px]">
						{step === "world"
							? "O Mundo é a ambientação compartilhada: grimório, facções e mural. As campanhas vivem dentro dele."
							: `Crie a campanha que vai rodar em ${ownedWorld?.name ?? "seu Mundo"}. Você pode adicionar outras mesas depois.`}
					</p>
				</div>

				<div className="flex items-center justify-center gap-2" aria-hidden>
					<StepDot
						active={step === "world"}
						label="1"
						done={step === "campaign"}
					/>
					<div className="h-px w-8 bg-white/20" />
					<StepDot active={step === "campaign"} label="2" />
				</div>

				<div className="rounded-3xl border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8">
					<div className="space-y-5">
						<InviteBanner />

						{step === "world" ? (
							<form
								onSubmit={handleCreateWorld}
								className="flex flex-col gap-5"
								noValidate
							>
								<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] text-white/70">
									<Globe2 className="h-4 w-4 shrink-0 text-violet-300" />
									Passo 1 de 2 — Nomeie a ambientação
								</div>
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor={worldNameId}
										className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55"
									>
										Nome do Mundo
									</label>
									<Input
										id={worldNameId}
										required
										autoFocus
										maxLength={ONBOARDING_MAX_NAME_LENGTH}
										placeholder="Ex: Faerûn, Reinos Esquecidos..."
										value={worldName}
										onChange={(e) => {
											setWorldName(e.target.value);
											if (error) setError(null);
										}}
										disabled={busy}
										aria-invalid={Boolean(error)}
										className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/35"
									/>
								</div>
								{error && (
									<p
										role="alert"
										className="text-[12px] font-medium text-rose-300"
									>
										{error}
									</p>
								)}
								<Button
									type="submit"
									loading={busy}
									loadingText="Criando Mundo..."
									disabled={!worldValid || busy}
									className="h-11 gap-2"
								>
									Continuar
									<ArrowRight className="h-4 w-4" />
								</Button>
							</form>
						) : (
							<form
								onSubmit={handleCreateCampaign}
								className="flex flex-col gap-5"
								noValidate
							>
								<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] text-white/70">
									<Swords className="h-4 w-4 shrink-0 text-amber-300" />
									Passo 2 de 2 — Crie a campanha
								</div>
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor={campaignNameId}
										className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55"
									>
										Nome da campanha
									</label>
									<Input
										id={campaignNameId}
										required
										autoFocus
										maxLength={ONBOARDING_MAX_NAME_LENGTH}
										placeholder="Ex: A Lenda de Baldur's Gate"
										value={campaignName}
										onChange={(e) => {
											setCampaignName(e.target.value);
											if (error) setError(null);
										}}
										disabled={busy}
										aria-invalid={Boolean(error)}
										className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/35"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor={campaignDescId}
										className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55"
									>
										Descrição (opcional)
									</label>
									<Textarea
										id={campaignDescId}
										rows={3}
										maxLength={ONBOARDING_MAX_DESC_LENGTH}
										placeholder="Tom, região, gancho da mesa..."
										value={campaignDesc}
										onChange={(e) => setCampaignDesc(e.target.value)}
										disabled={busy}
										className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
									/>
								</div>
								{error && (
									<p
										role="alert"
										className="text-[12px] font-medium text-rose-300"
									>
										{error}
									</p>
								)}
								<Button
									type="submit"
									loading={busy}
									loadingText="Criando campanha..."
									disabled={!campaignValid || busy || !ownedWorld}
									className="h-11 gap-2"
								>
									Entrar no Arkhiveon
									<ArrowRight className="h-4 w-4" />
								</Button>
							</form>
						)}
					</div>
				</div>

				<div className="flex flex-col items-center gap-2 text-center">
					{user?.email ? (
						<p className="max-w-sm truncate text-[12px] text-white/45">
							Conectado como <span className="text-white/70">{user.email}</span>
						</p>
					) : null}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						loading={isSigningOut}
						loadingText="Saindo..."
						disabled={busy || isSigningOut}
						onClick={() => void handleSignOut()}
						className="h-9 gap-2 text-white/60 hover:bg-white/10 hover:text-white"
					>
						<LogOut className="h-3.5 w-3.5" />
						Sair desta conta
					</Button>
				</div>
			</div>
		</div>
	);
}

function StepDot({
	active,
	done,
	label,
}: {
	active: boolean;
	done?: boolean;
	label: string;
}) {
	return (
		<span
			className={cn(
				"flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-bold transition-colors",
				active || done
					? "border-primary bg-primary text-primary-foreground"
					: "border-white/20 bg-white/5 text-white/45",
			)}
			aria-current={active ? "step" : undefined}
		>
			{label}
		</span>
	);
}
