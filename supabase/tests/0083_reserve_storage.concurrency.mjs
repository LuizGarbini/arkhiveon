// Corrida da reserva (0083), CA5: 10 reservas paralelas de 5 MB com 20 MB
// livres no free. O lock por pagador deixa entrar exatamente 4, e a soma em
// storage_objects nunca passa do limite.
//
// SÓ Postgres local descartável (127.0.0.1/localhost) com 0082–0086 aplicadas
// e sem campanha nenhuma. Grava dados de teste com commit (cada reserva é uma
// conexão) e apaga tudo no fim, mesmo se falhar.
// Uso: LOCAL_DB_URL=postgresql://postgres@127.0.0.1:54322/postgres node supabase/tests/0083_reserve_storage.concurrency.mjs
import assert from 'node:assert/strict'
import { Client } from 'pg'

const url = new URL(
	process.env.LOCAL_DB_URL ||
		'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
)
assert.ok(
	['127.0.0.1', 'localhost', '::1'].includes(url.hostname),
	'somente Postgres local (loopback)',
)

const config = {
	host: url.hostname,
	port: Number(url.port || 5432),
	database: url.pathname.replace(/^\//, '') || 'postgres',
	user: decodeURIComponent(url.username || 'postgres'),
	password: decodeURIComponent(url.password || 'postgres'),
}

const ids = {
	owner: '00000000-0000-0000-0000-00000000c0a1',
	player: '00000000-0000-0000-0000-00000000c0f1',
	world: '10000000-0000-0000-0000-00000000c0a1',
	campaign: '20000000-0000-0000-0000-00000000c0a1',
}
const LIMIT = 100_000_000
const USED = 80_000_000
const SIZE = 5_000_000
const PARALLEL = 10

const admin = new Client(config)

async function cleanup() {
	await admin.query('delete from public.storage_objects where owner_id = $1', [
		ids.owner,
	])
	await admin.query('delete from public.campaigns where id = $1', [
		ids.campaign,
	])
	await admin.query('delete from public.worlds where id = $1', [ids.world])
	await admin.query('delete from public.user_plans where user_id = any($1)', [
		[ids.owner, ids.player],
	])
	await admin.query('delete from auth.users where id = any($1)', [
		[ids.owner, ids.player],
	])
}

async function reserve(index) {
	const client = new Client(config)
	await client.connect()
	try {
		await client.query('begin')
		await client.query('set local role service_role')
		const who = index % 2 === 0 ? ids.owner : ids.player
		await client.query(
			"select public.reserve_storage($1::uuid, $2::uuid, $3::bigint, 'image', $4::text)",
			[who, ids.campaign, SIZE, `corrida/${index}.webp`],
		)
		// Segura a transação um pouco para as outras baterem no lock.
		await client.query('select pg_sleep(0.05)')
		await client.query('commit')
		return 'ok'
	} catch (error) {
		await client.query('rollback').catch(() => {})
		if (error.message === 'quota_exceeded') return 'quota_exceeded'
		throw error
	} finally {
		await client.end()
	}
}

await admin.connect()
try {
	const { rows } = await admin.query(
		'select exists(select 1 from public.campaigns) as busy',
	)
	assert.equal(rows[0].busy, false, 'banco tem campanha: use um descartável')

	await admin.query(
		"insert into auth.users (id, email) values ($1, 'corrida-mestre@example.invalid'), ($2, 'corrida-jogador@example.invalid')",
		[ids.owner, ids.player],
	)
	await admin.query(
		"insert into public.worlds (id, owner_user_id, name) values ($1, $2, 'Mundo corrida')",
		[ids.world, ids.owner],
	)
	await admin.query(
		"insert into public.campaigns (id, owner_id, world_id, name) values ($1, $2, $3, 'Campanha corrida')",
		[ids.campaign, ids.owner, ids.world],
	)
	await admin.query(
		"insert into public.memberships (campaign_id, user_id, role) values ($1, $2, 'viewer')",
		[ids.campaign, ids.player],
	)
	await admin.query(
		"insert into public.storage_objects (owner_id, campaign_id, uploaded_by, bucket, r2_key, kind, size_bytes, status, ready_at) values ($1, $2, $1, 'library', 'corrida/base.pdf', 'pdf', $3, 'ready', now())",
		[ids.owner, ids.campaign, USED],
	)

	const results = await Promise.all(
		Array.from({ length: PARALLEL }, (_, index) => reserve(index)),
	)
	const ok = results.filter((r) => r === 'ok').length
	const refused = results.filter((r) => r === 'quota_exceeded').length

	const sum = Number(
		(
			await admin.query(
				'select coalesce(sum(size_bytes), 0) as s from public.storage_objects where owner_id = $1',
				[ids.owner],
			)
		).rows[0].s,
	)
	const cache = Number(
		(
			await admin.query(
				'select storage_used_bytes as s from public.user_plans where user_id = $1',
				[ids.owner],
			)
		).rows[0].s,
	)

	assert.equal(ok, 4, `esperava 4 reservas, entraram ${ok}`)
	assert.equal(refused, PARALLEL - 4)
	assert.ok(sum <= LIMIT, `soma ${sum} passou do limite`)
	assert.equal(sum, USED + 4 * SIZE)
	assert.equal(cache, sum, 'storage_used_bytes deve bater com storage_objects')
	console.log(
		`0083 concurrency: ${ok} reservas / ${refused} quota_exceeded; soma ${sum} <= ${LIMIT}; cache = soma`,
	)
} finally {
	await cleanup()
	await admin.end()
}
