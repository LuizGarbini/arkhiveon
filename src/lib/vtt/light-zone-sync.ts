import { showToast } from "@/components/ui/toast";
import type { Json } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";
import {
	geometryFromPolygonDraft,
	geometryToJson,
	type LightZoneGeometry,
	MAX_ZONES_PER_SCENE,
	mapLightZoneRow,
	type VTTLightZone,
} from "./light-zones";
import type { LightLevel } from "./vision";
import { useVTTStore } from "./vtt-store";

/**
 * Áreas de luz: carregar (todos), criar, apagar e trocar a luz (só mestre) com
 * save otimista e reversão. Funções simples sobre a store (sem React), chamadas
 * pelo canvas e pelo painel.
 */

let loadRequest = 0;
// O que está sendo gravado agora: uma recarga que chegar no meio não pode apagar
// uma área recém-criada (ainda não está no banco) nem trazer de volta uma que o
// mestre acabou de apagar.
const pendingCreates = new Set<string>();
const pendingDeletes = new Set<string>();

/** A tabela ainda não existe (migração não aplicada). */
export function isMissingLightZonesTable(
	error: { code?: string; message?: string } | null | undefined,
): boolean {
	if (!error) return false;
	if (error.code === "42P01" || error.code === "PGRST205") return true;
	return (
		/vtt_light_zones/.test(error.message ?? "") &&
		/exist|schema cache/i.test(error.message ?? "")
	);
}

export async function loadLightZones(
	sceneId: string,
	isCurrent: () => boolean = () => true,
): Promise<void> {
	const requestId = ++loadRequest;
	const store = useVTTStore.getState();
	const client = getSupabase();
	if (!client) {
		store.setLightZonesStatus("error");
		return;
	}
	store.setLightZonesStatus("loading");
	const { data, error } = await client
		.from("vtt_light_zones")
		.select("id, scene_id, shape, level, geometry")
		.eq("scene_id", sceneId)
		.order("created_at", { ascending: true });
	const now = useVTTStore.getState();
	if (
		requestId !== loadRequest ||
		now.activeSceneId !== sceneId ||
		!isCurrent()
	)
		return;
	if (error) {
		now.setLightZones([]);
		now.setLightZonesStatus(
			isMissingLightZonesTable(error) ? "missing" : "error",
		);
		return;
	}
	const fromDb = (data ?? [])
		.map(mapLightZoneRow)
		.filter(
			(zone): zone is VTTLightZone =>
				zone !== null && !pendingDeletes.has(zone.id),
		);
	const known = new Set(fromDb.map((zone) => zone.id));
	const unsaved = now.lightZones.filter(
		(zone) => pendingCreates.has(zone.id) && !known.has(zone.id),
	);
	now.setLightZones([...fromDb, ...unsaved]);
	now.setLightZonesStatus("ready");
}

