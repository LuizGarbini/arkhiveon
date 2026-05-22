// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalError } from "./global-error";

type MockLinkProps = {
	to: string;
	children: ReactNode;
	className?: string;
};

vi.mock("@tanstack/react-router", async () => {
	const React = await import("react");

	return {
		Link: ({ to, children, ...props }: MockLinkProps) =>
			React.createElement("a", { href: to, ...props }, children),
	};
});

afterEach(() => {
	cleanup();
});

describe("GlobalError", () => {
	it("renders the global error screen with accessible recovery actions", () => {
		const reset = vi.fn();

		render(<GlobalError error={new Error("Falha de teste")} reset={reset} />);

		const alert = screen.getByRole("alert");
		const message = screen.getByText("Falha de teste");

		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Algo quebrou no Arkhiveon",
		);
		expect(alert.getAttribute("aria-describedby")).toBe(message.id);

		fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
		expect(reset).toHaveBeenCalledOnce();

		const homeLink = screen.getByRole("link", { name: "Início" });
		expect(homeLink.getAttribute("href")).toBe("/");
		expect(homeLink.querySelector("button")).toBeNull();
	});

	it("keeps very long error messages bounded", () => {
		render(
			<GlobalError
				error={
					new Error(
						`Falha extensa. ${"Detalhe repetido para validar truncamento. ".repeat(40)}`,
					)
				}
			/>,
		);

		const message = screen.getByText((content, element) => {
			return Boolean(element?.id && content.startsWith("Falha extensa."));
		});

		expect(message.textContent?.length).toBeLessThanOrEqual(903);
		expect(message.textContent?.endsWith("...")).toBe(true);
	});
});
