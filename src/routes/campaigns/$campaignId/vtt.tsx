import "@/components/vtt/vtt.css";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Compass, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { VTTAiChat } from "@/components/vtt/vtt-ai-chat";
import { VTTCanvas } from "@/components/vtt/vtt-canvas";
import { VTTCombatPanel } from "@/components/vtt/vtt-combat-panel";
import { VTTFeedPanel } from "@/components/vtt/vtt-feed-panel";
import { VTTFogControls } from "@/components/vtt/vtt-fog-controls";
import { VTTGridSettings } from "@/components/vtt/vtt-grid-settings";
import { VTTJournal } from "@/components/vtt/vtt-journal";
import type { VTTMapImage } from "@/components/vtt/vtt-map-dropzone";
import { VTTMoveHistoryPanel } from "@/components/vtt/vtt-move-history-panel";
import { VTTRosterDrawer } from "@/components/vtt/vtt-roster-drawer";
import { VTTRulerControls } from "@/components/vtt/vtt-ruler-controls";
import { VTTSceneBar } from "@/components/vtt/vtt-scene-bar";
import { VTTSheetDrawer } from "@/components/vtt/vtt-sheet-drawer";
import { VTTTemplateControls } from "@/components/vtt/vtt-template-controls";
import { VTTTokenMenu } from "@/components/vtt/vtt-token-menu";
import { VTTTokenStatusTooltip } from "@/components/vtt/vtt-token-status-tooltip";
import { VTTToolbar } from "@/components/vtt/vtt-toolbar";
import { VTTZoomControls } from "@/components/vtt/vtt-zoom-controls";
import { fetchMesaPilotEnabled } from "@/lib/ai-mesa/client";
import { canUseMesaAssistant } from "@/lib/ai-mesa/gate";
import { useAuth } from "@/lib/auth";
import type { Database, Json } from "@/lib/database.types";
import { useRPGStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { playPingAudio } from "@/lib/vtt/audio";
import {
	characterSheetOwnsHp,
	saveLinkedCharacterHp,
	selectSheetHealth,
	tokenHpInsert,
} from "@/lib/vtt/character-hp";
import { useCombatStore } from "@/lib/vtt/combat-store";
import { useMoveStore } from "@/lib/vtt/move-store";
import { subscribeMoves } from "@/lib/vtt/move-sync";
import {
	canControlVTTToken,
	tableRole,
	type VTTCharacterOwner,
} from "@/lib/vtt/permissions";
import {
	type PublishSceneRpc,
	publishScene,
} from "@/lib/vtt/persist-publication";
import { incomingPing } from "@/lib/vtt/ping-queue";
import { useRollStore } from "@/lib/vtt/roll-store";
import { applyRemoteRuler } from "@/lib/vtt/ruler-gesture";
import {
	isRepeatedCreate,
	newSceneId,
	singleFlight,
} from "@/lib/vtt/scene-create";
import { scenePatchFromDb, scenePatchToDb } from "@/lib/vtt/scene-persistence";
import {
	createSceneWriter,
	type SceneSaveClient,
} from "@/lib/vtt/scene-persistence-writer";
import { mapSceneRow, mapTokenRow } from "@/lib/vtt/scene-row";
import { createSceneSession } from "@/lib/vtt/scene-session";
import type { VTTSpellTemplate } from "@/lib/vtt/template-math";
import { acceptTemplateRemoval } from "@/lib/vtt/template-permissions";
import {
	buildTokenInsertPayload,
	insertVttToken,
	requirePlaceContext,
} from "@/lib/vtt/token-spawn";
import type {
	VTTAura,
	VTTFogPath,
	VTTGridScaleUnit,
	VTTGridType,
	VTTLayer,
	VTTPingEvent,
	VTTPresenceUser,
	VTTRemoteMeasurement,
	VTTRulerMeasurement,
	VTTScene,
	VTTSceneSettingsPatch,
	VTTToken,
} from "@/lib/vtt/types";
import { initialSceneViewport } from "@/lib/vtt/viewport";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { loadWalls } from "@/lib/vtt/wall-sync";

function readCampaignCharacters() {
	if (typeof useRPGStore.getState !== "function") return [];
	return useRPGStore.getState().characters;
}

export const Route = createFileRoute("/campaigns/$campaignId/vtt")({
	component: VTTPage,
});

function VTTPage() {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/vtt" });
	const { user } = useAuth();
	return <VTTSession key={`${campaignId}:${user?.id ?? "signed-out"}`} />;
}
function VTTSession() {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/vtt" });
	const { user } = useAuth();
	const campaigns = useRPGStore((state) => state.campaigns);
	const activeCampaign = campaigns.find((c) => c.id === campaignId);

	const scenes = useVTTStore((s) => s.scenes);
	const setScenes = useVTTStore((s) => s.setScenes);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const setActiveSceneId = useVTTStore((s) => s.setActiveSceneId);
	const addScene = useVTTStore((s) => s.addScene);
	const updateScene = useVTTStore((s) => s.updateScene);
	const tokens = useVTTStore((s) => s.tokens);
	const setTokens = useVTTStore((s) => s.setTokens);
	const addToken = useVTTStore((s) => s.addToken);
	const updateToken = useVTTStore((s) => s.updateToken);
	const setTokenTargetPosition = useVTTStore((s) => s.setTokenTargetPosition);
	const removeToken = useVTTStore((s) => s.removeToken);
	const activeTokenIdForMenu = useVTTStore((s) => s.activeTokenIdForMenu);
	const setOnlineUsers = useVTTStore((s) => s.setOnlineUsers);
	const setRemoteCursor = useVTTStore((s) => s.setRemoteCursor);
	const removeRemoteCursor = useVTTStore((s) => s.removeRemoteCursor);
	const setRemoteMeasurement = useVTTStore((s) => s.setRemoteMeasurement);
	const addPing = useVTTStore((s) => s.addPing);
	const userColor = useVTTStore((s) => s.userColor);
	const setFogPaths = useVTTStore((s) => s.setFogPaths);
	const addFogPath = useVTTStore((s) => s.addFogPath);
	const setFogState = useVTTStore((s) => s.setFogState);
	const clearFog = useVTTStore((s) => s.clearFog);
	const viewport = useVTTStore((s) => s.viewport);
	const setViewport = useVTTStore((s) => s.setViewport);
	const setIsGM = useVTTStore((s) => s.setIsGM);
	const setIsCoGM = useVTTStore((s) => s.setIsCoGM);
	const isGM = useVTTStore((s) => s.isGM);
	const isCoGM = useVTTStore((s) => s.isCoGM);
	const canManageTokens = useVTTStore((s) => s.isGM || s.isCoGM);
	const setRemoteTemplate = useVTTStore((s) => s.setRemoteTemplate);

	const [sceneSession] = useState(() =>
		createSceneSession({
			campaignId,
			userId: user?.id ?? "signed-out",
			sessionId: crypto.randomUUID(),
			onReadError: () =>
				setSceneDataError(
					"Não foi possível reler a geometria após a escala. Recarregue a cena para conferir.",
				),
			writeScene: (write) =>
				createSceneWriter(getSupabase() as unknown as SceneSaveClient | null)(
					write,
				),
			scaleScene: async (id, factor, { signal }) => {
				const client = getSupabase();
				if (!client)
					return { kind: "unknown", error: new Error("Sem conexão") };
				const { error } = await client
					.rpc("scale_scene_geometry", { p_scene_id: id, p_factor: factor })
					.abortSignal(signal);
				if (!error) return { kind: "confirmed" };
				return {
					kind: ["42501", "P0001", "23514", "22023"].includes(error.code)
						? "rejected"
						: "unknown",
					error,
				};
			},
			readGeometry: async (id) => {
				const client = getSupabase();
				if (!client) return null;
				const scene = await client
					.from("vtt_scenes")
					.select("*")
					.eq("campaign_id", campaignId)
					.eq("id", id)
					.maybeSingle();
				if (scene.error || !scene.data) return null;
				const [tokens, walls] = await Promise.all([
					client.from("vtt_tokens").select("*").eq("scene_id", id),
					client
						.from("vtt_walls")
						.select("id, scene_id, x1, y1, x2, y2")
						.eq("scene_id", id),
				]);
				if (tokens.error || walls.error || !tokens.data || !walls.data)
					return null;
				return {
					scene: mapSceneRow(scene.data),
					tokens: tokens.data.map(mapTokenRow),
					walls: walls.data.map((r) => ({
						id: r.id,
						sceneId: r.scene_id,
						x1: Number(r.x1),
						y1: Number(r.y1),
						x2: Number(r.x2),
						y2: Number(r.y2),
					})),
				};
			},
		}),
	);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [sceneDataError, setSceneDataError] = useState<string | null>(null);
	const [characterOwners, setCharacterOwners] = useState<VTTCharacterOwner[]>(
		[],
	);
	const [ownershipError, setOwnershipError] = useState<string | null>(null);
	const [ownershipLoading, setOwnershipLoading] = useState(false);
	const ownershipRequestRef = useRef(0);
	const sessionGenerationRef = useRef(0);
	useEffect(() => {
		const detach = sceneSession.mount();
		return () => {
			sessionGenerationRef.current += 1;
			detach();
		};
	}, [sceneSession]);
	const sceneRequestRef = useRef(0);
	const sceneCreateFlightRef = useRef(singleFlight<void>());
	const scenePublishFlightRef = useRef(singleFlight<void>());
	const tokenRequestRef = useRef(0);
	const tokenMutationRef = useRef(new Map<string, number>());
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isJournalOpen, setIsJournalOpen] = useState(false);
	const roomChannelRef = useRef<ReturnType<
		NonNullable<ReturnType<typeof getSupabase>>["channel"]
	> | null>(null);

	// Expose stores for dev & preview test tooling on localhost only (stripped on production domains)
	useEffect(() => {
		const isLocalhost =
			typeof window !== "undefined" &&
			(window.location.hostname === "localhost" ||
				window.location.hostname === "127.0.0.1");

		if ((import.meta.env.DEV || isLocalhost) && typeof window !== "undefined") {
			const win = window as unknown as {
				__vtt_store__?: typeof useVTTStore;
				__rpg_store__?: typeof useRPGStore;
				__combat_store__?: typeof useCombatStore;
				__roll_store__?: typeof useRollStore;
				__move_store__?: typeof useMoveStore;
			};
			win.__vtt_store__ = useVTTStore;
			win.__rpg_store__ = useRPGStore;
			win.__combat_store__ = useCombatStore;
			win.__roll_store__ = useRollStore;
			win.__move_store__ = useMoveStore;
		}
	}, []);

	// 1. Papel na mesa: mestre vê tudo; co-mestre vê como jogador, mas
	// gerencia tokens e fichas (ver tableRole).
	useEffect(() => {
		const role = tableRole(activeCampaign, user?.id);
		setIsGM(role.isGM);
		setIsCoGM(role.isCoGM);
	}, [activeCampaign, user, setIsGM, setIsCoGM]);

	// Assistente da mesa (piloto): só aparece se a campanha estiver na allowlist
	// `ia_mesa_pilot_campaigns` do Supabase. Fora dela: nenhuma UI.
	const canUsePilot = canUseMesaAssistant(activeCampaign, user?.id);
	const [iaMesaEnabled, setIaMesaEnabled] = useState(false);
	useEffect(() => {
		let cancelled = false;
		setIaMesaEnabled(false);
		if (!canUsePilot || !campaignId || !user) return;
		void fetchMesaPilotEnabled(campaignId).then((enabled) => {
			if (!cancelled) setIaMesaEnabled(enabled);
		});
		return () => {
			cancelled = true;
		};
	}, [campaignId, canUsePilot, user]);

	const fetchCharacterOwners = useCallback(async () => {
		const requestId = ++ownershipRequestRef.current;
		const client = getSupabase();
		if (!client || !user) return;
		setOwnershipLoading(true);
		setOwnershipError(null);
		try {
			const { data, error } = await client
				.from("characters")
				.select("id,user_id,created_by")
				.eq("campaign_id", campaignId);
			if (error) throw error;
			if (requestId !== ownershipRequestRef.current) return;
			setCharacterOwners(
				(data || []).map((row) => ({
					id: row.id,
					userId: row.user_id,
					createdBy: row.created_by,
				})),
			);
		} catch {
			if (requestId === ownershipRequestRef.current)
				setOwnershipError(
					"Não foi possível carregar as permissões das fichas. Alguns tokens podem ficar indisponíveis.",
				);
		} finally {
			if (requestId === ownershipRequestRef.current) setOwnershipLoading(false);
		}
	}, [campaignId, user]);
	useEffect(() => {
		setCharacterOwners([]);
		void fetchCharacterOwners();
		return () => {
			ownershipRequestRef.current += 1;
		};
	}, [fetchCharacterOwners]);

	// 2. Fetch scenes for this campaign from Supabase
	const fetchScenes = useCallback(async () => {
		const requestId = ++sceneRequestRef.current;
		const readGeneration = sceneSession.getReadGeneration();
		const client = getSupabase();
		setIsLoading(true);
		setLoadError(null);
		if (!client || !campaignId) {
			setLoadError("A conexão com a mesa não está configurada.");
			setIsLoading(false);
			return;
		}

		try {
			const { data, error } = await client
				.from("vtt_scenes")
				.select("*")
				.eq("campaign_id", campaignId)
				.order("order_index", { ascending: true })
				.order("created_at", { ascending: true });

			if (error) throw error;

			const mapped = (data || []).map(mapSceneRow);

			if (
				requestId !== sceneRequestRef.current ||
				!sceneSession.isReadCurrent(readGeneration)
			)
				return;
			setScenes(mapped.map(sceneSession.acceptRemote));

			// Automatically select active scene or first scene
			const active = mapped.find((s) => s.isActive);
			const owner =
				activeCampaign?.ownerId === user?.id ||
				activeCampaign?.myRole === "owner";
			setActiveSceneId(active?.id ?? (owner ? mapped[0]?.id : null) ?? null);
			const framed = initialSceneViewport(
				window.innerWidth,
				useVTTStore.getState().viewport,
			);
			if (framed) useVTTStore.getState().setViewport(framed);
		} catch (err) {
			if (requestId !== sceneRequestRef.current) return;
			console.error("Erro ao carregar cenas do VTT:", err);
			setLoadError(
				"Não foi possível carregar a mesa. Verifique sua conexão e tente novamente.",
			);
		} finally {
			if (requestId === sceneRequestRef.current) setIsLoading(false);
		}
	}, [
		campaignId,
		activeCampaign?.ownerId,
		activeCampaign?.myRole,
		user?.id,
		setScenes,
		setActiveSceneId,
		sceneSession,
	]);

	useEffect(() => {
		setScenes([]);
		setActiveSceneId(null);
		void fetchScenes();
		return () => {
			sceneRequestRef.current++;
		};
	}, [fetchScenes, setScenes, setActiveSceneId]);

	// 3. Fetch tokens whenever activeSceneId changes
	const fetchTokens = useCallback(
		async (sceneId: string) => {
			const requestId = ++tokenRequestRef.current;
			const readGeneration = sceneSession.getReadGeneration(sceneId);
			setSceneDataError(null);
			const client = getSupabase();
			if (!client || !sceneId) return;

			try {
				const { data, error } = await client
					.from("vtt_tokens")
					.select("*")
					.eq("scene_id", sceneId)
					.order("created_at", { ascending: true });

				if (error) throw error;

				const mappedTokens = (data || []).map(mapTokenRow);

				if (
					requestId === tokenRequestRef.current &&
					sceneSession.isReadCurrent(readGeneration, sceneId) &&
					useVTTStore.getState().activeSceneId === sceneId
				)
					setTokens(mappedTokens);
			} catch (err) {
				if (
					requestId === tokenRequestRef.current &&
					sceneSession.isReadCurrent(readGeneration, sceneId) &&
					useVTTStore.getState().activeSceneId === sceneId
				)
					setSceneDataError(
						"Não foi possível carregar os personagens desta cena. Tente novamente.",
					);
				console.error("Erro ao carregar tokens da cena:", err);
			}
		},
		[setTokens, sceneSession],
	);

	useEffect(() => {
		if (activeSceneId) {
			void fetchTokens(activeSceneId);
		}
		return () => {
			tokenRequestRef.current++;
		};
	}, [activeSceneId, fetchTokens]);

	// 3b. Paredes da cena: carrega para todos os participantes para colisão e visão
	useEffect(() => {
		if (activeSceneId) {
			const revision = sceneSession.getReadGeneration(activeSceneId);
			void loadWalls(activeSceneId, () =>
				sceneSession.isReadCurrent(revision, activeSceneId),
			);
		}
	}, [activeSceneId, sceneSession]);

	// 3c. Histórico de movimentos: só mestre e co-mestre carregam e assinam.
	const canSeeMoves = isGM || isCoGM;
	useEffect(() => {
		if (!activeSceneId || !canSeeMoves) return;
		const stop = subscribeMoves(activeSceneId);
		return () => {
			stop();
			useMoveStore.getState().focusMove(null);
		};
	}, [activeSceneId, canSeeMoves]);

	// 4. Realtime subscription on vtt_scenes for scene activation & live edits
	useEffect(() => {
		const client = getSupabase();
		if (!client || !campaignId) return;
		let cancelled = false;

		const channel = client
			.channel(`vtt-scenes-live:${campaignId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "vtt_scenes",
					filter: `campaign_id=eq.${campaignId}`,
				},
				(payload) => {
					if (cancelled) return;
					if (payload.eventType === "INSERT") {
						const row =
							payload.new as Database["public"]["Tables"]["vtt_scenes"]["Row"];
						addScene(
							sceneSession.acceptRemote({
								id: row.id,
								campaignId: row.campaign_id,
								name: row.name,
								mapImageUrl: row.map_image_url,
								gridType: row.grid_type as VTTGridType,
								gridSize: row.grid_size,
								gridColor: row.grid_color,
								gridOpacity: row.grid_opacity,
								gridScaleDistance: row.grid_scale_distance,
								gridScaleUnit: row.grid_scale_unit as VTTGridScaleUnit,
								gridOffsetX: row.grid_offset_x ?? 0,
								gridOffsetY: row.grid_offset_y ?? 0,
								mapScale: row.map_scale ?? 1,
								width: row.width,
								height: row.height,
								fogEnabled: row.fog_enabled,
								fogExploration: row.fog_exploration,
								isActive: row.is_active,
								orderIndex: row.order_index,
							}),
						);
					} else if (payload.eventType === "UPDATE") {
						const row =
							payload.new as Database["public"]["Tables"]["vtt_scenes"]["Row"];
						addScene(
							sceneSession.acceptRemote({
								id: row.id,
								campaignId: row.campaign_id,
								orderIndex: row.order_index,
								name: row.name,
								mapImageUrl: row.map_image_url,
								gridType: row.grid_type as VTTGridType,
								gridSize: row.grid_size,
								gridColor: row.grid_color,
								gridOpacity: row.grid_opacity,
								gridScaleDistance: row.grid_scale_distance,
								gridScaleUnit: row.grid_scale_unit as VTTGridScaleUnit,
								gridOffsetX: row.grid_offset_x ?? 0,
								gridOffsetY: row.grid_offset_y ?? 0,
								mapScale: row.map_scale ?? 1,
								width: row.width,
								height: row.height,
								fogEnabled: row.fog_enabled,
								fogExploration: row.fog_exploration,
								isActive: row.is_active,
							}),
						);

						if (!row.is_active && !isGM)
							useVTTStore.getState().removeScene(row.id);
					} else if (payload.eventType === "DELETE" && payload.old.id) {
						useVTTStore.getState().removeScene(payload.old.id);
					}
				},
			)
			.subscribe();

		return () => {
			cancelled = true;
			client.removeChannel(channel);
		};
	}, [campaignId, addScene, isGM, sceneSession]);

	// 5. Realtime subscription on vtt_tokens for live token positions & status
	useEffect(() => {
		const client = getSupabase();
		if (!client || !activeSceneId) return;
		let cancelled = false;

		const channel = client
			.channel(`vtt-tokens-live:${activeSceneId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "vtt_tokens",
					filter: `scene_id=eq.${activeSceneId}`,
				},
				(payload) => {
					if (
						cancelled ||
						useVTTStore.getState().activeSceneId !== activeSceneId
					)
						return;
					if (payload.eventType === "INSERT") {
						const row =
							payload.new as Database["public"]["Tables"]["vtt_tokens"]["Row"];
						addToken({
							id: row.id,
							sceneId: row.scene_id,
							characterId: row.character_id,
							npcId: row.npc_id,
							name: row.name,
							avatarUrl: row.avatar_url,
							layer: row.layer as VTTLayer,
							x: Number(row.x),
							y: Number(row.y),
							sizeCells: Number(row.size_cells),
							rotation: Number(row.rotation || 0),
							hpCurrent: row.hp_current,
							hpMax: row.hp_max,
							tempHp: row.temp_hp ?? 0,
							elevation: Number(row.elevation || 0),
							conditions: (row.conditions as unknown as string[]) || [],
							auras: (row.auras as unknown as VTTAura[]) || [],
							visionRange: Number(row.vision_range || 0),
							isLocked: row.is_locked,
							isHidden: row.is_hidden,
							controlledBy: (row.controlled_by as unknown as string[]) || [],
						});
					} else if (payload.eventType === "UPDATE") {
						const row =
							payload.new as Database["public"]["Tables"]["vtt_tokens"]["Row"];
						const isBeingDraggedLocally =
							useVTTStore.getState().draggedTokenId === row.id;

						if (isBeingDraggedLocally) {
							// Prevent position rubberbanding during active local drag
							updateToken(row.id, {
								sizeCells: Number(row.size_cells),
								rotation: Number(row.rotation || 0),
								hpCurrent: row.hp_current,
								hpMax: row.hp_max,
								tempHp: row.temp_hp ?? 0,
								elevation: Number(row.elevation || 0),
								conditions: (row.conditions as unknown as string[]) || [],
								auras: (row.auras as unknown as VTTAura[]) || [],
								visionRange: Number(row.vision_range || 0),
								isLocked: row.is_locked,
								isHidden: row.is_hidden,
								layer: row.layer as VTTLayer,
							});
						} else {
							updateToken(row.id, {
								x: Number(row.x),
								y: Number(row.y),
								sizeCells: Number(row.size_cells),
								rotation: Number(row.rotation || 0),
								hpCurrent: row.hp_current,
								hpMax: row.hp_max,
								tempHp: row.temp_hp ?? 0,
								elevation: Number(row.elevation || 0),
								conditions: (row.conditions as unknown as string[]) || [],
								auras: (row.auras as unknown as VTTAura[]) || [],
								visionRange: Number(row.vision_range || 0),
								isLocked: row.is_locked,
								isHidden: row.is_hidden,
								layer: row.layer as VTTLayer,
							});
						}
					} else if (payload.eventType === "DELETE") {
						const oldRow = payload.old as { id?: string };
						if (oldRow?.id) {
							removeToken(oldRow.id);
						}
					}
				},
			)
			.subscribe();

		// Fetch Fog of War state for active scene
		async function fetchFog() {
			if (!client || !activeSceneId) return;

			const { data, error } = await client
				.from("vtt_fog_states")
				.select("*")
				.eq("scene_id", activeSceneId)
				.maybeSingle();

			if (cancelled || useVTTStore.getState().activeSceneId !== activeSceneId)
				return;
			if (error) {
				setMutationError(
					"Não foi possível carregar a névoa da cena. Reabra a mesa para tentar novamente.",
				);
				return;
			}
			if (data) {
				setFogState({
					id: data.id,
					sceneId: data.scene_id,
					revealedPaths: (data.revealed_paths as unknown as VTTFogPath[]) || [],
				});
			} else {
				setFogState(null);
			}
		}
		void fetchFog();

		return () => {
			cancelled = true;
			client.removeChannel(channel);
		};
	}, [activeSceneId, addToken, updateToken, removeToken, setFogState]);

	// 5b. Realtime subscription on vtt_walls for live wall changes
	useEffect(() => {
		const client = getSupabase();
		if (!client || !activeSceneId) return;
		let cancelled = false;

		const channel = client
			.channel(`vtt-walls-live:${activeSceneId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "vtt_walls",
					filter: `scene_id=eq.${activeSceneId}`,
				},
				() => {
					if (
						cancelled ||
						useVTTStore.getState().activeSceneId !== activeSceneId
					)
						return;
					void loadWalls(activeSceneId);
				},
			)
			.subscribe();

		return () => {
			cancelled = true;
			void client.removeChannel(channel);
		};
	}, [activeSceneId]);

	const userColorRef = useRef(userColor);
	useEffect(() => {
		userColorRef.current = userColor;
	}, [userColor]);
	const templateRoleRef = useRef({
		ownerId: null as string | null,
		memberships: [] as { userId: string; role: string }[],
	});
	const selfRole =
		activeCampaign?.myRole === "owner" || activeCampaign?.myRole === "editor"
			? activeCampaign.myRole
			: activeCampaign?.ownerId === user?.id
				? "owner"
				: "player";
	templateRoleRef.current = {
		ownerId: activeCampaign?.ownerId ?? null,
		memberships: user?.id ? [{ userId: user.id, role: selfRole }] : [],
	};

	// 6. Supabase Realtime Broadcast & Presence Channel (60fps drag, cursors, pings, rulers, fog)
	useEffect(() => {
		const client = getSupabase();
		if (!client || !campaignId || !user || !activeSceneId) return;
		let cancelled = false;

		const currentUserName =
			user.user_metadata?.full_name ||
			user.email?.split("@")[0] ||
			"Aventureiro";

		const roomChannel = client.channel(
			`vtt-room:${campaignId}:${activeSceneId}`,
			{
				config: {
					presence: { key: user.id },
					broadcast: { self: false },
				},
			},
		);

		roomChannelRef.current = roomChannel;

		roomChannel
			.on("presence", { event: "sync" }, () => {
				if (cancelled) return;
				const state = roomChannel.presenceState();
				const users: VTTPresenceUser[] = [];
				for (const [key, presences] of Object.entries(state)) {
					const latest = presences[0] as
						| {
								userId?: string;
								userName?: string;
								avatarUrl?: string | null;
								color?: string;
								isGM?: boolean;
								isCoGM?: boolean;
								onlineAt?: number;
						  }
						| undefined;
					if (latest) {
						users.push({
							userId: latest.userId || key,
							userName: latest.userName || "Aventureiro",
							avatarUrl: latest.avatarUrl || null,
							color: latest.color || "#38bdf8",
							isGM: !!latest.isGM,
							isCoGM: !!latest.isCoGM,
							onlineAt: latest.onlineAt || Date.now(),
						});
					}
				}
				setOnlineUsers(users);
			})
			.on(
				"presence",
				{ event: "leave" },
				({ leftPresences }: { leftPresences: Array<{ userId?: string }> }) => {
					for (const p of leftPresences || []) {
						if (p.userId) {
							removeRemoteCursor(p.userId);
							const remote = useVTTStore.getState().remoteMeasurements;
							const next = applyRemoteRuler(remote, {
								type: "leave",
								userId: p.userId,
							});
							if (next !== remote) setRemoteMeasurement(p.userId, null);
						}
					}
				},
			)
			.on(
				"broadcast",
				{ event: "token_drag" },
				(payload: {
					payload: { tokenId?: string; x?: number; y?: number };
				}) => {
					if (
						cancelled ||
						useVTTStore.getState().activeSceneId !== activeSceneId
					)
						return;
					const data = payload.payload;
					if (data?.tokenId && data.x !== undefined && data.y !== undefined) {
						setTokenTargetPosition(data.tokenId, data.x, data.y);
					}
				},
			)
			.on(
				"broadcast",
				{ event: "cursor_move" },
				(payload: {
					payload: {
						userId?: string;
						userName?: string;
						color?: string;
						x?: number;
						y?: number;
					};
				}) => {
					if (
						cancelled ||
						useVTTStore.getState().activeSceneId !== activeSceneId
					)
						return;
					const data = payload.payload;
					if (data?.userId && data.x !== undefined && data.y !== undefined) {
						setRemoteCursor({
							userId: data.userId,
							userName: data.userName || "Jogador",
							color: data.color || "#38bdf8",
							x: data.x,
							y: data.y,
							timestamp: Date.now(),
						});
					}
				},
			)
			.on(
				"broadcast",
				{ event: "ruler_move" },
				(payload: {
					payload: {
						userId?: string;
						measurement?: VTTRemoteMeasurement | null;
					};
				}) => {
					if (
						cancelled ||
						useVTTStore.getState().activeSceneId !== activeSceneId
					)
						return;
					const data = payload.payload;
					if (data?.userId) {
						const measurement = data.measurement;
						const remote = useVTTStore.getState().remoteMeasurements;
						const normalized = measurement
							? {
									...measurement,
									userId: data.userId,
									userName: measurement.userName || "Jogador",
									color: measurement.color || "#38bdf8",
								}
							: null;
						const next = applyRemoteRuler(remote, {
							type: "broadcast",
							userId: data.userId,
							measurement: normalized,
						});
						if (next !== remote) {
							setRemoteMeasurement(data.userId, next[data.userId] ?? null);
						}
					}
				},
			)
			.on(
				"broadcast",
				{ event: "ping" },
				(payload: { payload: VTTPingEvent }) => {
					if (
						cancelled ||
						useVTTStore.getState().activeSceneId !== activeSceneId
					)
						return;
					const incoming = incomingPing(payload.payload);
					if (!incoming) return;
					const accepted = addPing(incoming);
					if (accepted) playPingAudio();
				},
			)
			.on(
				"broadcast",
				{ event: "fog_update" },
				(payload: { payload: { paths?: VTTFogPath[]; path?: VTTFogPath } }) => {
					if (
						cancelled ||
						useVTTStore.getState().activeSceneId !== activeSceneId
					)
						return;
					const data = payload.payload;
					if (data?.paths) {
						setFogPaths(data.paths);
					} else if (data?.path) {
						addFogPath(data.path);
					}
				},
			)
			.on(
				"broadcast",
				{ event: "template_move" },
				(payload: {
					payload: {
						userId?: string;
						template?: VTTSpellTemplate | null;
						sceneId?: string;
						placed?: boolean;
						removedIds?: string[];
					};
				}) => {
					const data = payload.payload;
					if (
						data?.userId &&
						data.sceneId === useVTTStore.getState().activeSceneId
					) {
						const store = useVTTStore.getState();
						if (data.removedIds) {
							const requested = Array.isArray(data.removedIds)
								? data.removedIds.filter(
										(id): id is string => typeof id === "string",
									)
								: [];
							const removed = acceptTemplateRemoval({
								templates: [
									...store.placedTemplates,
									...Object.values(store.remoteTemplates),
								],
								requestedIds: requested,
								senderUserId: data.userId,
								source: {
									campaignOwnerId: templateRoleRef.current.ownerId,
									memberships: templateRoleRef.current.memberships,
									presence: store.onlineUsers,
								},
							});
							if (removed.length > 0) store.removeTemplatesByIds(removed);
							store.setRemoteTemplatePreview(data.userId, null);
						} else if (data.placed && data.template) {
							setRemoteTemplate(data.userId, data.template);
							store.setRemoteTemplatePreview(data.userId, null);
						} else
							store.setRemoteTemplatePreview(
								data.userId,
								data.template || null,
							);
					}
				},
			)
			.subscribe(async (status: string) => {
				if (cancelled) return;
				if (status === "SUBSCRIBED") {
					await roomChannel.track({
						userId: user.id,
						userName: currentUserName,
						avatarUrl: user.user_metadata?.avatar_url || null,
						color: userColorRef.current,
						isGM,
						isCoGM,
						onlineAt: Date.now(),
					});
				}
			});

		return () => {
			cancelled = true;
			setOnlineUsers([]);
			client.removeChannel(roomChannel);
			roomChannelRef.current = null;
		};
	}, [
		campaignId,
		activeSceneId,
		user,
		isGM,
		isCoGM,
		setOnlineUsers,
		setTokenTargetPosition,
		setRemoteCursor,
		removeRemoteCursor,
		setRemoteMeasurement,
		addPing,
		addFogPath,
		setFogPaths,
		setRemoteTemplate,
	]);

	// Update user presence when color changes without tearing down the room channel
	useEffect(() => {
		if (!roomChannelRef.current || !user) return;
		const currentUserName =
			user.user_metadata?.full_name ||
			user.email?.split("@")[0] ||
			"Aventureiro";

		void roomChannelRef.current.track({
			userId: user.id,
			userName: currentUserName,
			avatarUrl: user.user_metadata?.avatar_url || null,
			color: userColor,
			isGM,
			isCoGM,
			onlineAt: Date.now(),
		});
	}, [userColor, user, isGM, isCoGM]);

	// Broadcast Helper Handlers
	const handleBroadcastDrag = useCallback(
		(tokenId: string, x: number, y: number) => {
			if (!roomChannelRef.current || !user) return;
			const token = useVTTStore.getState().tokens.find((t) => t.id === tokenId);
			if (
				!token ||
				!canControlVTTToken(token, user.id, canManageTokens, characterOwners)
			)
				return;
			roomChannelRef.current.send({
				type: "broadcast",
				event: "token_drag",
				payload: { tokenId, x, y, userId: user.id },
			});
		},
		[user, canManageTokens, characterOwners],
	);

	const handleBroadcastCursor = useCallback(
		(x: number, y: number) => {
			if (!roomChannelRef.current || !user) return;
			const userName =
				user.user_metadata?.full_name ||
				user.email?.split("@")[0] ||
				"Aventureiro";
			roomChannelRef.current.send({
				type: "broadcast",
				event: "cursor_move",
				payload: {
					userId: user.id,
					userName,
					color: userColor,
					x,
					y,
				},
			});
		},
		[user, userColor],
	);

	const handleBroadcastRuler = useCallback(
		(measurement: VTTRulerMeasurement | null) => {
			if (!roomChannelRef.current || !user) return;
			const userName =
				user.user_metadata?.full_name ||
				user.email?.split("@")[0] ||
				"Aventureiro";
			roomChannelRef.current.send({
				type: "broadcast",
				event: "ruler_move",
				payload: {
					userId: user.id,
					measurement: measurement
						? {
								...measurement,
								userId: user.id,
								userName,
								color: userColor,
							}
						: null,
				},
			});
		},
		[user, userColor],
	);

	const handleBroadcastPing = useCallback(
		(ping: VTTPingEvent) => {
			if (!roomChannelRef.current || !user) return;
			roomChannelRef.current.send({
				type: "broadcast",
				event: "ping",
				payload: ping,
			});
		},
		[user],
	);

	const handleBroadcastFog = useCallback((fogPath: VTTFogPath) => {
		if (!roomChannelRef.current) return;
		roomChannelRef.current.send({
			type: "broadcast",
			event: "fog_update",
			payload: { path: fogPath },
		});
	}, []);

	const broadcastTemplateRemoval = useCallback(
		(ids: string[]) => {
			if (!roomChannelRef.current || !user || ids.length === 0) return;
			roomChannelRef.current.send({
				type: "broadcast",
				event: "template_move",
				payload: {
					userId: user.id,
					sceneId: useVTTStore.getState().activeSceneId,
					removedIds: ids,
				},
			});
		},
		[user],
	);

	const handleBroadcastTemplate = useCallback(
		(template: VTTSpellTemplate | null, placed = false) => {
			if (!roomChannelRef.current || !user) return;
			roomChannelRef.current.send({
				type: "broadcast",
				event: "template_move",
				payload: {
					userId: user.id,
					sceneId: useVTTStore.getState().activeSceneId,
					template,
					placed,
				},
			});
		},
		[user],
	);

	const handlePersistFog = useCallback(
		async (paths: VTTFogPath[]) => {
			const client = getSupabase();
			if (!client || !activeSceneId) return;

			try {
				const { error } = await client.from("vtt_fog_states").upsert(
					{
						scene_id: activeSceneId,
						revealed_paths:
							paths as unknown as import("@/lib/database.types").Json,
						updated_at: new Date().toISOString(),
					},
					{ onConflict: "scene_id" },
				);
				if (error) throw error;
			} catch (err) {
				setMutationError(
					"A alteração da névoa não foi salva. Verifique a conexão e tente novamente.",
				);
				console.warn("Falha ao persistir estado da névoa no banco:", err);
			}
		},
		[activeSceneId],
	);

	const handleClearFog = useCallback(
		(mode: "all_hidden" | "all_revealed") => {
			clearFog(mode);
			const updatedPaths = useVTTStore.getState().fogPaths;
			if (roomChannelRef.current) {
				void roomChannelRef.current.send({
					type: "broadcast",
					event: "fog_update",
					payload: { paths: updatedPaths },
				});
			}
			void handlePersistFog(updatedPaths);
		},
		[clearFog, handlePersistFog],
	);

	// Focus camera on coordinate
	const handleFocusPoint = useCallback(
		(worldX: number, worldY: number) => {
			const screenCenterX = window.innerWidth / 2;
			const screenCenterY = window.innerHeight / 2;
			setViewport({
				x: screenCenterX - worldX * viewport.scale,
				y: screenCenterY - worldY * viewport.scale,
			});
		},
		[viewport.scale, setViewport],
	);

	// Scene Management Handlers
	// One create at a time, and each create carries its own id so a repeat of
	// the same create (network retry, retry after an error, double press) reads
	// the scene back instead of inserting a copy. See lib/vtt/scene-create.ts.
	const handleCreateScene = (sceneData: Partial<VTTScene>) =>
		sceneCreateFlightRef.current(() => createScene(sceneData));

	const createScene = async (sceneData: Partial<VTTScene>) => {
		const client = getSupabase();
		if (!client || !isGM)
			throw new Error(
				"É necessário estar conectado como mestre para criar uma cena.",
			);

		const sceneId = sceneData.id ?? newSceneId();
		const insertData: Database["public"]["Tables"]["vtt_scenes"]["Insert"] = {
			id: sceneId,
			campaign_id: campaignId,
			name: sceneData.name || "Nova Cena",
			map_image_url: sceneData.mapImageUrl || null,
			grid_type: sceneData.gridType || "square",
			grid_size: sceneData.gridSize || 70,
			grid_scale_distance: sceneData.gridScaleDistance || 1.5,
			grid_scale_unit: sceneData.gridScaleUnit || "m",
			width: sceneData.width || 4000,
			height: sceneData.height || 4000,
			is_active: sceneData.isActive ?? scenes.length === 0,
			order_index: scenes.length,
		};

		let { data, error } = await client
			.from("vtt_scenes")
			.insert(insertData)
			.select()
			.single();
		if (isRepeatedCreate(error)) {
			({ data, error } = await client
				.from("vtt_scenes")
				.select("*")
				.eq("campaign_id", campaignId)
				.eq("id", sceneId)
				.single());
		}

		if (error) {
			console.error("Erro ao criar cena:", error);
			throw new Error(
				"Não foi possível criar a cena. Seus dados foram mantidos; tente novamente.",
			);
		}

		if (data) {
			const newScene: VTTScene = {
				id: data.id,
				campaignId: data.campaign_id,
				name: data.name,
				mapImageUrl: data.map_image_url,
				gridType: data.grid_type as VTTGridType,
				gridSize: data.grid_size,
				gridColor: data.grid_color,
				gridOpacity: data.grid_opacity,
				gridScaleDistance: data.grid_scale_distance,
				gridScaleUnit: data.grid_scale_unit as VTTGridScaleUnit,
				gridOffsetX: data.grid_offset_x ?? 0,
				gridOffsetY: data.grid_offset_y ?? 0,
				mapScale: data.map_scale ?? 1,
				width: data.width,
				height: data.height,
				fogEnabled: data.fog_enabled,
				fogExploration: data.fog_exploration,
				isActive: data.is_active,
				orderIndex: data.order_index,
				createdAt: data.created_at,
				updatedAt: data.updated_at,
			};
			addScene(newScene);
			setActiveSceneId(newScene.id);
		}
	};

	const handleActivateScene = async (sceneId: string) => {
		const client = getSupabase();
		if (!client || !campaignId || !isGM)
			throw new Error("É necessário estar conectado como mestre.");

		// Single-flight no cliente; a exclusão mútua fica na RPC da 0053.
		await scenePublishFlightRef.current(async () => {
			const confirmed = await publishScene({
				sceneId,
				rpc: client.rpc.bind(client) as PublishSceneRpc,
				scenes: useVTTStore.getState().scenes,
				toast: showToast,
			});
			setScenes(confirmed);
		});
	};

	// Bug 06: the GM deletes a scene after confirming in the scene bar. RLS
	// ("GM can delete scenes") allows it; tokens and fog go with it (on delete
	// cascade). A delete that matched no row (e.g. refused by RLS) is an error.
	const handleDeleteScene = async (sceneId: string) => {
		if (!sceneSession.canDelete(sceneId))
			throw new Error(
				"Salve ou reconcilie os ajustes antes de excluir a cena.",
			);
		const client = getSupabase();
		if (!client || !campaignId || !isGM)
			throw new Error("É necessário estar conectado como mestre.");
		const { data, error } = await client
			.from("vtt_scenes")
			.delete()
			.eq("campaign_id", campaignId)
			.eq("id", sceneId)
			.select("id");
		if (error || !data?.length)
			throw new Error(
				"Não foi possível excluir a cena. Ela foi mantida na mesa.",
			);
		useVTTStore.getState().removeScene(sceneId);
	};

	const handleUpdateSceneSettings = (
		patch: VTTSceneSettingsPatch,
	): Promise<boolean> => {
		return activeSceneId
			? sceneSession.update(activeSceneId, patch)
			: Promise.resolve(false);
	};
	const handleScaleMap = (nextScale: number): Promise<boolean> =>
		activeSceneId
			? sceneSession.resize(activeSceneId, nextScale)
			: Promise.resolve(false);

	const handleUpdateScene = async (
		sceneId: string,
		updates: Partial<VTTScene>,
	) => {
		if (updates.isActive !== undefined) {
			showToast("error", {
				title: "Use Exibir aos jogadores para publicar a cena",
				description:
					"A edição genérica não altera a cena em jogo. A publicação acontece em uma única operação no servidor.",
			});
			throw new Error(
				"Use a publicação atômica: clique em Exibir aos jogadores.",
			);
		}
		if (!isGM || !campaignId) return false;
		const supervised = scenePatchFromDb(scenePatchToDb(updates));
		const metadata: Database["public"]["Tables"]["vtt_scenes"]["Update"] = {};
		if (updates.name !== undefined) metadata.name = updates.name;
		if (updates.mapImageUrl !== undefined)
			metadata.map_image_url = updates.mapImageUrl;
		if (updates.width !== undefined) metadata.width = updates.width;
		if (updates.height !== undefined) metadata.height = updates.height;
		if (
			Object.keys(supervised).length &&
			!(await sceneSession.update(sceneId, supervised))
		)
			return false;
		if (!Object.keys(metadata).length) return true;
		const client = getSupabase();
		if (!client) return false;
		const { data, error } = await client
			.from("vtt_scenes")
			.update(metadata)
			.eq("id", sceneId)
			.eq("campaign_id", campaignId)
			.select("id");
		if (error || !data?.length)
			throw new Error("Não foi possível salvar a cena.");
		if (!sceneSession.isLive()) return false;
		updateScene(sceneId, updates);
		return true;
	};

	// Fatia 1: map dropped in the table library. The scene keeps its old map
	// unless the database accepted the new one.
	const handleSetSceneMap = async (sceneId: string, map: VTTMapImage) => {
		const client = getSupabase();
		if (!client || !campaignId || !isGM)
			throw new Error(
				"É necessário estar conectado como mestre para trocar o mapa.",
			);
		const { data, error } = await client
			.from("vtt_scenes")
			.update({
				map_image_url: map.url,
				width: map.width,
				height: map.height,
			})
			.eq("campaign_id", campaignId)
			.eq("id", sceneId)
			.select("id");
		if (error || !data?.length)
			throw new Error(
				"Não foi possível aplicar o mapa. A cena foi mantida como estava.",
			);
		updateScene(sceneId, {
			mapImageUrl: map.url,
			width: map.width,
			height: map.height,
		});
	};

	const canEditToken = (tokenId: string) => {
		const token = useVTTStore.getState().tokens.find((t) => t.id === tokenId);
		return (
			token &&
			token.sceneId === activeSceneId &&
			canControlVTTToken(token, user?.id, canManageTokens, characterOwners)
		);
	};

	// Token Management Handlers
	const handleSpawnToken = async (tokenData: Partial<VTTToken>) => {
		const sessionGeneration = sessionGenerationRef.current;
		const { client, sceneId } = requirePlaceContext({
			client: getSupabase(),
			sceneId: activeSceneId,
			isGM,
		});

		const sheetCharacter = tokenData.characterId
			? readCampaignCharacters().find(
					(character) => character.id === tokenData.characterId,
				)
			: undefined;
		const hpColumns = tokenHpInsert({
			characterId: tokenData.characterId,
			sheetOwnsHp: characterSheetOwnsHp(sheetCharacter),
			hpCurrent: tokenData.hpCurrent,
			hpMax: tokenData.hpMax,
		});
		const insertPayload = buildTokenInsertPayload(
			sceneId,
			tokenData,
			hpColumns,
		);

		const data = await insertVttToken(
			(payload) => client.from("vtt_tokens").insert(payload).select().single(),
			insertPayload,
		);

		if (sessionGenerationRef.current === sessionGeneration) {
			addToken(mapTokenRow(data));
		}
	};

	const handleUpdateToken = async (
		tokenId: string,
		updates: Partial<VTTToken>,
	): Promise<boolean> => {
		if (!canEditToken(tokenId)) {
			setMutationError("Você não controla este token.");
			return false;
		}
		setMutationError(null);
		const sessionGeneration = sessionGenerationRef.current;
		const mutationId = (tokenMutationRef.current.get(tokenId) || 0) + 1;
		tokenMutationRef.current.set(tokenId, mutationId);

		const client = getSupabase();
		if (!client) return false;

		let pendingUpdates = updates;
		const touchesHp =
			updates.hpCurrent !== undefined || updates.hpMax !== undefined;
		if (touchesHp) {
			const token = useVTTStore.getState().tokens.find((t) => t.id === tokenId);
			const character = token?.characterId
				? readCampaignCharacters().find((item) => item.id === token.characterId)
				: undefined;
			if (token?.characterId && character && characterSheetOwnsHp(character)) {
				const current =
					updates.hpCurrent ??
					selectSheetHealth({ characters: [character] }, character.id) ??
					0;
				const saved = await saveLinkedCharacterHp({
					characterId: character.id,
					current,
					max: typeof updates.hpMax === "number" ? updates.hpMax : undefined,
					canEditMax: canManageTokens,
				});
				const rest = { ...updates };
				delete rest.hpCurrent;
				delete rest.hpMax;
				if (Object.keys(rest).length === 0) return saved;
				pendingUpdates = rest;
			}
		}

		const dbUpdates: Database["public"]["Tables"]["vtt_tokens"]["Update"] = {};
		if (pendingUpdates.x !== undefined) dbUpdates.x = pendingUpdates.x;
		if (pendingUpdates.y !== undefined) dbUpdates.y = pendingUpdates.y;
		if (pendingUpdates.sizeCells !== undefined)
			dbUpdates.size_cells = pendingUpdates.sizeCells;
		if (pendingUpdates.rotation !== undefined)
			dbUpdates.rotation = pendingUpdates.rotation;
		if (pendingUpdates.hpCurrent !== undefined)
			dbUpdates.hp_current = pendingUpdates.hpCurrent;
		if (pendingUpdates.hpMax !== undefined)
			dbUpdates.hp_max = pendingUpdates.hpMax;
		if (pendingUpdates.tempHp !== undefined)
			dbUpdates.temp_hp = pendingUpdates.tempHp;
		if (pendingUpdates.elevation !== undefined)
			dbUpdates.elevation = pendingUpdates.elevation;
		if (pendingUpdates.conditions !== undefined)
			dbUpdates.conditions = pendingUpdates.conditions as unknown as Json;
		if (pendingUpdates.auras !== undefined)
			dbUpdates.auras = pendingUpdates.auras as unknown as Json;
		if (pendingUpdates.isLocked !== undefined)
			dbUpdates.is_locked = pendingUpdates.isLocked;
		if (pendingUpdates.isHidden !== undefined)
			dbUpdates.is_hidden = pendingUpdates.isHidden;
		if (pendingUpdates.layer !== undefined)
			dbUpdates.layer = pendingUpdates.layer;

		try {
			let { data, error } = await client
				.from("vtt_tokens")
				.update(dbUpdates)
				.eq("id", tokenId)
				.select("id")
				.single();
			if (
				error &&
				(error.code === "42703" || error.message?.includes("temp_hp"))
			) {
				const fallbackUpdates = { ...dbUpdates };
				delete fallbackUpdates.temp_hp;
				if (Object.keys(fallbackUpdates).length > 0) {
					const retry = await client
						.from("vtt_tokens")
						.update(fallbackUpdates)
						.eq("id", tokenId)
						.select("id")
						.single();
					data = retry.data;
					error = retry.error;
				} else {
					error = null;
					data = { id: tokenId } as { id: string };
				}
			}
			if (error || !data) throw error || new Error("Token não atualizado");
			if (
				sessionGenerationRef.current === sessionGeneration &&
				tokenMutationRef.current.get(tokenId) === mutationId &&
				useVTTStore.getState().activeSceneId === activeSceneId
			) {
				// A completed write must not rewind a newer pointer gesture.
				const acceptedUpdates = { ...pendingUpdates };
				if (useVTTStore.getState().draggedTokenId === tokenId) {
					delete acceptedUpdates.x;
					delete acceptedUpdates.y;
				}
				updateToken(tokenId, acceptedUpdates);
			}
			return true;
		} catch {
			if (
				sessionGenerationRef.current !== sessionGeneration ||
				tokenMutationRef.current.get(tokenId) !== mutationId ||
				useVTTStore.getState().activeSceneId !== activeSceneId
			)
				// Uma gravação mais nova já manda neste token: nada a reverter aqui.
				return true;
			// Status tem toast próprio no menu (com reversão): sem o aviso do
			// rodapé para não avisar duas vezes.
			const onlyConditions = Object.keys(pendingUpdates).every(
				(k) => k === "conditions",
			);
			if (!onlyConditions)
				setMutationError(
					"Não foi possível salvar o token. Restaurando os dados do servidor.",
				);
			if (activeSceneId) await fetchTokens(activeSceneId);
			return false;
		}
	};

	const handleDeleteToken = async (tokenId: string): Promise<boolean> => {
		const sessionGeneration = sessionGenerationRef.current;
		if (!canEditToken(tokenId)) {
			setMutationError("Você não controla este token.");
			return false;
		}
		const client = getSupabase();
		if (!client) {
			setMutationError("Sem conexão para remover o token.");
			return false;
		}
		setMutationError(null);
		try {
			const { data, error } = await client
				.from("vtt_tokens")
				.delete()
				.eq("id", tokenId)
				.select("id");
			if (error || !data?.length)
				throw error || new Error("Token não removido");
			if (
				sessionGenerationRef.current === sessionGeneration &&
				useVTTStore.getState().activeSceneId === activeSceneId
			)
				removeToken(tokenId);
			return true;
		} catch {
			if (sessionGenerationRef.current !== sessionGeneration) return true;
			setMutationError(
				"Não foi possível remover o token. Ele foi mantido na mesa.",
			);
			return false;
		}
	};

	const currentActiveScene =
		scenes.find((s) => s.id === activeSceneId && s.campaignId === campaignId) ||
		null;
	const activeTokenForMenu =
		tokens.find(
			(t) =>
				t.id === activeTokenIdForMenu &&
				canControlVTTToken(t, user?.id, canManageTokens, characterOwners),
		) || null;

	return (
		<div className="vtt-surface relative h-dvh w-full overflow-clip bg-background text-foreground select-none">
			{/* Top Header / Scene Tabs & Presence */}
			<VTTSceneBar
				campaignId={campaignId}
				campaignName={activeCampaign?.name || "Campanha"}
				onCreateScene={handleCreateScene}
				onActivateScene={handleActivateScene}
				onDeleteScene={handleDeleteScene}
				onFocusPoint={handleFocusPoint}
				onOpenJournal={() => {
					useVTTStore.getState().setShowRosterDrawer(false);
					setIsJournalOpen(true);
				}}
			/>
			{isGM && (
				<VTTJournal
					campaignId={campaignId}
					open={isJournalOpen}
					onOpenChange={setIsJournalOpen}
				/>
			)}

			{(mutationError || sceneDataError || ownershipError) && (
				<div
					role="alert"
					className="absolute bottom-20 left-1/2 z-[60] flex flex-wrap w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-xl border border-destructive/50 bg-card p-3 shadow-lg"
				>
					<p className="min-w-40 flex-1 text-sm">
						{mutationError || sceneDataError || ownershipError}
					</p>
					{ownershipError && (
						<Button
							disabled={ownershipLoading}
							onClick={() => void fetchCharacterOwners()}
						>
							Recarregar permissões
						</Button>
					)}
					{sceneDataError && (
						<Button
							onClick={() => activeSceneId && void fetchTokens(activeSceneId)}
						>
							Tentar novamente
						</Button>
					)}
					{(mutationError || sceneDataError) && (
						<Button
							aria-label="Fechar aviso da mesa"
							variant="ghost"
							onClick={() => {
								setMutationError(null);
								setSceneDataError(null);
							}}
						>
							Fechar
						</Button>
					)}
				</div>
			)}
			{/* Left Floating Toolbar */}
			{currentActiveScene && (
				<>
					<VTTToolbar />
					<VTTCombatPanel />
					<VTTFeedPanel />
					<VTTMoveHistoryPanel onUpdateToken={handleUpdateToken} />
				</>
			)}

			{/* Fog of War Contextual Controls */}
			<VTTFogControls
				session={sceneSession}
				scene={currentActiveScene}
				onUpdateScene={handleUpdateScene}
				onClearFog={handleClearFog}
			/>

			<VTTRulerControls />

			<VTTTemplateControls
				onClearTemplates={broadcastTemplateRemoval}
				onRemoveTemplates={broadcastTemplateRemoval}
			/>

			{/* Grid Settings Popover */}
			<VTTGridSettings
				session={sceneSession}
				onUpdateSceneSettings={handleUpdateSceneSettings}
				onScaleMap={handleScaleMap}
			/>

			{/* Canvas Viewport */}
			{loadError ? (
				<div
					role="alert"
					className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
				>
					<Compass className="size-10 text-primary" />
					<h2 className="font-display text-xl font-bold">
						Não foi possível abrir a mesa
					</h2>
					<p className="max-w-sm text-sm text-muted-foreground">{loadError}</p>
					<Button onClick={() => void fetchScenes()}>Tentar novamente</Button>
				</div>
			) : currentActiveScene ? (
				<VTTCanvas
					characterOwners={characterOwners}
					scene={currentActiveScene}
					onUpdateToken={handleUpdateToken}
					onBroadcastDrag={handleBroadcastDrag}
					onBroadcastCursor={handleBroadcastCursor}
					onBroadcastRuler={handleBroadcastRuler}
					onBroadcastPing={handleBroadcastPing}
					onBroadcastFog={handleBroadcastFog}
					onBroadcastTemplate={handleBroadcastTemplate}
					onRemoveTemplates={broadcastTemplateRemoval}
					onPersistFog={handlePersistFog}
				/>
			) : !isLoading ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
					<div className="mb-4 rounded-2xl border border-border/70 bg-card-elevated p-4">
						<Compass className="h-8 w-8 text-primary" />
					</div>
					<h3 className="font-display text-xl font-bold text-foreground">
						{isGM ? "Nenhuma cena criada ainda" : "Aguardando a cena do mestre"}
					</h3>
					<p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
						{isGM
							? "Crie a primeira cena de combate ou exploração da mesa para carregar o mapa e posicionar os tokens."
							: "Aguardando o Mestre ativar uma cena para a sessão de hoje..."}
					</p>
					{isGM && (
						<Button
							type="button"
							onClick={() => {
								void handleCreateScene({ name: "Cena Inicial 1" }).catch(
									(error) => setLoadError(error.message),
								);
							}}
							className="h-11 gap-2 rounded-xl px-5 text-sm font-semibold"
						>
							<Sparkles className="h-4 w-4" />
							Criar primeira cena
						</Button>
					)}
				</div>
			) : (
				<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
					<Sparkles className="h-8 w-8 text-primary animate-spin" />
				</div>
			)}

			{/* Right Campaign Roster Drawer (Characters & Bestiary) */}
			<VTTRosterDrawer
				scene={currentActiveScene}
				onSpawnToken={handleSpawnToken}
				onFocusPoint={handleFocusPoint}
				onSetSceneMap={handleSetSceneMap}
				onRemoveToken={handleDeleteToken}
			/>

			<VTTSheetDrawer onUpdateToken={handleUpdateToken} />

			<VTTTokenStatusTooltip />

			{/* Token Contextual / Health & Status Edit Popover */}
			<VTTTokenMenu
				key={activeTokenForMenu?.id || "no-token"}
				token={activeTokenForMenu}
				onUpdateToken={handleUpdateToken}
				onDeleteToken={handleDeleteToken}
			/>

			{/* Bottom-Center Zoom & Distance HUD */}
			<VTTZoomControls />

			{/* Bottom-Right AI assistant (piloto: campanha em ia_mesa_pilot_campaigns + mestre/editor) */}
			{canUsePilot && iaMesaEnabled && (
				<VTTAiChat
					campaignId={campaignId}
					campaignName={activeCampaign?.name || "Campanha"}
					sceneName={currentActiveScene?.name}
				/>
			)}
		</div>
	);
}
