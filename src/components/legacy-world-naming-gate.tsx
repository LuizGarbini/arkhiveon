import { Globe2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { DashboardHeroBackground } from "@/components/dashboard-hero-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import {
	isDefaultWorldName,
	needsLegacyWorldNaming,
} from "@/lib/legacy-world-naming";
import {
	normalizeOnboardingName,
	ONBOARDING_MAX_NAME_LENGTH,
	validateOnboardingName,
} from "@/lib/onboarding-validation";
import { useRPGStore } from "@/lib/store";

/**
 * Contas antigas pulam o onboarding (já têm campanha), mas ainda podem
 * estar com "Mundo Padrão". Este gate pede um nome de verdade uma vez.
 */
export function LegacyWorldNamingGate() {
	const { user } = useAuth();
	const toast = useToast();
	const nameId = useId();
	const hasLoadedCampaigns = useRPGStore((s) => s.hasLoadedCampaigns);
	const campaigns = useRPGStore((s) => s.campaigns);
	const worlds = useRPGStore((s) => s.worlds);
	const updateWorld = useRPGStore((s) => s.updateWorld);

	const ownedWorlds = useMemo(
		() => worlds.filter((w) => w.ownerUserId === user?.id),
		[worlds, user?.id],
	);

	const gate = needsLegacyWorldNaming({
		hasLoadedCampaigns,
		campaignCount: campaigns.length,
		ownedWorlds: ownedWorlds.map((w) => ({ id: w.id, name: w.name })),
	});

	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (gate.worldName) setName("");
	}, [gate.worldId, gate.worldName]);

	if (!gate.needed || !gate.worldId) return null;

	const worldId = gate.worldId;
	const valid = !validateOnboardingName(name, "nome do Mundo");

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (busy) return;

		const validationError = validateOnboardingName(name, "nome do Mundo");
		if (validationError) {
			setError(validationError);
			return;
		}

		const next = normalizeOnboardingName(name);
		if (isDefaultWorldName(next)) {
			setError('Escolha um nome diferente de "Mundo Padrão".');
			return;
		}

		setError(null);
		setBusy(true);
		try {
			updateWorld(worldId, { name: next });
			toast.success({
				title: "Mundo atualizado!",
				description: `Agora ele se chama "${next}". Você pode mudar de novo em Visão geral do Mundo.`,
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Não foi possível salvar o nome.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-dashboard-deep px-4 py-8 text-white">
			<div className="absolute inset-0">
				<DashboardHeroBackground />
			</div>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/60"
			/>

			<div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-6">
				<div className="space-y-3 text-center">
					<p className="font-display text-[12px] font-bold tracking-[0.28em] text-white/70 sm:text-[13px]">
						ARKHIVEON
					</p>
					<h1 className="font-display text-[clamp(1.85rem,7vw,3rem)] font-black leading-[0.95] tracking-tight">
						Dê um nome ao seu Mundo
					</h1>
					<p className="mx-auto max-w-md text-[14px] leading-relaxed text-white/65 sm:text-[15px]">
						Agora o Arkhiveon organiza tudo em <strong>Mundos</strong> — a
						ambientação onde ficam NPCs, facções, lore e o mural. O seu ainda se
						chama “Mundo Padrão”. Escolha um nome que combine com a sua mesa.
					</p>
				</div>

				<form
					onSubmit={handleSubmit}
					noValidate
					className="rounded-3xl border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8 space-y-5"
				>
					<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] text-white/70">
						<Globe2 className="h-4 w-4 shrink-0 text-violet-300" />
						Só uma vez — leva menos de um minuto
					</div>

					<div className="flex flex-col gap-1.5">
						<label
							htmlFor={nameId}
							className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55"
						>
							Novo nome do Mundo
						</label>
						<Input
							id={nameId}
							required
							autoFocus
							maxLength={ONBOARDING_MAX_NAME_LENGTH}
							placeholder="Ex: Faerûn, Costa da Espada..."
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								if (error) setError(null);
							}}
							disabled={busy}
							aria-invalid={Boolean(error)}
							className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/35"
						/>
					</div>

					{error && (
						<p role="alert" className="text-[12px] font-medium text-rose-300">
							{error}
						</p>
					)}

					<Button
						type="submit"
						loading={busy}
						loadingText="Salvando..."
						disabled={!valid || busy}
						className="h-11 w-full"
					>
						Salvar e continuar
					</Button>

					<p className="text-center text-[11px] text-white/45">
						Depois você pode mudar o nome de novo em Visão geral do Mundo.
					</p>
				</form>
			</div>
		</div>
	);
}
