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

describe("LibraryFileRow capa", () => {
	const ready: LibraryFile = {
		...file,
		thumbStatus: "ready",
	};

	it("pending e failed mostram o ícone PDF, não a imagem", () => {
		const { rerender } = render(
			<ul>
				<LibraryFileRow
					file={{ ...file, thumbStatus: "pending" }}
					canManage={false}
					onDelete={() => {}}
					onRename={async () => {}}
				/>
			</ul>,
		);
		expect(screen.getByText("PDF")).toBeTruthy();
		expect(document.querySelector("img")).toBeNull();
		rerender(
			<ul>
				<LibraryFileRow
					file={{ ...file, thumbStatus: "failed" }}
					canManage={false}
					onDelete={() => {}}
					onRename={async () => {}}
				/>
			</ul>,
		);
		expect(screen.getByText("PDF")).toBeTruthy();
		expect(document.querySelector("img")).toBeNull();
	});

	it("capa pronta sem URL mostra o skeleton", () => {
		render(
			<ul>
				<LibraryFileRow
					file={ready}
					canManage={false}
					onDelete={() => {}}
					onRename={async () => {}}
					thumbLoading
				/>
			</ul>,
		);
		expect(document.querySelector("[data-slot=skeleton]")).toBeTruthy();
		expect(document.querySelector("img")).toBeNull();
		expect(screen.queryByText("PDF")).toBeNull();
	});

	it("capa pronta com URL renderiza imagem lazy", () => {
		render(
			<ul>
				<LibraryFileRow
					file={ready}
					canManage={false}
					onDelete={() => {}}
					onRename={async () => {}}
					thumbUrl="https://example.test/cover.webp"
				/>
			</ul>,
		);
		const img = document.querySelector("img");
		expect(img).toBeTruthy();
		expect(img?.getAttribute("src")).toBe("https://example.test/cover.webp");
		expect(img?.getAttribute("loading")).toBe("lazy");
		expect(img?.getAttribute("decoding")).toBe("async");
		expect(screen.queryByText("PDF")).toBeNull();
	});
});
