#!/usr/bin/env node
/**
 * Prova da Fatia 1a + capas F2 (Biblioteca/R2) — negações + extras.
 *
 * F2 usa os mesmos JWTs. request-thumb-upload manda { fileId, size }
 * (Content-Length assinado, teto 153600). Não imprime URL nem token.
 *
 * RODAR SÓ CONTRA AMBIENTE DE TESTE, com a função `library-r2` publicada e
 * LIBRARY_TEST_MODE=1 nos secrets dela. Não imprime tokens nem URLs assinadas
 * (só status e se veio URL ou não).
 *
 * Variáveis (o Luiz preenche no próprio terminal; nada é commitado):
 *   LIB_FN_URL        https://<ref>.supabase.co/functions/v1/library-r2
 *   LIB_ANON_KEY      anon key do projeto de teste
 *   LIB_ORIGIN        origem enviada (padrão https://arkhiveon.com.br)
 *   LIB_CAMPAIGN_A    campanha no piloto (mestre, editor e jogador são membros)
 *   LIB_CAMPAIGN_B    campanha FORA do piloto, cujo mestre é LIB_JWT_OTHER
 *   LIB_JWT_OWNER     access token do mestre de A
 *   LIB_JWT_EDITOR    access token do editor de A
 *   LIB_JWT_PLAYER    access token do jogador (viewer) de A
 *   LIB_JWT_OUTSIDER  access token de quem não é membro de A
 *   LIB_JWT_OTHER     access token do mestre de B (não membro de A)
 *   LIB_SUPABASE_URL  https://<ref>.supabase.co (para checar SELECT na tabela)
 *
 * Uso: node supabase/tests/library-r2-proof.mjs
 * Saída: uma linha "ok"/"FALHOU" por caso e um resumo. Exit 1 se algo falhar.
 */

const env = (name, fallback) => {
	const value = process.env[name] ?? fallback
	if (!value) {
		console.error(`Falta a variável ${name}`)
		process.exit(2)
	}
	return value
}

const FN = env('LIB_FN_URL')
const ANON = env('LIB_ANON_KEY')
const ORIGIN = env('LIB_ORIGIN', 'https://arkhiveon.com.br')
const A = env('LIB_CAMPAIGN_A')
const B = env('LIB_CAMPAIGN_B')
const SB = env('LIB_SUPABASE_URL')
const T = {
	owner: env('LIB_JWT_OWNER'),
	editor: env('LIB_JWT_EDITOR'),
	player: env('LIB_JWT_PLAYER'),
	outsider: env('LIB_JWT_OUTSIDER'),
	other: env('LIB_JWT_OTHER'),
}

const results = []
const record = (name, pass, detail = '') => {
	results.push(pass)
	console.log(
		`${pass ? 'ok' : 'FALHOU'} — ${name}${detail ? ` (${detail})` : ''}`,
	)
}

async function call(token, payload) {
	const res = await fetch(FN, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			apikey: ANON,
			'Content-Type': 'application/json',
			Origin: ORIGIN,
		},
		body: JSON.stringify(payload),
	})
	const body = await res.json().catch(() => ({}))
	return { status: res.status, body }
}

const hasUrl = (body) => {
	if (typeof body?.uploadUrl === 'string' || typeof body?.url === 'string')
		return true
	const urls = body?.urls
	if (!urls || typeof urls !== 'object') return false
	return Object.values(urls).some((value) => typeof value === 'string')
}

/** WebP mínimo: RIFF nos bytes 0–3 e WEBP nos 8–11. */
function tinyWebp(size = 32) {
	const bytes = new Uint8Array(size)
	bytes.set(new TextEncoder().encode('RIFF'), 0)
	bytes.set(new TextEncoder().encode('WEBP'), 8)
	return bytes
}

async function uploadThumb(token, fileId, bytes) {
	const req = await call(token, {
		action: 'request-thumb-upload',
		fileId,
		size: bytes.length,
	})
	if (req.status !== 200 || typeof req.body.uploadUrl !== 'string')
		return { req }
	const put = await fetch(req.body.uploadUrl, {
		method: 'PUT',
		headers: req.body.headers,
		body: bytes,
	})
	return { req, put }
}

/** PDF mínimo válido (bytes começam com %PDF-). */
function tinyPdf() {
	const text =
		'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
	return new TextEncoder().encode(text)
}