/** Só o `id` de um DELETE do Realtime. O resto do payload não é lido. */
function realtimeDeleteId(old: unknown): string | null {
	if (!old || typeof old !== "object" || !("id" in old)) return null;
	const id = (old as { id: unknown }).id;
	return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Tira a área `id` só se ela já está na cena atual.
 * Id ausente, desconhecido ou de outra cena devolve a mesma lista.
 */
export function lightZonesAfterRemoteDelete(
	zones: readonly VTTLightZone[],
	activeSceneId: string | null,
	id: string | null,
): readonly VTTLightZone[] {
	if (!id || !activeSceneId) return zones;
	if (!zones.some((zone) => zone.id === id && zone.sceneId === activeSceneId))
		return zones;
	return zones.filter(
		(zone) => !(zone.id === id && zone.sceneId === activeSceneId),
	);
}

/**
 * Aplica o DELETE que o Realtime entregou (só o id). Não grava, não recarrega
 * e não mexe na store se esse id não é uma área da cena atual.
 */
export function applyRemoteLightZoneDelete(id: string | null): boolean {
	const state = useVTTStore.getState();
	const next = lightZonesAfterRemoteDelete(
		state.lightZones,
		state.activeSceneId,
		id,
	);
	if (next === state.lightZones || !id) return false;
	useVTTStore.setState({
		lightZones: [...next],
		selectedLightZoneId:
			state.selectedLightZoneId === id ? null : state.selectedLightZoneId,
	});
	return true;
}

/**
 * Inscrição ao vivo das áreas de luz da cena. Mesma regra das paredes: o
 * DELETE do Realtime não passa num filtro de coluna, então ele entra sem
 * filtro e só remove um id que já está na cena aberta.
 */
export function subscribeLightZoneChanges(sceneId: string): () => void {
	const client = getSupabase();
	if (!client) return () => {};
	let stopped = false;
	let sawDrop = false;
	const isCurrent = () =>
		!stopped && useVTTStore.getState().activeSceneId === sceneId;
	const channel = client
		.channel(`vtt-light-zones-live:${sceneId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "vtt_light_zones",
				filter: `scene_id=eq.${sceneId}`,
			},
			(payload) => {
				if (!isCurrent() || payload.eventType === "DELETE") return;
				void loadLightZones(sceneId);
			},
		)
		.on(
			"postgres_changes",
			{ event: "DELETE", schema: "public", table: "vtt_light_zones" },
			(payload) => {
				if (!isCurrent()) return;
				applyRemoteLightZoneDelete(realtimeDeleteId(payload.old));
			},
		)
		.subscribe((status) => {
			if (stopped) return;
			if (status === "SUBSCRIBED") {
				if (!sawDrop) return;
				sawDrop = false;
				if (useVTTStore.getState().activeSceneId !== sceneId) return;
				void loadLightZones(sceneId);
				return;
			}
			if (
				status === "CHANNEL_ERROR" ||
				status === "TIMED_OUT" ||
				status === "CLOSED"
			)
				sawDrop = true;
		});
	return () => {
		stopped = true;
		void client.removeChannel(channel);
	};
}

const fail = (title: string) =>
	showToast("error", {
		title,
		description: "A mesa voltou ao que estava antes.",
	});

/** Cria uma área na cena ativa. Devolve o id, ou null se não foi possível. */
export async function createLightZone(
	geometry: LightZoneGeometry,
	level: LightLevel,
): Promise<string | null> {
	const store = useVTTStore.getState();
	const sceneId = store.activeSceneId;
	if (!sceneId) return null;
	if (store.lightZones.length >= MAX_ZONES_PER_SCENE) {
		showToast("error", {
			title: "Limite de áreas de luz",
			description: `Uma cena aceita até ${MAX_ZONES_PER_SCENE} áreas. Apague alguma para criar outra.`,
		});
		return null;
	}
	const id = crypto.randomUUID();
	const zone: VTTLightZone = { ...geometry, id, sceneId, level };
	pendingCreates.add(id);
	store.addLightZoneLocal(zone);
	let ok = false;
	try {
		const client = getSupabase();
		if (client) {
			const { error } = await client.from("vtt_light_zones").insert({
				id,
				scene_id: sceneId,
				shape: geometry.shape,
				level,
				geometry: geometryToJson(geometry) as Json,
			});
			ok = !error;
		}
	} catch {
		ok = false;
	}
	pendingCreates.delete(id);
	if (ok) return id;
	const now = useVTTStore.getState();
	if (now.activeSceneId === sceneId) now.removeLightZoneLocal(id);
	fail("Não foi possível salvar a área de luz");
	return null;
}

/** Apaga uma área. Se não gravar, ela volta onde estava. */
export async function deleteLightZone(id: string): Promise<boolean> {
	const store = useVTTStore.getState();
	const sceneId = store.activeSceneId;
	const index = store.lightZones.findIndex((zone) => zone.id === id);
	if (index < 0) return false;
	const zone = store.lightZones[index] as VTTLightZone;
	pendingDeletes.add(id);
	store.removeLightZoneLocal(id);
	let ok = false;
	try {
		const client = getSupabase();
		if (client) {
			const { error } = await client
				.from("vtt_light_zones")
				.delete()
				.eq("id", id);
			ok = !error;
		}
	} catch {
		ok = false;
	}
	pendingDeletes.delete(id);
	if (ok) return true;
	const now = useVTTStore.getState();
	if (now.activeSceneId === sceneId) {
		const restored = [...now.lightZones];
		restored.splice(Math.min(index, restored.length), 0, zone);
		now.setLightZones(restored);
		now.setSelectedLightZoneId(id);
	}
	fail("Não foi possível apagar a área de luz");
	return false;
}

/** Troca a luz de uma área já criada. Se não gravar, volta à luz anterior. */
export async function setLightZoneLevel(
	id: string,
	level: LightLevel,
): Promise<boolean> {
	const store = useVTTStore.getState();
	const sceneId = store.activeSceneId;
	const zone = store.lightZones.find((z) => z.id === id);
	if (!zone || zone.level === level) return true;
	const previous = zone.level;
	store.setLightZoneLevelLocal(id, level);
	let ok = false;
	try {
		const client = getSupabase();
		if (client) {
			const { error } = await client
				.from("vtt_light_zones")
				.update({ level })
				.eq("id", id);
			ok = !error;
		}
	} catch {
		ok = false;
	}
	if (ok) return true;
	const now = useVTTStore.getState();
	if (now.activeSceneId === sceneId) now.setLightZoneLevelLocal(id, previous);
	fail("Não foi possível trocar a luz da área");
	return false;
}

/**
 * Fecha o polígono em desenho: vira uma área com a luz escolhida e fica
 * selecionada. Sem 3 pontos ou sem área, descarta e explica.
 */
export async function finishLightDraft(): Promise<boolean> {
	const store = useVTTStore.getState();
	const draft = store.lightDraft;
	if (draft.length === 0) return false;
	const geometry = geometryFromPolygonDraft(draft);
	store.setLightDraft([]);
	if (!geometry) {
		showToast("error", {
			title: "A área precisa de 3 pontos que formem uma superfície",
			description: "Clique pelo menos três pontos fora de uma linha reta.",
		});
		return false;
	}
	const id = await createLightZone(geometry, store.lightDrawLevel);
	if (id) useVTTStore.getState().setSelectedLightZoneId(id);
	return id !== null;
}

/**
 * Teclado da ferramenta Luz (só mestre). Devolve true se tratou a tecla.
 *  - Enter fecha o polígono; Esc cancela o polígono (ou tira a seleção);
 *  - Backspace tira o último ponto; Delete/Backspace apagam a área selecionada.
 */
export function handleLightKey(e: KeyboardEvent): boolean {
	const s = useVTTStore.getState();
	if (!s.isGM || s.activeTool !== "light") return false;
	if (e.ctrlKey || e.metaKey || e.altKey) return false;
	const drawing = s.lightDraft.length > 0;
	if (e.key === "Enter") {
		if (!drawing) return false;
		void finishLightDraft();
		return true;
	}
	if (e.key === "Escape") {
		if (drawing) {
			s.setLightDraft([]);
			return true;
		}
		if (s.selectedLightZoneId) {
			s.setSelectedLightZoneId(null);
			return true;
		}
		return false;
	}
	if (e.key === "Backspace" && drawing) {
		s.setLightDraft(s.lightDraft.slice(0, -1));
		return true;
	}
	if ((e.key === "Delete" || e.key === "Backspace") && s.selectedLightZoneId) {
		void deleteLightZone(s.selectedLightZoneId);
		return true;
	}
	return false;
}
