// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { Flag } from "lucide-react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarNav } from "./sidebar-nav";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		...props
	}: {
		children?: ReactNode | ((s: { isActive: boolean }) => ReactNode);
		"aria-label"?: string;
	}) => (
		<a href="/" aria-label={props["aria-label"]}>
			{typeof children === "function"
				? children({ isActive: false })
				: children}
		</a>
	),
}));

describe("SidebarNav: rótulo pendente", () => {
	afterEach(cleanup);

	it("mostra skeleton e nome acessível neutro no lugar do rótulo padrão", () => {
		render(
			<SidebarNav
				items={[
					{
						to: "/factions",
						label: "Facções & Ordens",
						Icon: Flag,
						labelPending: true,
					},
				]}
			/>,
		);
		expect(screen.queryByText("Facções & Ordens")).toBeNull();
		expect(
			screen.getByRole("link", { name: "Carregando seção do mundo" }),
		).toBeTruthy();
	});

	it("com o dado real, mostra o rótulo", () => {
		render(
			<SidebarNav
				items={[{ to: "/factions", label: "Clãs & Seitas", Icon: Flag }]}
			/>,
		);
		expect(screen.getByText("Clãs & Seitas")).toBeTruthy();
	});
});
