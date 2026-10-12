import { App } from "@capacitor/app";
import { Download, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	APK_CHECK_INTERVAL_MS,
	APK_LATEST_JSON_URL,
	APK_SNOOZE_KEY,
	type ApkManifest,
	ApkUpdater,
	isAndroidApp,
	parseApkManifest,
	shouldOfferUpdate,
} from "@/lib/apk-update";

type Phase =
	| "idle"
	| "needs-permission"
	| "downloading"
	| "installing"
	| "error";

/** Aviso de nova versão do APK (só no app Android). Checa ao abrir, ao voltar pro app e a cada 6h. */
export function ApkUpdateBanner() {
	const [manifest, setManifest] = useState<ApkManifest | null>(null);
	const [phase, setPhase] = useState<Phase>("idle");
	const [percent, setPercent] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const lastCheck = useRef(0);

	const check = useCallback(async (force = false) => {
		if (!force && Date.now() - lastCheck.current < 60_000) return;
		lastCheck.current = Date.now();
		try {
			const [{ versionCode }, { body }] = await Promise.all([
				ApkUpdater.getInstalledVersion(),
				ApkUpdater.fetchManifest({ url: APK_LATEST_JSON_URL }),
			]);
			const m = parseApkManifest(body);
			const snoozed = Number(localStorage.getItem(APK_SNOOZE_KEY)) || null;
			setManifest(shouldOfferUpdate(versionCode, m, snoozed) ? m : null);
		} catch {
			// offline / release ainda não existe: silencioso
		}
	}, []);

	useEffect(() => {
		if (!isAndroidApp()) return;
		void check(true);
		const id = setInterval(() => void check(true), APK_CHECK_INTERVAL_MS);
		const subs = [
			App.addListener("appStateChange", (s) => {
				if (s.isActive) void check();
			}),
			ApkUpdater.addListener("progress", (p) => setPercent(p.percent)),
		];
		return () => {
			clearInterval(id);
			for (const s of subs) void s.then((h) => h.remove());
		};
	}, [check]);

	if (!manifest) return null;

	const later = () => {
		localStorage.setItem(APK_SNOOZE_KEY, String(manifest.versionCode));
		setManifest(null);
	};

	const update = async () => {
		setError(null);
		const { allowed } = await ApkUpdater.canInstall();
		if (!allowed) {
			setPhase("needs-permission");
			await ApkUpdater.openInstallSettings();
			return;
		}
		setPhase("downloading");
		setPercent(0);
		try {
			await ApkUpdater.downloadAndInstall({
				url: manifest.apkUrl,
				sha256: manifest.sha256,
			});
			setPhase("installing");
		} catch (e) {
			setPhase("error");
			setError(e instanceof Error ? e.message : "Falha no download.");
		}
	};

	const busy = phase === "downloading";
	const description =
		phase === "needs-permission"
			? "Permita “Instalar apps desconhecidos” para o Arkhiveon, volte e toque em Atualizar."
			: phase === "downloading"
				? `Baixando… ${percent}%`
				: phase === "installing"
					? "Confirme a instalação na tela do Android."
					: phase === "error"
						? (error ?? "Falha no download.")
						: `Versão ${manifest.versionName} pronta. Instala por cima, sem perder dados.`;

	return (
		<section
			aria-label="Atualização do app"
			aria-live="polite"
			className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg"
			style={{ marginBottom: "env(safe-area-inset-bottom)" }}
		>
			<Download
				className="mt-0.5 size-4 shrink-0 text-muted-foreground"
				aria-hidden
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">Nova versão disponível</p>
				<p
					className={
						phase === "error"
							? "text-xs text-destructive"
							: "text-xs text-muted-foreground"
					}
				>
					{description}
				</p>
				<div className="mt-2 flex gap-2">
					<Button size="sm" onClick={update} loading={busy} disabled={busy}>
						{phase === "error" ? "Tentar de novo" : "Atualizar"}
					</Button>
					<Button size="sm" variant="ghost" onClick={later} disabled={busy}>
						Depois
					</Button>
				</div>
			</div>
			<button
				type="button"
				aria-label="Fechar"
				onClick={later}
				disabled={busy}
				className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
			>
				<X className="size-4" />
			</button>
		</section>
	);
}
