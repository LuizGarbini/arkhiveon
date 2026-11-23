// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorageContext } from "@/lib/storage/storage-context";
import { StorageCard } from "./storage-card";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		...props
	}: {
		children?: ReactNode;
		to?: string;
		className?: string;
		onClick?: () => void;
		"aria-label"?: string;
		title?: string;
	}) => (
		<a href={props.to ?? "/"} {...props}>
			{children}
		</a>
	),
}));

function ready(partial: Partial<StorageContext> = {}): StorageContext {
	return {
		status: "ready",
		label: "free",
		usedBytes: 38_400_000,
		limitBytes: 100_000_000,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
		...partial,
	};
}

describe("StorageCard", () => {
	afterEach(cleanup);

	it("carregando: esqueleto, nunca Free nem 0 MB", () => {
		render(<StorageCard context={ready({ status: "loading" })} />);
		expect(
			screen.getByRole("status", { name: "Carregando consumo" }),
		).toBeTruthy();
		expect(screen.queryByText(/Free/i)).toBeNull();
		expect(screen.queryByText(/0\s*\/\s*100/)).toBeNull();
		expect(screen.queryByText(/0 MB/)).toBeNull();
	});

	it("erro: Consumo indisponível, nunca Free nem 0 MB", () => {
		render(<StorageCard context={ready({ status: "error" })} />);
		expect(screen.getByText("Consumo")).toBeTruthy();
		expect(screen.getByText("indisponível")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
		expect(
			screen.getByRole("link", {
				name: "Consumo indisponível. Abrir consumo.",
			}),
		).toBeTruthy();
		expect(screen.queryByText(/Free/i)).toBeNull();
		expect(screen.queryByText(/0 MB/)).toBeNull();
	});

	it("Free pronto mostra o uso e o limite de 100 MB", () => {
		render(<StorageCard context={ready()} />);
		expect(screen.getByText("Free")).toBeTruthy();
		expect(screen.getByText("38,4 / 100 MB")).toBeTruthy();
		expect(screen.getByRole("progressbar")).toBeTruthy();
	});

	it("Pro pronto mostra o limite de 10 GB", () => {
		render(
			<StorageCard
				context={ready({
					label: "pro",
					usedBytes: 1_310_000_000,
					limitBytes: 10_000_000_000,
				})}
			/>,
		);
		expect(screen.getByText("Pro")).toBeTruthy();
		expect(screen.getByText("1,3 / 10 GB")).toBeTruthy();
	});

	it("perto do limite e no limite usam o estado em texto", () => {
		const { rerender } = render(
			<StorageCard context={ready({ usedBytes: 96_000_000 })} />,
		);
		expect(screen.getByText("96%")).toBeTruthy();
		rerender(<StorageCard context={ready({ usedBytes: 100_000_000 })} />);
		expect(screen.getByText("Cheio")).toBeTruthy();
	});

	it("convidado Pro acima do limite: selo por extenso, estado no ícone e uso sem o total", () => {
		const since = new Date(Date.now() - 17 * 86_400_000).toISOString();
		render(
			<StorageCard
				context={ready({
					label: "guest_pro",
					usedBytes: 10_400_000_000,
					limitBytes: 10_000_000_000,
					overLimitSince: since,
					payerName: "Mestre Ana",
				})}
			/>,
		);
		expect(screen.getByText("Convidado Pro")).toBeTruthy();
		expect(screen.queryByText(/Acima · 43 dias/)).toBeNull();
		expect(screen.getByLabelText("Acima · 43 dias")).toBeTruthy();
		expect(screen.getByTitle("Acima · 43 dias")).toBeTruthy();
		expect(screen.getByText("10,4 GB")).toBeTruthy();
		expect(screen.queryByText(/10,4 \/ 10 GB/)).toBeNull();
	});

	it("convidado Pro em 96% e Cheio: estado no ícone e uso sem o total", () => {
		const { rerender } = render(
			<StorageCard
				context={ready({
					label: "guest_pro",
					usedBytes: 9_600_000_000,
					limitBytes: 10_000_000_000,
					payerName: "Mestre Ana",
				})}
			/>,
		);
		expect(screen.getByText("Convidado Pro")).toBeTruthy();
		expect(screen.queryByText("96%")).toBeNull();
		expect(screen.getByLabelText("96%")).toBeTruthy();
		expect(screen.getByText("9,6 GB")).toBeTruthy();
		rerender(
			<StorageCard
				context={ready({
					label: "guest_pro",
					usedBytes: 10_000_000_000,
					limitBytes: 10_000_000_000,
					payerName: "Mestre Ana",
				})}
			/>,
		);
		expect(screen.queryByText("Cheio")).toBeNull();
		expect(screen.getByLabelText("Cheio")).toBeTruthy();
		expect(screen.getByText("10,0 GB")).toBeTruthy();
	});

	it("convidado Pro abaixo de 95% segue o mock: estado em texto e uso com o total", () => {
		render(
			<StorageCard
				context={ready({
					label: "guest_pro",
					usedBytes: 6_100_000_000,
					limitBytes: 10_000_000_000,
				})}
			/>,
		);
		expect(screen.getByText("Convidado Pro")).toBeTruthy();
		expect(screen.getByText("6,1 / 10 GB")).toBeTruthy();
		expect(screen.queryByLabelText("96%")).toBeNull();
	});

	it("não usa reticências nem truncate no rótulo, estado ou uso", () => {
		const since = new Date(Date.now() - 17 * 86_400_000).toISOString();
		const { container } = render(
			<StorageCard
				context={ready({
					label: "guest_pro",
					usedBytes: 10_400_000_000,
					limitBytes: 10_000_000_000,
					overLimitSince: since,
				})}
			/>,
		);
		const marked = container.querySelectorAll(
			"[data-label], [data-status], [data-value]",
		);
		for (const el of marked) {
			expect(el.className).not.toMatch(/truncate|ellipsis|text-clip/);
		}
		const row = container.querySelector("[data-label]")?.parentElement;
		expect(row?.className).not.toMatch(/flex-wrap/);
		expect(row?.className).toMatch(/flex-nowrap/);
	});

	it("recolhido: só o ícone, alvo 44px, sem texto de plano", () => {
		const { container } = render(
			<StorageCard context={ready({ label: "pro" })} isCollapsed />,
		);
		expect(screen.queryByText("Pro")).toBeNull();
		const card = container.querySelector("[data-card]");
		expect(card).toBeTruthy();
		expect(card?.className).toMatch(/min-h-\[44px\]/);
	});
});
