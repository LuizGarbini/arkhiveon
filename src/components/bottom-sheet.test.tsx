// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOTTOM_SHEET_DRAG_CLOSE_PX, BottomSheet } from "./bottom-sheet";

beforeEach(() => {
	HTMLElement.prototype.setPointerCapture = () => {};
});

afterEach(cleanup);

function drag(handle: HTMLElement, deltaY: number) {
	fireEvent.pointerDown(handle, { clientY: 40, pointerId: 1 });
	fireEvent.pointerMove(handle, { clientY: 40 + deltaY, pointerId: 1 });
	fireEvent.pointerUp(handle, { clientY: 40 + deltaY, pointerId: 1 });
}

describe("BottomSheet onDismissSave", () => {
	it("arrastar além do limite chama onDismissSave e só então fecha", () => {
		const order: string[] = [];
		render(
			<BottomSheet
				open
				title="Ficha"
				onDismissSave={() => {
					order.push("save");
				}}
				onOpenChange={() => {
					order.push("close");
				}}
			>
				<p>Conteudo</p>
			</BottomSheet>,
		);
		drag(
			screen.getByTestId("bottom-sheet-handle"),
			BOTTOM_SHEET_DRAG_CLOSE_PX + 1,
		);
		expect(order).toEqual(["save", "close"]);
	});

	it("arrastar até o limite não salva nem fecha", () => {
		const onDismissSave = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<BottomSheet
				open
				title="Ficha"
				onDismissSave={onDismissSave}
				onOpenChange={onOpenChange}
			>
				<p>Conteudo</p>
			</BottomSheet>,
		);
		drag(screen.getByTestId("bottom-sheet-handle"), BOTTOM_SHEET_DRAG_CLOSE_PX);
		expect(onDismissSave).not.toHaveBeenCalled();
		expect(onOpenChange).not.toHaveBeenCalled();
	});
});
