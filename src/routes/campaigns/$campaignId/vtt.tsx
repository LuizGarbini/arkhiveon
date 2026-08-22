import { createFileRoute, useParams } from "@tanstack/react-router";
import { Compass, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { VTTCanvas } from "@/components/vtt/vtt-canvas";
import { VTTFogControls } from "@/components/vtt/vtt-fog-controls";
import { VTTGridSettings } from "@/components/vtt/vtt-grid-settings";
import { VTTRosterDrawer } from "@/components/vtt/vtt-roster-drawer";
import { VTTSceneBar } from "@/components/vtt/vtt-scene-bar";
import { VTTTokenMenu } from "@/components/vtt/vtt-token-menu";
import { VTTToolbar } from "@/components/vtt/vtt-toolbar";
import { VTTZoomControls } from "@/components/vtt/vtt-zoom-controls";
import { useAuth } from "@/lib/auth";
import type { Database, Json } from "@/lib/database.types";
import { useRPGStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { playPingAudio } from "@/lib/vtt/audio";
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
	const { user } = useAuth();
	const campaigns = useRPGStore((state) => state.campaigns);
	const activeCampaign = campaigns.find((c) => c.id === campaignId);

	const {
		scenes,
		setScenes,
		activeSceneId,
		setActiveSceneId,
		addScene,
		updateScene,
		tokens,
		setTokens,
		addToken,
		updateToken,
		setTokenTargetPosition,
		removeToken,
		activeTokenIdForMenu,
		setOnlineUsers,
		setRemoteCursor,
		removeRemoteCursor,
		setRemoteMeasurement,
		addPing,
		userColor,
		setFogPaths,
		addFogPath,
		setFogState,
		clearFog,
		viewport,
		setViewport,
		setIsGM,
		isGM,
	} = useVTTStore();

	const [isLoading, setIsLoading] = useState(true);
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
		if (!activeCampaign || !user) return;
		const isOwner = activeCampaign.ownerId === user.id;
		setIsGM(isOwner);
	}, [activeCampaign, user, setIsGM]);

	// 2. Fetch scenes for this campaign from Supabase
	const fetchScenes = useCallback(async () => {
		const client = getSupabase();
		if (!client || !campaignId) return;

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

			setScenes(mapped);

			// Automatically select active scene or first scene
			if (mapped.length > 0) {
				const active = mapped.find((s) => s.isActive);
				setActiveSceneId(active ? active.id : mapped[0].id);
			}
		} catch (err) {
			console.error("Erro ao carregar cenas do VTT:", err);
		} finally {
			setIsLoading(false);
		}
	}, [campaignId, setScenes, setActiveSceneId]);

	useEffect(() => {
		void fetchScenes();
	}, [fetchScenes]);

	// 3. Fetch tokens whenever activeSceneId changes
	const fetchTokens = useCallback(
		async (sceneId: string) => {
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

				setTokens(mappedTokens);
			} catch (err) {
				console.error("Erro ao carregar tokens da cena:", err);
			}
		},
		[setTokens],
	);

	useEffect(() => {
		if (activeSceneId) {
			void fetchTokens(activeSceneId);
		}
	}, [activeSceneId, fetchTokens]);

	// 4. Realtime subscription on vtt_scenes for scene activation & live edits
	useEffect(() => {
		const client = getSupabase();
		if (!client || !campaignId) return;

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
						updateScene(row.id, {
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

						if (row.is_active && !isGM) {
							setActiveSceneId(row.id);
						}
					}
				},
			)
			.subscribe();

		return () => {
			client.removeChannel(channel);
		};
	}, [campaignId, addScene, updateScene, isGM, setActiveSceneId]);

	// 5. Realtime subscription on vtt_tokens for live token positions & status
	useEffect(() => {
		const client = getSupabase();
		if (!client || !activeSceneId) return;

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

			const { data } = await client
				.from("vtt_fog_states")
				.select("*")
				.eq("scene_id", activeSceneId)
				.maybeSingle();

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
		if (!client || !campaignId || !user) return;

		const currentUserName =
			user.user_metadata?.full_name ||
			user.email?.split("@")[0] ||
			"Aventureiro";

		const roomChannel = client.channel(`vtt-room:${campaignId}`, {
			config: {
				presence: { key: user.id },
				broadcast: { self: false },
			},
		});

		roomChannelRef.current = roomChannel;

		roomChannel
			.on("presence", { event: "sync" }, () => {
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
					const data = payload.payload;
					if (data?.paths) {
						setFogPaths(data.paths);
					} else if (data?.path) {
						addFogPath(data.path);
					}
				},
			)
			.subscribe(async (status: string) => {
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
			client.removeChannel(roomChannel);
			roomChannelRef.current = null;
		};
	}, [
		campaignId,
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
			roomChannelRef.current.send({
				type: "broadcast",
				event: "token_drag",
				payload: { tokenId, x, y, userId: user.id },
			});
		},
		[user],
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

	const handlePersistFog = useCallback(
		async (paths: VTTFogPath[]) => {
			const client = getSupabase();
			if (!client || !activeSceneId) return;

			try {
				await client.from("vtt_fog_states").upsert(
					{
						scene_id: activeSceneId,
						revealed_paths:
							paths as unknown as import("@/lib/database.types").Json,
						updated_at: new Date().toISOString(),
					},
					{ onConflict: "scene_id" },
				);
			} catch (err) {
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
	const handleCreateScene = async (sceneData: Partial<VTTScene>) => {
		const client = getSupabase();
		if (!client) return;

		const insertData: Database["public"]["Tables"]["vtt_scenes"]["Insert"] = {
			campaign_id: campaignId,
			name: sceneData.name || "Nova Cena",
			map_image_url: sceneData.mapImageUrl || null,
			grid_type: sceneData.gridType || "square",
			grid_size: sceneData.gridSize || 70,
			grid_scale_distance: sceneData.gridScaleDistance || 1.5,
			grid_scale_unit: sceneData.gridScaleUnit || "m",
			width: sceneData.width || 4000,
			height: sceneData.height || 4000,
			is_active: sceneData.isActive || false,
			order_index: scenes.length,
		};

		const { data, error } = await client
			.from("vtt_scenes")
			.insert(insertData)
			.select()
			.single();

		if (error) {
			console.error("Erro ao criar cena:", error);
			return;
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
		if (!client || !campaignId) return;

		await client
			.from("vtt_scenes")
			.update({ is_active: false })
			.eq("campaign_id", campaignId);

		await client
			.from("vtt_scenes")
			.update({ is_active: true })
			.eq("id", sceneId);

		setScenes(
			scenes.map((s) => ({
				...s,
				isActive: s.id === sceneId,
			})),
		);
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

	// Token Management Handlers
	const handleSpawnToken = async (tokenData: Partial<VTTToken>) => {
		const client = getSupabase();
		if (!client || !activeSceneId) return;

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
			return;
		}

		if (data) {
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
		updateToken(tokenId, updates);

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

		await client.from("vtt_tokens").update(dbUpdates).eq("id", tokenId);
	};

	const handleDeleteToken = async (tokenId: string) => {
		removeToken(tokenId);

		const client = getSupabase();
		if (!client) return;

		await client.from("vtt_tokens").delete().eq("id", tokenId);
	};

	const currentActiveScene = scenes.find((s) => s.id === activeSceneId) || null;
	const activeTokenForMenu =
		tokens.find((t) => t.id === activeTokenIdForMenu) || null;

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-[#090a0f] select-none">
			{/* Top Header / Scene Tabs & Presence */}
			<VTTSceneBar
				campaignId={campaignId}
				campaignName={activeCampaign?.name || "Campanha"}
				onCreateScene={handleCreateScene}
				onActivateScene={handleActivateScene}
				onFocusPoint={handleFocusPoint}
			/>

			{/* Left Floating Toolbar */}
			<VTTToolbar />

			{/* Fog of War Contextual Controls */}
			<VTTFogControls
				scene={currentActiveScene}
				onUpdateScene={handleUpdateScene}
				onClearFog={handleClearFog}
			/>

			{/* Grid Settings Popover */}
			<VTTGridSettings onUpdateSceneSettings={handleUpdateSceneSettings} />

			{/* Canvas Viewport */}
			{currentActiveScene ? (
				<VTTCanvas
					scene={currentActiveScene}
					onUpdateToken={handleUpdateToken}
					onBroadcastDrag={handleBroadcastDrag}
					onBroadcastCursor={handleBroadcastCursor}
					onBroadcastRuler={handleBroadcastRuler}
					onBroadcastPing={handleBroadcastPing}
					onBroadcastFog={handleBroadcastFog}
					onPersistFog={handlePersistFog}
				/>
			) : !isLoading ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white/70">
					<div className="p-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl mb-4 shadow-2xl">
						<Compass className="h-10 w-10 text-primary animate-pulse" />
					</div>
					<h3 className="font-display text-xl font-bold text-white">
						Nenhuma cena criada ainda
					</h3>
					<p className="text-xs text-white/50 max-w-sm mt-1 mb-5">
						{isGM
							? "Crie a primeira cena de combate ou exploração da mesa para carregar o mapa e posicionar os tokens."
							: "Aguardando o Mestre ativar uma cena para a sessão de hoje..."}
					</p>
					{isGM && (
						<Button
							type="button"
							onClick={() => handleCreateScene({ name: "Cena Inicial 1" })}
							className="gap-2 font-bold text-xs h-10 px-5 rounded-2xl shadow-lg shadow-primary/20"
						>
							<Sparkles className="h-4 w-4" />
							Criar Primeira Cena
						</Button>
					)}
				</div>
			) : (
				<div className="absolute inset-0 flex items-center justify-center text-white/60">
					<Sparkles className="h-8 w-8 text-primary animate-spin" />
				</div>
			)}

			{/* Right Campaign Roster Drawer (Characters & Bestiary) */}
			<VTTRosterDrawer
				scene={currentActiveScene}
				onSpawnToken={handleSpawnToken}
			/>

			{/* Token Contextual / Health & Status Edit Popover */}
			<VTTTokenMenu
				token={activeTokenForMenu}
				onUpdateToken={handleUpdateToken}
				onDeleteToken={handleDeleteToken}
			/>

			{/* Bottom-Right Zoom & Distance HUD */}
			<VTTZoomControls />
		</div>
	);
}
