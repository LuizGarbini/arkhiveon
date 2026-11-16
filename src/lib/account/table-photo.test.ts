import { describe, expect, it, vi } from "vitest";
import {
	persistTablePhoto,
	readRemoteAvatarUrl,
	resolveTablePhoto,
	TABLE_PHOTO_MAX_DIMENSION,
	tablePhotoInitials,
	tablePhotoUploadOptions,
	uploadTablePhoto,
} from "./table-photo";

const STORAGE = {
	supabaseUrl: "https://axnektdqoxjhbbfsidfj.supabase.co",
	r2PublicUrl: "https://pub-7550a50cda5849b48c17ab5f0ad3118e.r2.dev",
};

const GOOGLE = "https://lh3.googleusercontent.com/a/foto=s96-c";
const R2 =
	"https://pub-7550a50cda5849b48c17ab5f0ad3118e.r2.dev/user/table-photo/a.webp";
const SUPABASE_OBJECT =
	"https://axnektdqoxjhbbfsidfj.supabase.co/storage/v1/object/public/avatars/a.webp";

const href = (value: string) => new URL(value).href;

describe("endereço de foto vindo de outro cliente", () => {
	it("aceita https da foto do Google (lh3 a lh6), inclusive com maiúscula", () => {
		expect(readRemoteAvatarUrl(GOOGLE, STORAGE)).toBe(href(GOOGLE));
		for (const host of ["lh4", "lh5", "lh6"]) {
			const url = `https://${host}.googleusercontent.com/a/x`;
			expect(readRemoteAvatarUrl(url, STORAGE)).toBe(href(url));
		}
		expect(
			readRemoteAvatarUrl("https://LH3.googleusercontent.com/a/photo", STORAGE),
		).toBe("https://lh3.googleusercontent.com/a/photo");
	});

	it("aceita https do storage do projeto: Supabase e o R2 público", () => {
		expect(readRemoteAvatarUrl(SUPABASE_OBJECT, STORAGE)).toBe(
			href(SUPABASE_OBJECT),
		);
		expect(
			readRemoteAvatarUrl(
				"https://axnektdqoxjhbbfsidfj.supabase.co/storage/v1/object/sign/avatars/a.webp?token=abc",
				STORAGE,
			),
		).toBe(
			href(
				"https://axnektdqoxjhbbfsidfj.supabase.co/storage/v1/object/sign/avatars/a.webp?token=abc",
			),
		);
		expect(readRemoteAvatarUrl(R2, STORAGE)).toBe(href(R2));
	});

	it("recusa javascript: e data:, mesmo disfarçados de host permitido", () => {
		for (const bad of [
			"javascript:alert(1)",
			"JAVASCRIPT:alert(1)",
			" javascript:alert(1)",
			"javascript://lh3.googleusercontent.com/a",
			"javascript://lh3.googleusercontent.com/%0aalert(1)",
			"data:text/html,<script>alert(1)</script>",
			'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
			"data:image/png;base64,AAAA",
			"data://lh3.googleusercontent.com/a",
			"data://axnektdqoxjhbbfsidfj.supabase.co/storage/v1/object/public/a.webp",
		]) {
			expect(readRemoteAvatarUrl(bad, STORAGE)).toBeNull();
		}
	});

	it("recusa http, outro host, porta, usuário na URL e o que não é o storage", () => {
		for (const bad of [
			"http://lh3.googleusercontent.com/a/photo",
			"https://lh3.googleusercontent.com.evil.com/a",
			"https://lh3.googleusercontent.com%2eevil.com/a",
			"https://user:pass@lh3.googleusercontent.com/a",
			"https://lh3.googleusercontent.com:444/a",
			"https://evil.example/photo.png",
			"https://lh7.googleusercontent.com/a",
			"https://photos.google.com/a",
			"https://googleusercontent.com/a",
			"https://axnektdqoxjhbbfsidfj.supabase.co/auth/v1/user",
			"https://axnektdqoxjhbbfsidfj.supabase.co/rest/v1/characters",
			"https://axnektdqoxjhbbfsidfj.supabase.co/storage/v1/object/../auth/v1",
			"https://axnektdqoxjhbbfsidfj.supabase.co.evil.com/storage/v1/object/public/a.webp",
			"https://evilaxnektdqoxjhbbfsidfj.supabase.co/storage/v1/object/public/a.webp",
			"https://pub-7550a50cda5849b48c17ab5f0ad3118e.r2.dev.evil.com/a.webp",
			"https://evil.r2.dev/a.webp",
			"blob:https://evil.example/uuid",
			"file:///etc/passwd",
			"https://lh3.googleusercontent.com\\@evil.com",
			`https://lh3.googleusercontent.com/${"a".repeat(3000)}`,
			"",
			"   ",
		]) {
			expect(readRemoteAvatarUrl(bad, STORAGE)).toBeNull();
		}
		expect(readRemoteAvatarUrl(null, STORAGE)).toBeNull();
		expect(readRemoteAvatarUrl(42, STORAGE)).toBeNull();
		expect(readRemoteAvatarUrl({}, STORAGE)).toBeNull();
	});
});

