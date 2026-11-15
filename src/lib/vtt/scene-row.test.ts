import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { mapSceneRow } from "./scene-row";
import { toLightLevel } from "./vision";

type Row = Database["public"]["Tables"]["vtt_scenes"]["Row"];
const base = {
	id: "s1",
	campaign_id: "c1",
	name: "Cena",
	map_image_url: null,
	grid_type: "square",
	grid_size: 70,
	grid_color: "#fff",
	grid_opacity: 0.2,
	grid_scale_distance: 1.5,
	grid_scale_unit: "m",
	grid_offset_x: 0,
	grid_offset_y: 0,
	map_scale: 1,
	width: 1000,
	height: 800,
	fog_enabled: true,
	fog_exploration: true,
	light_level: "bright",
	is_active: true,
	order_index: 0,
	created_at: "x",
	updated_at: "x",
} as unknown as Row;

describe("luz da cena na leitura do banco", () => {
	it("penumbra vira dim", () => {
		expect(mapSceneRow({ ...base, light_level: "dim" }).lightLevel).toBe("dim");
	});

	it("escura vira dark; clara vira bright", () => {
		expect(mapSceneRow({ ...base, light_level: "dark" }).lightLevel).toBe(
			"dark",
		);
		expect(mapSceneRow(base).lightLevel).toBe("bright");
	});

	it("valor desconhecido ou ausente (linha antiga) é cena clara", () => {
		expect(mapSceneRow({ ...base, light_level: "twilight" }).lightLevel).toBe(
			"bright",
		);
		const old = { ...base } as unknown as Record<string, unknown>;
		old.light_level = undefined;
		expect(mapSceneRow(old as unknown as Row).lightLevel).toBe("bright");
		expect(toLightLevel(null)).toBe("bright");
		expect(toLightLevel(7)).toBe("bright");
		expect(toLightLevel("dark")).toBe("dark");
		expect(toLightLevel("dim")).toBe("dim");
	});
});
