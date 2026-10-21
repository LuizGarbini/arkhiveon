import "@/components/vtt/vtt.css";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Compass, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { VTTAiChat } from "@/components/vtt/vtt-ai-chat";
import { VTTCanvas } from "@/components/vtt/vtt-canvas";
import { VTTFogControls } from "@/components/vtt/vtt-fog-controls";
import { VTTGridSettings } from "@/components/vtt/vtt-grid-settings";
import { VTTJournal } from "@/components/vtt/vtt-journal";
import type { VTTMapImage } from "@/components/vtt/vtt-map-dropzone";
import { VTTRosterDrawer } from "@/components/vtt/vtt-roster-drawer";
import { VTTSceneBar } from "@/components/vtt/vtt-scene-bar";
import { VTTSheetDrawer } from "@/components/vtt/vtt-sheet-drawer";
import { VTTTemplateControls } from "@/components/vtt/vtt-template-controls";
import { VTTTokenMenu } from "@/components/vtt/vtt-token-menu";
import { VTTTokenStatusTooltip } from "@/components/vtt/vtt-token-status-tooltip";
import { VTTToolbar } from "@/components/vtt/vtt-toolbar";
import { VTTZoomControls } from "@/components/vtt/vtt-zoom-controls";
import { fetchMesaPilotEnabled } from "@/lib/ai-mesa/client";
import { useAuth } from "@/lib/auth";
import type { Database, Json } from "@/lib/database.types";
import { useRPGStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { playPingAudio } from "@/lib/vtt/audio";
import {
	canControlVTTToken,
	type VTTCharacterOwner,
} from "@/lib/vtt/permissions";
import {
	isRepeatedCreate,
	newSceneId,
	singleFlight,
} from "@/lib/vtt/scene-create";
import type { VTTSpellTemplate } from "@/lib/vtt/template-math";
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
	VTTToken,
} from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

export const Route = createFileRoute("/campaigns/$campaignId/vtt")({
	component: VTTPage,
});