describe("foto escolhida para a mesa", () => {
	it("sem escolha, anuncia a foto do Google (avatar_url, senão picture)", () => {
		expect(resolveTablePhoto({ avatar_url: GOOGLE }, STORAGE)).toMatchObject({
			mode: "google",
			url: href(GOOGLE),
		});
		expect(resolveTablePhoto({ picture: GOOGLE }, STORAGE).url).toBe(
			href(GOOGLE),
		);
		const other = "https://lh4.googleusercontent.com/b";
		expect(
			resolveTablePhoto({ avatar_url: GOOGLE, picture: other }, STORAGE).url,
		).toBe(href(GOOGLE));
	});

	it("picture salva a mesa quando avatar_url é perigoso", () => {
		expect(
			resolveTablePhoto(
				{ avatar_url: "javascript:alert(1)", picture: GOOGLE },
				STORAGE,
			).url,
		).toBe(href(GOOGLE));
	});

	it("sem escolha e sem foto do Google, a mesa mostra as iniciais", () => {
		expect(resolveTablePhoto({}, STORAGE)).toMatchObject({
			mode: "initials",
			url: null,
		});
		expect(
			resolveTablePhoto(
				{ avatar_url: "https://cdn.discordapp.com/a.png" },
				STORAGE,
			),
		).toMatchObject({ mode: "initials", url: null, googleUrl: null });
	});

	it("só iniciais esconde a foto do Google, mas a opção continua disponível", () => {
		expect(
			resolveTablePhoto(
				{ table_photo: "initials", avatar_url: GOOGLE },
				STORAGE,
			),
		).toMatchObject({
			mode: "initials",
			url: null,
			googleUrl: href(GOOGLE),
		});
	});

	it("foto enviada anuncia o endereço salvo e não a do Google", () => {
		expect(
			resolveTablePhoto(
				{
					table_photo: "custom",
					table_photo_url: R2,
					avatar_url: GOOGLE,
				},
				STORAGE,
			),
		).toMatchObject({
			mode: "custom",
			url: href(R2),
			googleUrl: href(GOOGLE),
		});
	});

	it("endereço salvo perigoso não é anunciado", () => {
		expect(
			resolveTablePhoto(
				{
					table_photo: "custom",
					table_photo_url: "javascript://lh3.googleusercontent.com/a",
					avatar_url: GOOGLE,
				},
				STORAGE,
			),
		).toMatchObject({ mode: "initials", url: null });
	});

	it("as iniciais da prévia são as duas primeiras letras do nome da mesa", () => {
		expect(tablePhotoInitials("Luiz")).toBe("LU");
		expect(tablePhotoInitials("  ab ")).toBe("AB");
		expect(tablePhotoInitials("")).toBe("?");
		expect(tablePhotoInitials("   ")).toBe("?");
	});
});

describe("gravar a escolha na conta", () => {
	it("sem Supabase, avisa e não promete que salvou", async () => {
		expect(await persistTablePhoto(null, "initials")).toMatch(/supabase/i);
	});

	it("foto do Google e iniciais gravam o modo, sem apagar a foto enviada", async () => {
		const updateUser = vi.fn(async () => ({ error: null }));
		const client = { auth: { updateUser } };
		expect(await persistTablePhoto(client, "google")).toBeNull();
		expect(await persistTablePhoto(client, "initials")).toBeNull();
		expect(updateUser).toHaveBeenNthCalledWith(1, {
			data: { table_photo: "google" },
		});
		expect(updateUser).toHaveBeenNthCalledWith(2, {
			data: { table_photo: "initials" },
		});
	});

	it("foto enviada grava só um endereço que a mesa aceita", async () => {
		const updateUser = vi.fn(async () => ({ error: null }));
		const client = { auth: { updateUser } };
		expect(await persistTablePhoto(client, "custom", R2, STORAGE)).toBeNull();
		expect(updateUser).toHaveBeenCalledWith({
			data: { table_photo: "custom", table_photo_url: href(R2) },
		});
		updateUser.mockClear();
		expect(
			await persistTablePhoto(client, "custom", "javascript:alert(1)", STORAGE),
		).toMatch(/mesa/i);
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("devolve a mensagem do Auth quando a gravação falha", async () => {
		const client = {
			auth: {
				updateUser: vi.fn(async () => ({
					error: { message: "Sessão expirada" },
				})),
			},
		};
		expect(await persistTablePhoto(client, "initials")).toBe("Sessão expirada");
	});
});

describe("envio da foto, redimensionado no cliente", () => {
	it("pede o mesmo envio de imagem, lado de 256 px, pasta da foto da mesa", () => {
		expect(tablePhotoUploadOptions()).toEqual({
			folder: "table-photo",
			maxDimension: TABLE_PHOTO_MAX_DIMENSION,
			quality: 0.8,
		});
		expect(TABLE_PHOTO_MAX_DIMENSION).toBe(256);
	});

	it("devolve o endereço aceito e recusa o que o envio devolver de perigoso", async () => {
		const upload = vi.fn(async () => R2);
		await expect(
			uploadTablePhoto(new File(["x"], "a.png"), { upload }, STORAGE),
		).resolves.toBe(href(R2));
		expect(upload).toHaveBeenCalledWith(
			expect.any(File),
			tablePhotoUploadOptions(),
		);
		const bad = vi.fn(async () => "javascript:alert(1)");
		await expect(
			uploadTablePhoto(new File(["x"], "a.png"), { upload: bad }, STORAGE),
		).rejects.toThrow(/mesa/i);
	});

	it("repassa a falha do envio", async () => {
		const upload = vi.fn(async () => {
			throw new Error("Sem rede");
		});
		await expect(
			uploadTablePhoto(new File(["x"], "a.png"), { upload }, STORAGE),
		).rejects.toThrow("Sem rede");
	});
});
