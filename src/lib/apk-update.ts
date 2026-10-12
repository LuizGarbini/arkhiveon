import {
	Capacitor,
	type PluginListenerHandle,
	registerPlugin,
} from "@capacitor/core";

/** Publicado pelo workflow build-apk.yml no release `apk-latest`. */
export const APK_LATEST_JSON_URL =
	"https://github.com/LuizGarbini/arkhiveon/releases/download/apk-latest/latest.json";

export const APK_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const APK_SNOOZE_KEY = "arkhiveon.apkUpdate.snoozedVersion";

export type ApkManifest = {
	versionCode: number;
	versionName: string;
	apkUrl: string;
	sha256?: string;
	releasedAt?: string;
};

interface ApkUpdaterPlugin {
	getInstalledVersion(): Promise<{ versionCode: number; versionName: string }>;
	fetchManifest(o: { url: string }): Promise<{ body: string }>;
	canInstall(): Promise<{ allowed: boolean }>;
	openInstallSettings(): Promise<void>;
	downloadAndInstall(o: { url: string; sha256?: string }): Promise<void>;
	addListener(
		e: "progress",
		cb: (p: { percent: number }) => void,
	): Promise<PluginListenerHandle>;
}

export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>("ApkUpdater");

export function isAndroidApp(): boolean {
	try {
		return Capacitor.getPlatform() === "android";
	} catch {
		return false;
	}
}

/** Valida o JSON publicado; retorna null se faltar algo essencial. */
export function parseApkManifest(raw: unknown): ApkManifest | null {
	let v: unknown = raw;
	if (typeof v === "string") {
		try {
			v = JSON.parse(v);
		} catch {
			return null;
		}
	}
	if (!v || typeof v !== "object") return null;
	const o = v as Record<string, unknown>;
	const code = Number(o.versionCode);
	if (!Number.isInteger(code) || code <= 0) return null;
	if (typeof o.apkUrl !== "string" || !o.apkUrl.startsWith("https://"))
		return null;
	return {
		versionCode: code,
		versionName:
			typeof o.versionName === "string" ? o.versionName : String(code),
		apkUrl: o.apkUrl,
		sha256:
			typeof o.sha256 === "string" && /^[a-f0-9]{64}$/i.test(o.sha256)
				? o.sha256.toLowerCase()
				: undefined,
		releasedAt: typeof o.releasedAt === "string" ? o.releasedAt : undefined,
	};
}

/** Mostrar aviso? Só se for maior que o instalado e não adiado pra essa mesma versão. */
export function shouldOfferUpdate(
	installedCode: number,
	manifest: ApkManifest | null,
	snoozedCode?: number | null,
): boolean {
	if (!manifest) return false;
	if (!(manifest.versionCode > installedCode)) return false;
	if (snoozedCode != null && snoozedCode >= manifest.versionCode) return false;
	return true;
}
