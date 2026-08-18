import { Compass, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { VTTCanvas } from "@/components/vtt/vtt-canvas";
import { VTTGridSettings } from "@/components/vtt/vtt-grid-settings";
import { VTTSceneBar } from "@/components/vtt/vtt-scene-bar";
import { VTTToolbar } from "@/components/vtt/vtt-toolbar";
import { VTTZoomControls } from "@/components/vtt/vtt-zoom-controls";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import type { VTTGridScaleUnit, VTTGridType, VTTScene } from "@/lib/vtt/types";
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
		setIsGM,
		isGM,
	} = useVTTStore();

	const [isLoading, setIsLoading] = useState(true);

	// 1. Determine GM vs Player permissions
	useEffect(() => {
		if (!activeCampaign || !user) return;
		const isOwner = activeCampaign.ownerId === user.id;
		setIsGM(isOwner);
	}, [activeCampaign, user, setIsGM]);

	// 2. Fetch scenes for this campaign from Supabase
	const fetchScenes = useCallback(async () => {
		const client = getSupabase() as any;
		if (!client || !campaignId) return;

		try {
			const { data, error } = await client
				.from("vtt_scenes")
				.select("*")
				.eq("campaign_id", campaignId)
				.order("order_index", { ascending: true })
				.order("created_at", { ascending: true });

			if (error) throw error;

			const mapped: VTTScene[] = (data || []).map((row: any) => ({
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

	// 3. Realtime subscription on vtt_scenes for scene activation & live edits
	useEffect(() => {
		const client = getSupabase() as any;
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
				(payload: any) => {
					if (payload.eventType === "INSERT") {
						const row = payload.new;
						addScene({
							id: row.id,
							campaignId: row.campaign_id,
							name: row.name,
							mapImageUrl: row.map_image_url,
							gridType: row.grid_type,
							gridSize: row.grid_size,
							gridColor: row.grid_color,
							gridOpacity: row.grid_opacity,
							gridScaleDistance: row.grid_scale_distance,
							gridScaleUnit: row.grid_scale_unit,
							width: row.width,
							height: row.height,
							fogEnabled: row.fog_enabled,
							fogExploration: row.fog_exploration,
							isActive: row.is_active,
							orderIndex: row.order_index,
						});
					} else if (payload.eventType === "UPDATE") {
						const row = payload.new;
						updateScene(row.id, {
							name: row.name,
							mapImageUrl: row.map_image_url,
							gridType: row.grid_type,
							gridSize: row.grid_size,
							gridColor: row.grid_color,
							gridOpacity: row.grid_opacity,
							gridScaleDistance: row.grid_scale_distance,
							gridScaleUnit: row.grid_scale_unit,
							width: row.width,
							height: row.height,
							fogEnabled: row.fog_enabled,
							fogExploration: row.fog_exploration,
							isActive: row.is_active,
						});

						// If non-GM player and this scene became active, switch view automatically
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

	// Scene Management Handlers
	const handleCreateScene = async (sceneData: Partial<VTTScene>) => {
		const client = getSupabase() as any;
		if (!client) return;

		const insertData = {
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
				gridType: data.grid_type,
				gridSize: data.grid_size,
				gridColor: data.grid_color,
				gridOpacity: data.grid_opacity,
				gridScaleDistance: data.grid_scale_distance,
				gridScaleUnit: data.grid_scale_unit,
				width: data.width,
				height: data.height,
				fogEnabled: data.fog_enabled,
				fogExploration: data.fog_exploration,
				isActive: data.is_active,
				orderIndex: data.order_index,
			};
			addScene(newScene);
			setActiveSceneId(newScene.id);
		}
	};

	const handleActivateScene = async (sceneId: string) => {
		const client = getSupabase() as any;
		if (!client || !campaignId) return;

		// 1. Deactivate other scenes in campaign
		await client
			.from("vtt_scenes")
			.update({ is_active: false })
			.eq("campaign_id", campaignId);

		// 2. Activate target scene
		await client
			.from("vtt_scenes")
			.update({ is_active: true })
			.eq("id", sceneId);

		// 3. Update local state
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

		// Optimistic update
		updateScene(activeSceneId, settings);

		const client = getSupabase() as any;
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

	const currentActiveScene = scenes.find((s) => s.id === activeSceneId) || null;

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-[#090a0f] select-none">
			{/* Top Header / Scene Tabs */}
			<VTTSceneBar
				campaignId={campaignId}
				campaignName={activeCampaign?.name || "Campanha"}
				onCreateScene={handleCreateScene}
				onActivateScene={handleActivateScene}
			/>

			{/* Left Floating Toolbar */}
			<VTTToolbar />

			{/* Grid Settings Popover */}
			<VTTGridSettings onUpdateSceneSettings={handleUpdateSceneSettings} />

			{/* Canvas Viewport */}
			{currentActiveScene ? (
				<VTTCanvas scene={currentActiveScene} />
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

			{/* Bottom-Right Zoom & Distance HUD */}
			<VTTZoomControls />
		</div>
	);
}