async function uploadAs(token, bytes, overrideHeaders) {
	const req = await call(token, {
		action: 'request-upload',
		campaignId: A,
		title: 'Prova 1a',
		size: bytes.length,
		contentType: 'application/pdf',
	})
	if (req.status !== 200 || !req.body.uploadUrl) return { req }
	const put = await fetch(req.body.uploadUrl, {
		method: 'PUT',
		headers: overrideHeaders ?? req.body.headers,
		body: bytes,
	})
	return { req, put, fileId: req.body.fileId }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- Preparação: mestre envia um PDF válido (controle positivo) ----
const pdf = tinyPdf()
const up = await uploadAs(T.owner, pdf)
record(
	'controle: mestre recebe link de upload',
	up.req.status === 200 && hasUrl(up.req.body),
	`status ${up.req.status}`,
)
record(
	'controle: PUT no R2 aceito',
	up.put?.ok === true,
	`status ${up.put?.status}`,
)
const conf = await call(T.owner, {
	action: 'confirm-upload',
	fileId: up.fileId,
})
record(
	'controle: confirm-upload deixa ready',
	conf.status === 200 && conf.body.status === 'ready',
	`status ${conf.status}`,
)
const fileId = up.fileId

// ---- 1. Não-membro: nenhum link ----
{
	const read = await call(T.outsider, { action: 'request-read', fileId })
	record(
		'N1 não-membro: request-read negado sem URL',
		read.status === 403 && !hasUrl(read.body),
		`status ${read.status}`,
	)
	const upl = await call(T.outsider, {
		action: 'request-upload',
		campaignId: A,
		title: 'x',
		size: 10,
		contentType: 'application/pdf',
	})
	record(
		'N1 não-membro: request-upload negado sem URL',
		upl.status === 403 && !hasUrl(upl.body),
		`status ${upl.status}`,
	)
	const sel = await fetch(
		`${SB}/rest/v1/campaign_library_files?select=id&campaign_id=eq.${A}`,
		{
			headers: { Authorization: `Bearer ${T.outsider}`, apikey: ANON },
		},
	)
	const rows = await sel.json().catch(() => null)
	record(
		'N1 não-membro: SELECT na tabela = 0 linhas',
		Array.isArray(rows) && rows.length === 0,
		`linhas ${Array.isArray(rows) ? rows.length : '?'}`,
	)
}

// ---- 2. Jogador: sem link de upload, sem apagar; lê (controle) ----
{
	const upl = await call(T.player, {
		action: 'request-upload',
		campaignId: A,
		title: 'x',
		size: 10,
		contentType: 'application/pdf',
	})
	record(
		'N2 jogador: request-upload negado sem URL',
		upl.status === 403 && !hasUrl(upl.body),
		`status ${upl.status}`,
	)
	const del = await call(T.player, { action: 'delete', fileId })
	record(
		'N2 jogador: delete negado',
		del.status === 403,
		`status ${del.status}`,
	)
	const read = await call(T.player, { action: 'request-read', fileId })
	record(
		'controle: jogador recebe link de leitura',
		read.status === 200 && hasUrl(read.body),
		`status ${read.status}`,
	)
	if (read.body.url) {
		const get = await fetch(read.body.url, { headers: { Origin: ORIGIN } })
		record('controle: GET assinado baixa o PDF', get.ok, `status ${get.status}`)
	}
}

// ---- 3. Outra campanha não envia ----
{
	const intoA = await call(T.other, {
		action: 'request-upload',
		campaignId: A,
		title: 'x',
		size: 10,
		contentType: 'application/pdf',
	})
	record(
		'N3 mestre de B enviando para A: negado sem URL',
		intoA.status === 403 && !hasUrl(intoA.body),
		`status ${intoA.status}`,
	)
	const intoB = await call(T.other, {
		action: 'request-upload',
		campaignId: B,
		title: 'x',
		size: 10,
		contentType: 'application/pdf',
	})
	record(
		'N3 campanha B fora do piloto: negado sem URL',
		intoB.status === 403 && !hasUrl(intoB.body),
		`status ${intoB.status}`,
	)
}

// ---- 4. Link vencido falha ----
{
	const read = await call(T.owner, {
		action: 'request-read',
		fileId,
		ttlSeconds: 2,
	})
	const shortTtl = read.body.expiresIn === 2
	if (!shortTtl) {
		record(
			'N4 link vencido',
			false,
			'LIBRARY_TEST_MODE=1 não está ligado na função',
		)
	} else {
		await sleep(5000)
		const get = await fetch(read.body.url)
		record(
			'N4 GET assinado vencido falha',
			get.status === 403,
			`status ${get.status}`,
		)
	}
}

// ---- Extras ----
{
	// URL sem assinatura: deve falhar (bucket privado).
	const read = await call(T.owner, { action: 'request-read', fileId })
	if (read.body.url) {
		const bare = read.body.url.split('?')[0]
		const get = await fetch(bare)
		record(
			'X1 objeto sem assinatura é negado',
			get.status === 400 || get.status === 403,
			`status ${get.status}`,
		)
	}

	// R2 x tamanho assinado: PUT com Content-Length diferente do assinado.
	const req = await call(T.editor, {
		action: 'request-upload',
		campaignId: A,
		title: 'tamanho',
		size: pdf.length,
		contentType: 'application/pdf',
	})
	if (req.body.uploadUrl) {
		const bigger = new Uint8Array(pdf.length + 1024)
		bigger.set(pdf)
		const put = await fetch(req.body.uploadUrl, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/pdf' },
			body: bigger,
		})
		record(
			'X2 R2 recusa PUT com tamanho diferente do assinado',
			!put.ok,
			`status ${put.status} — se ok=FALHOU, o confirm-upload ainda barra (X4)`,
		)
		const c = await call(T.editor, {
			action: 'confirm-upload',
			fileId: req.body.fileId,
		})
		record(
			'X2b confirm-upload barra tamanho diferente',
			c.status === 422 || c.status === 409,
			`status ${c.status}`,
		)
	}

	// Tipo diferente do assinado.
	const reqType = await call(T.editor, {
		action: 'request-upload',
		campaignId: A,
		title: 'tipo',
		size: pdf.length,
		contentType: 'application/pdf',
	})
	if (reqType.body.uploadUrl) {
		const put = await fetch(reqType.body.uploadUrl, {
			method: 'PUT',
			headers: { 'Content-Type': 'text/plain' },
			body: pdf,
		})
		record(
			'X3 R2 recusa PUT com Content-Type diferente do assinado',
			!put.ok,
			`status ${put.status}`,
		)
	}

	// Não-PDF com tipo/tamanho corretos → confirm-upload 422 e objeto apagado.
	const fake = new TextEncoder().encode('isto nao e um pdf, so texto.')
	const upFake = await uploadAs(T.editor, fake)
	if (upFake.fileId) {
		const c = await call(T.editor, {
			action: 'confirm-upload',
			fileId: upFake.fileId,
		})
		record(
			'X4 não-PDF recusado no confirm-upload',
			c.status === 422,
			`status ${c.status}`,
		)
		const again = await call(T.editor, {
			action: 'request-read',
			fileId: upFake.fileId,
		})
		record(
			'X4b não-PDF não fica legível',
			again.status === 403,
			`status ${again.status}`,
		)
	}

	// Acima de 200 MB recusado antes de gerar link.
	const big = await call(T.owner, {
		action: 'request-upload',
		campaignId: A,
		title: 'grande',
		size: 200 * 1024 * 1024 + 1,
		contentType: 'application/pdf',
	})
	record(
		'X5 acima de 200 MB recusado sem URL',
		big.status === 413 && !hasUrl(big.body),
		`status ${big.status}`,
	)

	// Tipo declarado não-PDF.
	const png = await call(T.owner, {
		action: 'request-upload',
		campaignId: A,
		title: 'img',
		size: 10,
		contentType: 'image/png',
	})
	record(
		'X6 tipo não-PDF recusado sem URL',
		png.status === 415 && !hasUrl(png.body),
		`status ${png.status}`,
	)
}

