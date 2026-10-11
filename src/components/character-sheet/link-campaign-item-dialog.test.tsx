// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	healingPotion,
	longsword,
	ringOfAlertness,
	shortbow,
	studdedLeather,
	thalia,
} from "@/core/rules/thalia.fixture";
import { LinkCampaignItemDialog } from "./link-campaign-item-dialog";

const items = [
	longsword,
	shortbow,
	studdedLeather,
	ringOfAlertness,
	healingPotion,
];

function setup() {
	const onLink = vi.fn();
	render(
		<LinkCampaignItemDialog
			open
			onOpenChange={() => {}}
			character={thalia}
			items={items}
			current={[]}
			onLink={onLink}
		/>,
	);
	return { onLink };
}

const listNames = () =>
	screen
		.getAllByRole("radio")
		.filter((r) => r.closest('[aria-label="Itens da campanha"]'))
		.map((r) => r.querySelector("span span")?.textContent);

afterEach(cleanup);

describe("LinkCampaignItemDialog", () => {
	it("busca filtra a lista", async () => {
		setup();
		fireEvent.change(screen.getByLabelText("Buscar item da campanha"), {
			target: { value: "anel" },
		});
		expect(await screen.findByText("Anel da prontidão")).toBeTruthy();
		expect(listNames()).toEqual(["Anel da prontidão"]);
	});

	it("chip Armas mostra só armas", () => {
		setup();
		fireEvent.click(screen.getByRole("radio", { name: "Armas" }));
		expect(listNames()).toEqual(["Arco curto", "Espada longa +1"]);
	});

	it("sem seleção o botão fica desabilitado", () => {
		setup();
		const cta = screen.getByRole("button", { name: /Vincular/ });
		expect((cta as HTMLButtonElement).disabled).toBe(true);
	});

	it("efeito muda com No Corpo × Mochila e com a proficiência", () => {
		setup();
		fireEvent.click(screen.getByRole("radio", { name: /Espada longa \+1/ }));
		const effect = screen.getByTestId("link-effect");
		expect(effect.textContent).toContain("Acerto +6");
		expect(effect.textContent).toContain("Dano 1d8+4 cortante");
		fireEvent.click(
			screen.getByLabelText("Thalia é proficiente com esta arma", {
				exact: false,
			}),
		);
		expect(effect.textContent).toContain("Acerto +4");
		fireEvent.click(screen.getByRole("radio", { name: /Mochila/ }));
		expect(effect.textContent).toBe("Só carrega");
	});

	it("proficiência só aparece para arma", () => {
		setup();
		fireEvent.click(screen.getByRole("radio", { name: /Couro batido/ }));
		expect(screen.queryByText(/proficiente com esta arma/)).toBeNull();
		expect(screen.getByTestId("link-effect").textContent).toContain("CA 15");
	});

	it("confirmar grava a entrada com campaignItemId", () => {
		const { onLink } = setup();
		fireEvent.click(screen.getByRole("radio", { name: /Espada longa \+1/ }));
		fireEvent.click(screen.getByRole("button", { name: /Vincular à ficha/ }));
		expect(onLink).toHaveBeenCalledTimes(1);
		expect(onLink.mock.calls[0][0]).toMatchObject({
			campaignItemId: longsword.id,
			location: "equipped",
			proficient: true,
			name: "Espada longa +1",
		});
		expect(onLink.mock.calls[0][0].weapon).toBeUndefined();
	});
});