function VTTPage() {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/vtt" });
	return <VTTSession key={campaignId} />;
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
	const isGM = useVTTStore((s) => s.isGM);
	const setRemoteTemplate = useVTTStore((s) => s.setRemoteTemplate);

	const [mutationError, setMutationError] = useState<string | null>(null);
	const [sceneDataError, setSceneDataError] = useState<string | null>(null);
	const [characterOwners, setCharacterOwners] = useState<VTTCharacterOwner[]>(
		[],
	);
	const [ownershipError, setOwnershipError] = useState<string | null>(null);
	const [ownershipLoading, setOwnershipLoading] = useState(false);
	const ownershipRequestRef = useRef(0);
	const sessionGenerationRef = useRef(0);
	useEffect(
		() => () => {
			sessionGenerationRef.current += 1;
		},
		[],
	);
	const sceneRequestRef = useRef(0);
	const sceneCreateFlightRef = useRef(singleFlight<void>());
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
			};
			win.__vtt_store__ = useVTTStore;
			win.__rpg_store__ = useRPGStore;
		}
	}, []);

	// 1. Determine GM vs Player permissions
	useEffect(() => {
		const isOwner = Boolean(
			activeCampaign &&
				user &&
				(activeCampaign.ownerId === user.id ||
					activeCampaign.myRole === "owner" ||
					activeCampaign.myRole === "editor"),
		);
		setIsGM(isOwner);
	}, [activeCampaign, user, setIsGM]);

	// Assistente da mesa (piloto): só aparece se a campanha estiver na allowlist
	// `ia_mesa_pilot_campaigns` do Supabase. Fora dela: nenhuma UI.
	const [iaMesaEnabled, setIaMesaEnabled] = useState(false);
	useEffect(() => {
		let cancelled = false;
		setIaMesaEnabled(false);
		if (!isGM || !campaignId || !user) return;
		void fetchMesaPilotEnabled(campaignId).then((enabled) => {
			if (!cancelled) setIaMesaEnabled(enabled);
		});
		return () => {
			cancelled = true;
		};
	}, [campaignId, isGM, user]);

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

			const mapped: VTTScene[] = (data || []).map((row) => ({
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
				width: row.width,
				height: row.height,
				fogEnabled: row.fog_enabled,
				fogExploration: row.fog_exploration,
				isActive: row.is_active,
				orderIndex: row.order_index,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			}));

			if (requestId !== sceneRequestRef.current) return;
			setScenes(mapped);

			// Automatically select active scene or first scene
			const active = mapped.find((s) => s.isActive);
			const owner =
				activeCampaign?.ownerId === user?.id ||
				activeCampaign?.myRole === "editor";
			setActiveSceneId(active?.id ?? (owner ? mapped[0]?.id : null) ?? null);
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

				const mappedTokens: VTTToken[] = (data || []).map((row) => ({
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
					elevation: Number(row.elevation || 0),
					conditions: (row.conditions as unknown as string[]) || [],
					auras: (row.auras as unknown as VTTAura[]) || [],
					visionRange: Number(row.vision_range || 0),
					isLocked: row.is_locked,
					isHidden: row.is_hidden,
					controlledBy: (row.controlled_by as unknown as string[]) || [],
					createdAt: row.created_at,
					updatedAt: row.updated_at,
				}));

				if (
					requestId === tokenRequestRef.current &&
					useVTTStore.getState().activeSceneId === sceneId
				)
					setTokens(mappedTokens);
			} catch (err) {
				if (
					requestId === tokenRequestRef.current &&
					useVTTStore.getState().activeSceneId === sceneId
				)
					setSceneDataError(
						"Não foi possível carregar os personagens desta cena. Tente novamente.",
					);
				console.error("Erro ao carregar tokens da cena:", err);
			}
		},
		[setTokens],
	);

	useEffect(() => {
		if (activeSceneId) {
			void fetchTokens(activeSceneId);
		}
		return () => {
			tokenRequestRef.current++;
		};
	}, [activeSceneId, fetchTokens]);

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
						addScene({
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
							width: row.width,
							height: row.height,
							fogEnabled: row.fog_enabled,
							fogExploration: row.fog_exploration,
							isActive: row.is_active,
							orderIndex: row.order_index,
						});
					} else if (payload.eventType === "UPDATE") {
						const row =
							payload.new as Database["public"]["Tables"]["vtt_scenes"]["Row"];
						addScene({
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
							width: row.width,
							height: row.height,
							fogEnabled: row.fog_enabled,
							fogExploration: row.fog_exploration,
							isActive: row.is_active,
						});

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
	}, [campaignId, addScene, isGM]);

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

	const userColorRef = useRef(userColor);
	useEffect(() => {
		userColorRef.current = userColor;
	}, [userColor]);

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
							setRemoteMeasurement(p.userId, null);
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
						setRemoteMeasurement(data.userId, data.measurement || null);
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
					const data = payload.payload;
					if (data) {
						addPing(data);
						playPingAudio();
					}
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
							store.removeRemoteTemplates(data.userId, data.removedIds);
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
			onlineAt: Date.now(),
		});
	}, [userColor, user, isGM]);

	// Broadcast Helper Handlers
	const handleBroadcastDrag = useCallback(
		(tokenId: string, x: number, y: number) => {
			if (!roomChannelRef.current || !user) return;
			const token = useVTTStore.getState().tokens.find((t) => t.id === tokenId);
			if (!token || !canControlVTTToken(token, user.id, isGM, characterOwners))
				return;
			roomChannelRef.current.send({
				type: "broadcast",
				event: "token_drag",
				payload: { tokenId, x, y, userId: user.id },
			});
		},
		[user, isGM, characterOwners],
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
			roomChannelRef.current.send({
				type: "broadcast",
				event: "ruler_move",
				payload: {
					userId: user.id,
					measurement,
				},
			});
		},
		[user],
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
		const previous = scenes.find((scene) => scene.isActive);
		const { error: clearError } = await client
			.from("vtt_scenes")
			.update({ is_active: false })
			.eq("campaign_id", campaignId);
		if (clearError)
			throw new Error(
				"Não foi possível trocar a cena dos jogadores. Tente novamente.",
			);
		const { error } = await client
			.from("vtt_scenes")
			.update({ is_active: true })
			.eq("campaign_id", campaignId)
			.eq("id", sceneId);
		if (error) {
			if (previous)
				await client
					.from("vtt_scenes")
					.update({ is_active: true })
					.eq("id", previous.id);
			await fetchScenes();
			throw new Error(
				"Não foi possível exibir a cena. Confira a cena em jogo e tente novamente.",
			);
		}
		setScenes(
			useVTTStore
				.getState()
				.scenes.map((scene) => ({ ...scene, isActive: scene.id === sceneId })),
		);
	};

	// Bug 06: the GM deletes a scene after confirming in the scene bar. RLS
	// ("GM can delete scenes") allows it; tokens and fog go with it (on delete
	// cascade). A delete that matched no row (e.g. refused by RLS) is an error.
	const handleDeleteScene = async (sceneId: string) => {
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

	const handleUpdateSceneSettings = async (settings: {
		gridType: VTTGridType;
		gridSize: number;
		gridColor: string;
		gridOpacity: number;
		gridScaleDistance: number;
		gridScaleUnit: VTTGridScaleUnit;
	}) => {
		if (!activeSceneId) return;

		updateScene(activeSceneId, settings);

		const client = getSupabase();
		if (!client) return;

		await client
			.from("vtt_scenes")
			.update({
				grid_type: settings.gridType,
				grid_size: settings.gridSize,
				grid_color: settings.gridColor,
				grid_opacity: settings.gridOpacity,
				grid_scale_distance: settings.gridScaleDistance,
				grid_scale_unit: settings.gridScaleUnit,
			})
			.eq("id", activeSceneId);
	};

	const handleUpdateScene = async (
		sceneId: string,
		updates: Partial<VTTScene>,
	) => {
		updateScene(sceneId, updates);

		const client = getSupabase();
		if (!client) return;

		const dbUpdates: Database["public"]["Tables"]["vtt_scenes"]["Update"] = {};
		if (updates.name !== undefined) dbUpdates.name = updates.name;
		if (updates.mapImageUrl !== undefined)
			dbUpdates.map_image_url = updates.mapImageUrl;
		if (updates.gridType !== undefined) dbUpdates.grid_type = updates.gridType;
		if (updates.gridSize !== undefined) dbUpdates.grid_size = updates.gridSize;
		if (updates.gridColor !== undefined)
			dbUpdates.grid_color = updates.gridColor;
		if (updates.gridOpacity !== undefined)
			dbUpdates.grid_opacity = updates.gridOpacity;
		if (updates.gridScaleDistance !== undefined)
			dbUpdates.grid_scale_distance = updates.gridScaleDistance;
		if (updates.gridScaleUnit !== undefined)
			dbUpdates.grid_scale_unit = updates.gridScaleUnit;
		if (updates.width !== undefined) dbUpdates.width = updates.width;
		if (updates.height !== undefined) dbUpdates.height = updates.height;
		if (updates.fogEnabled !== undefined)
			dbUpdates.fog_enabled = updates.fogEnabled;
		if (updates.fogExploration !== undefined)
			dbUpdates.fog_exploration = updates.fogExploration;
		if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

		await client.from("vtt_scenes").update(dbUpdates).eq("id", sceneId);
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
			canControlVTTToken(token, user?.id, isGM, characterOwners)
		);
	};

	// Token Management Handlers
	const handleSpawnToken = async (tokenData: Partial<VTTToken>) => {
		const sessionGeneration = sessionGenerationRef.current;
		const client = getSupabase();
		if (!client || !activeSceneId || !isGM)
			throw new Error(
				"É necessário estar conectado como mestre para colocar tokens.",
			);

		const insertPayload: Database["public"]["Tables"]["vtt_tokens"]["Insert"] =
			{
				scene_id: activeSceneId,
				character_id: tokenData.characterId || null,
				npc_id: tokenData.npcId || null,
				name: tokenData.name || "Token",
				avatar_url: tokenData.avatarUrl || null,
				layer: tokenData.layer || "token",
				x: tokenData.x || 0,
				y: tokenData.y || 0,
				size_cells: tokenData.sizeCells || 1.0,
				rotation: tokenData.rotation || 0,
				hp_current: tokenData.hpCurrent ?? 20,
				hp_max: tokenData.hpMax ?? 20,
				elevation: tokenData.elevation || 0,
				conditions: (tokenData.conditions || []) as unknown as Json,
				auras: (tokenData.auras || []) as unknown as Json,
				vision_range: tokenData.visionRange || 6,
				is_locked: tokenData.isLocked || false,
				is_hidden: tokenData.isHidden || false,
				controlled_by: (tokenData.controlledBy || []) as unknown as Json,
			};

		const { data, error } = await client
			.from("vtt_tokens")
			.insert(insertPayload)
			.select()
			.single();

		if (error) {
			console.error("Erro ao criar token:", error);
			throw new Error("Não foi possível colocar o token. Tente novamente.");
		}

		if (data && sessionGenerationRef.current === sessionGeneration) {
			const spawned: VTTToken = {
				id: data.id,
				sceneId: data.scene_id,
				characterId: data.character_id,
				npcId: data.npc_id,
				name: data.name,
				avatarUrl: data.avatar_url,
				layer: data.layer as VTTLayer,
				x: Number(data.x),
				y: Number(data.y),
				sizeCells: Number(data.size_cells),
				rotation: Number(data.rotation || 0),
				hpCurrent: data.hp_current,
				hpMax: data.hp_max,
				elevation: Number(data.elevation || 0),
				conditions: (data.conditions as unknown as string[]) || [],
				auras: (data.auras as unknown as VTTAura[]) || [],
				visionRange: Number(data.vision_range || 0),
				isLocked: data.is_locked,
				isHidden: data.is_hidden,
				controlledBy: (data.controlled_by as unknown as string[]) || [],
			};
			addToken(spawned);
		}
	};

	const handleUpdateToken = async (
		tokenId: string,
		updates: Partial<VTTToken>,
	) => {
		if (!canEditToken(tokenId)) {
			setMutationError("Você não controla este token.");
			return;
		}
		setMutationError(null);
		const sessionGeneration = sessionGenerationRef.current;
		const mutationId = (tokenMutationRef.current.get(tokenId) || 0) + 1;
		tokenMutationRef.current.set(tokenId, mutationId);

		const client = getSupabase();
		if (!client) return;

		const dbUpdates: Database["public"]["Tables"]["vtt_tokens"]["Update"] = {};
		if (updates.x !== undefined) dbUpdates.x = updates.x;
		if (updates.y !== undefined) dbUpdates.y = updates.y;
		if (updates.sizeCells !== undefined)
			dbUpdates.size_cells = updates.sizeCells;
		if (updates.rotation !== undefined) dbUpdates.rotation = updates.rotation;
		if (updates.hpCurrent !== undefined)
			dbUpdates.hp_current = updates.hpCurrent;
		if (updates.hpMax !== undefined) dbUpdates.hp_max = updates.hpMax;
		if (updates.elevation !== undefined)
			dbUpdates.elevation = updates.elevation;
		if (updates.conditions !== undefined)
			dbUpdates.conditions = updates.conditions as unknown as Json;
		if (updates.auras !== undefined)
			dbUpdates.auras = updates.auras as unknown as Json;
		if (updates.isLocked !== undefined) dbUpdates.is_locked = updates.isLocked;
		if (updates.isHidden !== undefined) dbUpdates.is_hidden = updates.isHidden;
		if (updates.layer !== undefined) dbUpdates.layer = updates.layer;

		try {
			const { data, error } = await client
				.from("vtt_tokens")
				.update(dbUpdates)
				.eq("id", tokenId)
				.select("id")
				.single();
			if (error || !data) throw error || new Error("Token não atualizado");
			if (
				sessionGenerationRef.current === sessionGeneration &&
				tokenMutationRef.current.get(tokenId) === mutationId &&
				useVTTStore.getState().activeSceneId === activeSceneId
			) {
				// A completed write must not rewind a newer pointer gesture.
				const acceptedUpdates = { ...updates };
				if (useVTTStore.getState().draggedTokenId === tokenId) {
					delete acceptedUpdates.x;
					delete acceptedUpdates.y;
				}
				updateToken(tokenId, acceptedUpdates);
			}
		} catch {
			if (
				sessionGenerationRef.current !== sessionGeneration ||
				tokenMutationRef.current.get(tokenId) !== mutationId ||
				useVTTStore.getState().activeSceneId !== activeSceneId
			)
				return;
			setMutationError(
				"Não foi possível salvar o token. Restaurando os dados do servidor.",
			);
			if (activeSceneId) await fetchTokens(activeSceneId);
		}
	};

	const handleDeleteToken = async (tokenId: string) => {
		const sessionGeneration = sessionGenerationRef.current;
		if (!canEditToken(tokenId)) {
			setMutationError("Você não controla este token.");
			return;
		}
		const client = getSupabase();
		if (!client) {
			setMutationError("Sem conexão para remover o token.");
			return;
		}
		setMutationError(null);
		try {
			const { data, error } = await client
				.from("vtt_tokens")
				.delete()
				.eq("id", tokenId)
				.select("id")
				.single();
			if (error || !data) throw error || new Error("Token não removido");
			if (
				sessionGenerationRef.current === sessionGeneration &&
				useVTTStore.getState().activeSceneId === activeSceneId
			)
				removeToken(tokenId);
		} catch {
			if (sessionGenerationRef.current !== sessionGeneration) return;
			setMutationError(
				"Não foi possível remover o token. Ele foi mantido na mesa.",
			);
		}
	};

	const currentActiveScene =
		scenes.find((s) => s.id === activeSceneId && s.campaignId === campaignId) ||
		null;
	const activeTokenForMenu =
		tokens.find(
			(t) =>
				t.id === activeTokenIdForMenu &&
				canControlVTTToken(t, user?.id, isGM, characterOwners),
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
			{currentActiveScene && <VTTToolbar />}

			{/* Fog of War Contextual Controls */}
			<VTTFogControls
				scene={currentActiveScene}
				onUpdateScene={handleUpdateScene}
				onClearFog={handleClearFog}
			/>

			<VTTTemplateControls
				onClearTemplates={(removedIds) => {
					if (user)
						roomChannelRef.current?.send({
							type: "broadcast",
							event: "template_move",
							payload: { userId: user.id, sceneId: activeSceneId, removedIds },
						});
				}}
			/>

			{/* Grid Settings Popover */}
			<VTTGridSettings onUpdateSceneSettings={handleUpdateSceneSettings} />

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
					onPersistFog={handlePersistFog}
				/>
			) : !isLoading ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
					<div className="p-4 rounded-3xl border border-border/70 bg-card-elevated backdrop-blur-md mb-4 shadow-2xl">
						<Compass className="h-10 w-10 text-primary animate-pulse" />
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
							className="gap-2 font-bold text-sm h-11 px-5 rounded-2xl shadow-lg shadow-primary/20"
						>
							<Sparkles className="h-4 w-4" />
							Criar Primeira Cena
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
			{isGM && iaMesaEnabled && (
				<VTTAiChat
					campaignId={campaignId}
					campaignName={activeCampaign?.name || "Campanha"}
					sceneName={currentActiveScene?.name}
				/>
			)}
		</div>
	);
}