// ---- F2 capas WebP ----
let savedThumbUrl
if (!fileId) {
	record('F2 capas', false, 'sem PDF pronto de controle')
} else {
	const webp = tinyWebp(32)
	const upThumb = await uploadThumb(T.owner, fileId, webp)
	record(
		'F2 mestre recebe PUT da capa',
		upThumb.req.status === 200 && hasUrl(upThumb.req.body),
		`status ${upThumb.req.status}`,
	)
	record(
		'F2 PUT da capa no R2 aceito',
		upThumb.put?.ok === true,
		`status ${upThumb.put?.status}`,
	)
	const confThumb = await call(T.owner, { action: 'confirm-thumb', fileId })
	record(
		'F2 confirm-thumb deixa a capa ready',
		confThumb.status === 200 && confThumb.body.thumbStatus === 'ready',
		`status ${confThumb.status}`,
	)

	const playerUp = await call(T.player, {
		action: 'request-thumb-upload',
		fileId,
		size: webp.length,
	})
	record(
		'F2 jogador: request-thumb-upload negado sem URL',
		playerUp.status === 403 && !hasUrl(playerUp.body),
		`status ${playerUp.status}`,
	)
	const playerConf = await call(T.player, { action: 'confirm-thumb', fileId })
	record(
		'F2 jogador: confirm-thumb negado',
		playerConf.status === 403,
		`status ${playerConf.status}`,
	)
	const playerFail = await call(T.player, {
		action: 'report-thumb-failed',
		fileId,
	})
	record(
		'F2 jogador: report-thumb-failed negado',
		playerFail.status === 403,
		`status ${playerFail.status}`,
	)
	const playerRead = await call(T.player, {
		action: 'request-thumb-reads',
		campaignId: A,
		fileIds: [fileId],
	})
	const playerUrl = playerRead.body?.urls?.[fileId]
	record(
		'F2 jogador: request-thumb-reads da capa',
		playerRead.status === 200 && typeof playerUrl === 'string',
		`status ${playerRead.status}`,
	)
	if (typeof playerUrl === 'string') {
		const get = await fetch(playerUrl)
		record(
			'F2 GET assinado da capa baixa o WebP',
			get.ok,
			`status ${get.status}`,
		)
		savedThumbUrl = playerUrl
	}

	for (const payload of [
		{ action: 'request-thumb-upload', fileId, size: webp.length },
		{ action: 'confirm-thumb', fileId },
		{ action: 'report-thumb-failed', fileId },
		{ action: 'request-thumb-reads', campaignId: A, fileIds: [fileId] },
	]) {
		const res = await call(T.other, payload)
		record(
			`F2 conta B: ${payload.action} negado`,
			res.status === 403 && !hasUrl(res.body),
			`status ${res.status}`,
		)
	}

	const fakeThumb = tinyWebp(24)
	fakeThumb.set(new TextEncoder().encode('WAVE'), 8)
	const upFakeThumb = await uploadThumb(T.owner, fileId, fakeThumb)
	if (upFakeThumb.put?.ok) {
		const bad = await call(T.owner, { action: 'confirm-thumb', fileId })
		record(
			'F2 WebP falso: confirm 422',
			bad.status === 422,
			`status ${bad.status}`,
		)
	} else {
		record(
			'F2 WebP falso: PUT da prova',
			false,
			`status ${upFakeThumb.put?.status ?? upFakeThumb.req.status}`,
		)
	}
	const still = await call(T.owner, {
		action: 'request-thumb-reads',
		campaignId: A,
		fileIds: [fileId],
	})
	const stillUrl = still.body?.urls?.[fileId]
	record(
		'F2 WebP falso não apaga a capa que já estava ready',
		still.status === 200 && typeof stillUrl === 'string',
		`status ${still.status}`,
	)
	if (typeof stillUrl === 'string') {
		const get = await fetch(stillUrl)
		record(
			'F2 capa pronta continua no armazenamento depois do WebP falso',
			get.ok,
			`status ${get.status}`,
		)
		savedThumbUrl = stillUrl
	}

	const tooBig = await call(T.owner, {
		action: 'request-thumb-upload',
		fileId,
		size: 153601,
	})
	record(
		'F2 capa acima de 150 KB recusada sem URL',
		tooBig.status === 413 && !hasUrl(tooBig.body),
		`status ${tooBig.status}`,
	)

	const pendingPdf = await uploadAs(T.owner, pdf)
	if (pendingPdf.fileId) {
		const early = await call(T.owner, {
			action: 'request-thumb-upload',
			fileId: pendingPdf.fileId,
			size: 32,
		})
		record(
			'F2 PDF que não está ready: capa recusada',
			early.status === 403 && !hasUrl(early.body),
			`status ${early.status}`,
		)
		await call(T.owner, { action: 'delete', fileId: pendingPdf.fileId })
	}

	const many = Array.from(
		{ length: 61 },
		(_, i) => `30000000-0000-4000-8000-${i.toString(16).padStart(12, '0')}`,
	)
	const tooMany = await call(T.owner, {
		action: 'request-thumb-reads',
		campaignId: A,
		fileIds: many,
	})
	record(
		'F2 request-thumb-reads com 61 ids recusado',
		tooMany.status === 400,
		`status ${tooMany.status}`,
	)

	const reported = await call(T.owner, {
		action: 'report-thumb-failed',
		fileId,
	})
	const sel = await fetch(
		`${SB}/rest/v1/campaign_library_files?select=thumb_status&id=eq.${fileId}`,
		{ headers: { Authorization: `Bearer ${T.owner}`, apikey: ANON } },
	)
	const selRows = await sel.json().catch(() => null)
	const thumbStatus = Array.isArray(selRows) ? selRows[0]?.thumb_status : null
	record(
		'F2 report-thumb-failed em capa ready não altera',
		reported.status === 200 && thumbStatus === 'ready',
		`status ${reported.status}`,
	)
}

if (fileId) {
	const del = await call(T.owner, { action: 'delete', fileId })
	record(
		'limpeza: mestre apaga o PDF de prova',
		del.status === 200,
		`status ${del.status}`,
	)
	if (typeof savedThumbUrl === 'string') {
		const gone = await fetch(savedThumbUrl)
		record(
			'F2 delete também apaga a miniatura',
			!gone.ok,
			`status ${gone.status}`,
		)
	} else {
		record(
			'F2 delete também apaga a miniatura',
			false,
			'sem URL de capa para conferir',
		)
	}
}

const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} casos ok`)
process.exit(failed ? 1 : 0)
