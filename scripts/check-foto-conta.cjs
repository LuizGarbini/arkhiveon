// Prova da foto na mesa: os testes unitários passam e cada mutação perigosa
// quebra pelo menos um deles. Restaura os arquivos mesmo se um teste travar.
// Uso: pnpm check:foto-conta
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const tests = [
	"src/lib/account/table-photo.test.ts",
	"src/lib/vtt/presence-input.test.ts",
	"src/components/account/table-photo-card.test.tsx",
	"src/components/vtt/vtt-presence-bar.test.tsx",
];

const files = {
	photo: "src/lib/account/table-photo.ts",
	presence: "src/lib/vtt/presence-input.ts",
	bar: "src/components/vtt/vtt-presence-bar.tsx",
	vtt: "src/routes/campaigns/$campaignId/vtt.tsx",
	account: "src/routes/account.tsx",
	storage: "src/lib/image-storage.ts",
};

const abs = (rel) => path.join(root, rel);
const read = (rel) => fs.readFileSync(abs(rel), "utf8");

function fail(message) {
	console.error(`foto-conta: ${message}`);
	process.exitCode = 1;
}

function runTests() {
	const result = spawnSync(
		"pnpm",
		["exec", "vitest", "run", "--configLoader", "runner", "--reporter=dot", ...tests],
		{ cwd: root, encoding: "utf8", timeout: 120000 },
	);
	return { ok: result.status === 0, output: `${result.stdout || ""}\n${result.stderr || ""}` };
}

const originals = new Map(
	["photo", "presence", "bar"].map((key) => [key, read(files[key])]),
);

function restore() {
	for (const [key, source] of originals) {
		fs.writeFileSync(abs(files[key]), source);
	}
}

const mutations = [
	{
		name: "aceita javascript:, data: e http",
		file: "photo",
		from: "\tif (url.port) return null;\n\tif (url.protocol !== \"https:\") return null;\n\tconst googleHost = GOOGLE_PHOTO_HOSTS.has(url.hostname);",
		to: "\tif (url.port) return null;\n\tif (false) return null;\n\tconst googleHost = GOOGLE_PHOTO_HOSTS.has(url.hostname);",
	},
	{
		name: "aceita usuário e senha na URL",
		file: "photo",
		from: "\tif (url.username || url.password) return null;\n\tif (url.port) return null;",
		to: "\tif (false) return null;\n\tif (url.port) return null;",
	},
	{
		name: "deixa de aceitar a foto do Google",
		file: "photo",
		from: "\tconst googleHost = GOOGLE_PHOTO_HOSTS.has(url.hostname);",
		to: "\tconst googleHost = false;",
	},
	{
		name: "deixa de aceitar o storage do projeto",
		file: "photo",
		from: "\tconst projectStorage = isProjectStorageUrl(url, config);",
		to: "\tconst projectStorage = false;",
	},
	{
		name: "aceita qualquer https",
		file: "photo",
		from: "\tif (googleHost || projectStorage) return url.href;",
		to: "\tif (true) return url.href;",
	},
	{
		name: "iniciais continuam anunciando a foto do Google",
		file: "photo",
		from: "\tif (saved === \"initials\") {\n\t\treturn choice(\"initials\", null, googleUrl, customUrl);\n\t}",
		to: "\tif (saved === \"initials\") {\n\t\treturn choice(\"initials\", googleUrl, googleUrl, customUrl);\n\t}",
	},
	{
		name: "sem escolha, ignora a foto do Google",
		file: "photo",
		from: "\tif (googleUrl) {\n\t\treturn choice(\"google\", googleUrl, googleUrl, customUrl);\n\t}",
		to: "\tif (false) {\n\t\treturn choice(\"google\", googleUrl, googleUrl, customUrl);\n\t}",
	},
	{
		name: "o envio não pede o redimensionamento de 256 px",
		file: "photo",
		from: "export const TABLE_PHOTO_MAX_DIMENSION = 256;",
		to: "export const TABLE_PHOTO_MAX_DIMENSION = 4000;",
	},
	{
		name: "a presença confia no endereço que o outro cliente mandou",
		file: "presence",
		from: "\t\t\tavatarUrl: readRemoteAvatarUrl(latest.avatarUrl, photoConfig),",
		to: "\t\t\tavatarUrl: typeof latest.avatarUrl === \"string\" ? latest.avatarUrl : null,",
	},
	{
		name: "a barra desenha o endereço cru, inclusive javascript:",
		file: "bar",
		from: "\t\t\t\t\tconst photo = readRemoteAvatarUrl(u.avatarUrl);",
		to: "\t\t\t\t\tconst photo = typeof u.avatarUrl === \"string\" ? u.avatarUrl : null;",
	},
];

function wiring() {
	const vtt = read(files.vtt);
	const account = read(files.account);
	const storage = read(files.storage);
	const problems = [];
	const announced = vtt.match(/avatarUrl: resolveTablePhoto\(user\.user_metadata\)\.url/g);
	if (!announced || announced.length < 2) {
		problems.push("a presença da mesa não anuncia a foto escolhida nos dois envios");
	}
	if (vtt.includes("user.user_metadata?.avatar_url")) {
		problems.push("a mesa ainda anuncia avatar_url cru");
	}
	if (!account.includes("TablePhotoCard") || !account.includes("uploadTablePhoto")) {
		problems.push("Minha conta não oferece Foto na mesa pelo envio existente");
	}
	if (!storage.includes("encodedImageFile")) {
		problems.push("o envio de imagem deixou de usar encoded-image");
	}
	return problems;
}

function main() {
	const wired = wiring();
	if (wired.length > 0) {
		for (const problem of wired) fail(problem);
		return;
	}

	for (const mutation of mutations) {
		const source = originals.get(mutation.file);
		const count = source.split(mutation.from).length - 1;
		if (count !== 1) {
			fail(`mutação "${mutation.name}" não achou o trecho uma vez só (achou ${count})`);
			return;
		}
	}

	const baseline = runTests();
	if (!baseline.ok) {
		console.error(baseline.output);
		fail("os testes deviam passar antes das mutações");
		return;
	}
	console.log("foto-conta: testes ok");

	try {
		for (const mutation of mutations) {
			const source = originals.get(mutation.file);
			fs.writeFileSync(abs(files[mutation.file]), source.replace(mutation.from, mutation.to));
			const result = runTests();
			restore();
			if (result.ok) {
				fail(`mutação sobreviveu: ${mutation.name}`);
				return;
			}
			console.log(`mutação morta: ${mutation.name}`);
		}
	} finally {
		restore();
	}

	if (process.exitCode) return;
	console.log("foto-conta: todas as mutações quebraram os testes");
}

main();
