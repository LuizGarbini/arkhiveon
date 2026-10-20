// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Sun } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PointPoolControl } from "./point-pool-control";

const copy = {
	name: "Pontos Divinos",
	point: "ponto divino",
	totalOf: "pontos divinos",
	totalLabel: "Total de pontos divinos",
	remains: "ficam",
};

afterEach(cleanup);

describe("PointPoolControl", () => {
	it("sem onBurn não mostra Queimar; Esc cancela a edição do total", () => {
		const onSetTotal = vi.fn();
		render(
			<PointPoolControl
				copy={copy}
				icon={Sun}
				value={2}
				total={5}
				totalMin={0}
				totalMax={99}
				percent={40}
				barSlot="divine-bar"
				onSpend={vi.fn()}
				onRegain={vi.fn()}
				onSetTotal={onSetTotal}
			/>,
		);
		expect(
			screen.queryByRole("button", { name: "Queimar 1 ponto divino" }),
		).toBeNull();
		fireEvent.click(
			screen.getByRole("button", {
				name: "Editar total de pontos divinos (5)",
			}),
		);
		const input = screen.getByLabelText("Total de pontos divinos");
		fireEvent.change(input, { target: { value: "9" } });
		fireEvent.keyDown(input, { key: "Escape" });
		expect(screen.queryByLabelText("Total de pontos divinos")).toBeNull();
		expect(onSetTotal).not.toHaveBeenCalled();
	});
});
