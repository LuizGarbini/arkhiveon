// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LibraryFile } from "@/lib/library/library-storage";
import { LibraryFileRow } from "./library-file-row";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to: _to,
		params: _params,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement> & {
		children?: ReactNode;
		to?: string;
		params?: unknown;
	}) => <a {...props}>{children}</a>,
}));

const file: LibraryFile = {
	id: "pdf-1",
	title: "Bestiário",
	sizeBytes: 1200,
	createdAt: "2026-10-18T12:00:00.000Z",
};

const TECHNICAL =
	'duplicate key value violates unique constraint "library_files_pkey"';

afterEach(cleanup);

describe("LibraryFileRow erro ao renomear", () => {
	it("mostra frase em português mesmo quando error.message é técnico", async () => {
		const onRename = vi.fn(() => Promise.reject(new Error(TECHNICAL)));
		render(
			<LibraryFileRow
				file={file}
				canManage
				onDelete={() => {}}
				onRename={onRename}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Renomear Bestiário" }));
		fireEvent.change(screen.getByLabelText("Novo nome do PDF"), {
			target: { value: "Bestiário novo" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toBe("Não deu pra salvar o nome. Tente de novo.");
		expect(document.body.textContent).not.toContain("duplicate key");
	});
});
