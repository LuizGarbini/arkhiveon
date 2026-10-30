// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

afterEach(cleanup);

function clickOutside() {
	const overlay = document.querySelector('[data-slot="dialog-overlay"]');
	expect(overlay).not.toBeNull();
	fireEvent.click(overlay as Element);
}

function OpenDialog({
	onOpenChange,
	onDismissSave,
}: {
	onOpenChange: (open: boolean, details?: { reason?: string }) => void;
	onDismissSave?: () => void | Promise<void>;
}) {
	const [open, setOpen] = useState(true);
	return (
		<Dialog
			open={open}
			onDismissSave={onDismissSave}
			onOpenChange={(next, details) => {
				onOpenChange(next, details);
				setOpen(next);
			}}
		>
			<DialogContent>
				<DialogTitle>Titulo</DialogTitle>
				<p>Corpo</p>
			</DialogContent>
		</Dialog>
	);
}

describe("Dialog onDismissSave", () => {
	it("clique fora chama onDismissSave e só então fecha", () => {
		const order: string[] = [];
		render(
			<OpenDialog
				onDismissSave={() => {
					order.push("save");
				}}
				onOpenChange={(open, details) => {
					order.push(`close:${String(open)}:${details?.reason ?? ""}`);
				}}
			/>,
		);
		clickOutside();
		expect(order).toEqual(["save", "close:false:outside-press"]);
	});

	it("Esc chama onDismissSave e só então fecha", () => {
		const order: string[] = [];
		render(
			<OpenDialog
				onDismissSave={() => {
					order.push("save");
				}}
				onOpenChange={(open, details) => {
					order.push(`close:${String(open)}:${details?.reason ?? ""}`);
				}}
			/>,
		);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(order).toEqual(["save", "close:false:escape-key"]);
	});

	it("espera a promise de onDismissSave antes de fechar", async () => {
		let release: () => void = () => {};
		const onDismissSave = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				}),
		);
		const onOpenChange = vi.fn();
		render(
			<OpenDialog onDismissSave={onDismissSave} onOpenChange={onOpenChange} />,
		);
		clickOutside();
		expect(onDismissSave).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();
		await act(async () => {
			release();
		});
		expect(onOpenChange).toHaveBeenCalledWith(
			false,
			expect.objectContaining({ reason: "outside-press" }),
		);
	});

	it("o X fecha sem chamar onDismissSave", () => {
		const onDismissSave = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<OpenDialog onDismissSave={onDismissSave} onOpenChange={onOpenChange} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(onDismissSave).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(
			false,
			expect.objectContaining({ reason: "close-press" }),
		);
	});

	it("sem onDismissSave, clique fora e Esc só fecham", () => {
		const onOpenChange = vi.fn();
		const { unmount } = render(<OpenDialog onOpenChange={onOpenChange} />);
		clickOutside();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(
			false,
			expect.objectContaining({ reason: "outside-press" }),
		);

		onOpenChange.mockClear();
		unmount();
		render(<OpenDialog onOpenChange={onOpenChange} />);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(
			false,
			expect.objectContaining({ reason: "escape-key" }),
		);
	});
});
