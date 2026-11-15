// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { useRPGStore } from "@/lib/store";
import type { Character, Faction } from "@/lib/store/types";
import { PullFactionDialog } from "./pull-faction-dialog";
import { SheetConnectionsModule } from "./view/sheet-connections-module";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

afterEach(cleanup);

const faction = (over: Partial<Faction>): Faction =>
	({
		id: "f",
		worldId: "w",
		name: "Facção",
		leader: "",
		seat: "",
		goals: "",
		alignment: "",
		influence: "",
		description: "",
		imageUrl: "",
		createdAt: 0,
		...over,
	}) as Faction;

const harpistas = faction({
	id: "harp",
	name: "Ordem dos Harpistas",
	kind: "faction",
	imageUrl: "https://cdn.test/harpistas.webp",
});
const lamborghini = faction({
	id: "lambo",
	name: "Lamborghini",
	kind: "faction",
});
const patrono = faction({
	id: "pat",
	name: "Patrono Misterioso",
	kind: "patron",
	patronType: "Grupo",
	imageUrl: "https://cdn.test/patrono.webp",
});

beforeEach(() => {
	useRPGStore.setState({ factions: [harpistas, lamborghini, patrono] });
});

function renderPicker() {
	return render(
		<ToastProvider>
			<PullFactionDialog
				open
				onOpenChange={() => {}}
				characterName="Dante"
				onSelectFaction={() => {}}
			/>
		</ToastProvider>,
	);
}

describe("seletor Puxar Patrono ou Facção · imagens", () => {
	it("mostra a imagem de cada facção que tem uma", () => {
		renderPicker();
		const srcs = Array.from(document.querySelectorAll("img")).map((i) =>
			i.getAttribute("src"),
		);
		expect(srcs).toContain("https://cdn.test/harpistas.webp");
		expect(srcs).toContain("https://cdn.test/patrono.webp");
	});

	it("facção sem imagem continua com o ícone (não fica com quadro vazio)", () => {
		renderPicker();
		const avatars = Array.from(document.querySelectorAll("[data-kind]"));
		expect(avatars).toHaveLength(3);
		expect(
			avatars.filter((a) => a.getAttribute("data-kind") === "image"),
		).toHaveLength(2);
		expect(
			avatars.filter((a) => a.getAttribute("data-kind") === "icon"),
		).toHaveLength(1);
	});

	it("o nome continua ao lado da imagem", () => {
		renderPicker();
		expect(screen.getByText("Ordem dos Harpistas")).toBeTruthy();
		expect(screen.getByText("Lamborghini")).toBeTruthy();
	});
});

const character = (links: string[]): Character =>
	({
		id: "c1",
		system: "dnd5e",
		characterName: "Dante Diavolo",
		entityLinks: links.map((id) => ({
			id: `link-${id}`,
			entityKind: "faction",
			entityId: id,
			label: id,
			note: id === "harp" ? "Aliado" : "",
		})),
	}) as unknown as Character;

function renderModule(links: string[]) {
	return render(
		<ToastProvider>
			<SheetConnectionsModule
				character={character(links)}
				onUpdateCharacter={() => {}}
				canEdit
			/>
		</ToastProvider>,
	);
}

describe("Conexões da ficha · imagens das facções vinculadas", () => {
	it("a facção vinculada mostra a própria imagem", () => {
		renderModule(["harp"]);
		const img = document.querySelector("img");
		expect(img?.getAttribute("src")).toBe("https://cdn.test/harpistas.webp");
		expect(screen.getByText("Ordem dos Harpistas")).toBeTruthy();
		expect(screen.getByText("Aliado")).toBeTruthy();
	});

	it("vínculo cuja facção não tem imagem usa o ícone", () => {
		renderModule(["lambo"]);
		expect(document.querySelector("img")).toBeNull();
		expect(document.querySelector("[data-kind='icon']")).not.toBeNull();
	});

	it("patrono com imagem mostra a imagem e mantém o destaque dourado", () => {
		renderModule(["pat"]);
		expect(document.querySelector("img")?.getAttribute("src")).toBe(
			"https://cdn.test/patrono.webp",
		);
		expect(document.querySelector("[data-kind='image']")?.className).toMatch(
			/amber/,
		);
	});

	it("vários vínculos: cada um com a sua imagem ou ícone", () => {
		renderModule(["harp", "lambo", "pat"]);
		const avatars = Array.from(document.querySelectorAll("[data-kind]"));
		expect(avatars.map((a) => a.getAttribute("data-kind"))).toEqual([
			"image",
			"icon",
			"image",
		]);
	});

	it("vínculo de facção que sumiu do mundo não quebra", () => {
		renderModule(["apagada"]);
		expect(document.querySelector("[data-kind='icon']")).not.toBeNull();
	});
});
