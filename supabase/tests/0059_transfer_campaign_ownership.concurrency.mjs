import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

// arkhiveon local ONLY: set LOCAL_DB_URL to loopback + known DB and reject every other target.
const ids = {
	a: '80000000-0000-4000-8000-0000000000a1',
	b: '80000000-0000-4000-8000-0000000000b1',
	c: '80000000-0000-4000-8000-0000000000c1',
	world: '81000000-0000-4000-8000-0000000000a1',
	campaign: '82000000-0000-4000-8000-0000000000a1',
}
const url = new URL(
	process.env.LOCAL_DB_URL ||
		'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.port, '54322')
assert.equal(url.pathname, '/postgres')
const docker = spawnSync(
	'docker',
	[
		'inspect',
		'supabase_db_arkhiveon',
		'--format',
		'{{json .State.Running}} {{json .Config.Labels}} {{json .NetworkSettings.Networks}}',
	],
	{ encoding: 'utf8', timeout: 10000 },
)
assert.equal(docker.status, 0)
assert.match(docker.stdout, /^true /)
assert.match(docker.stdout, /"com.supabase.cli.project":"arkhiveon"/)
const config = {
	host: url.hostname,
	port: Number(url.port),
	database: 'postgres',
	user: url.username || 'postgres',
	password: url.password || 'postgres',
}
const admin = new Client(config),
	gate = new Client(config),
	bClient = new Client(config),
	cClient = new Client(config)
const barrier = 999859
let fixture = false,
	proven = false
const ready = []
function newReady() {
	let resolve
	const promise = new Promise((r) => {
		resolve = r
	})
	ready.push(promise)
	return resolve
}
const deadline = setTimeout(() => {
	console.error('CONCURRENCY_TIMEOUT')
	process.exit(124)
}, 25000)
async function request(client, target, delay, markReady) {
	const result = { target }
	try {
		await client.query('begin')
		await client.query('set local role authenticated')
		await client.query(
			"select set_config('request.jwt.claims',json_build_object('sub',$1::text,'email','race-a@f1.local','role','authenticated')::text,true)",
			[ids.a],
		)
		const identity = (
			await client.query(
				"select pg_backend_pid() pid,current_user db_role,session_user,auth.uid() jwt_uid,auth.jwt()->>'email' email",
			)
		).rows[0]
		assert.equal(identity.db_role, 'authenticated')
		assert.equal(identity.jwt_uid, ids.a)
		assert.equal(identity.email, 'race-a@f1.local')
		result.identity = identity
		markReady()
		// One SQL statement serializes barrier release, the closely spaced callers and the async result.
		const response = await client.query(
			'select t.* from (select pg_sleep($1)) timer,(select pg_advisory_xact_lock($4::bigint)) lock_boundary, lateral(select * from public.transfer_campaign_ownership($2,$3)) t',
			[delay, ids.campaign, target, barrier],
		)
		await client.query('commit')
		result.outcome = 'SUCCESS'
		result.rowCount = response.rowCount
		result.rows = response.rows
		return result
	} catch (error) {
		await client.query('rollback').catch(() => {})
		result.outcome = 'ERROR'
		result.sqlState = error.code
		result.message = error.message
		return result
	}
}
async function setupFixture() {
	await admin.query('begin')
	await admin.query(
		"insert into auth.users(id,email) values($1,'race-a@f1.local'),($2,'race-b@f1.local'),($3,'race-c@f1.local')",
		[ids.a, ids.b, ids.c],
	)
	await admin.query(
		"insert into auth.identities(user_id,id,provider,provider_id,identity_data,last_sign_in_at,created_at,updated_at) select id,id,'email',id::text,'{}'::jsonb,now(),now(),now() from auth.users where id=any(array[$1,$2]::uuid[]) union all select id,id,'email',id::text,'{}'::jsonb,now(),now(),now() from auth.users where id=$3",
		[ids.a, ids.b, ids.c],
	)
	await admin.query(
		"insert into public.worlds(id,owner_user_id,name) values($1,$2,'race')",
		[ids.world, ids.a],
	)
	await admin.query(
		"insert into public.campaigns(id,owner_id,name,world_id) values($1,$2,'race',$3)",
		[ids.campaign, ids.a, ids.world],
	)
	await admin.query(
		"insert into public.memberships(campaign_id,user_id,role) values($1,$2,'viewer'),($1,$3,'editor')",
		[ids.campaign, ids.b, ids.c],
	)
	await admin.query('commit')
	fixture = true
}
async function cleanup() {
	await admin.query('rollback').catch(() => {})
	await admin.query('begin')
	await admin.query("set local session_replication_role='replica'")
	// Fixture-only cleanup in this socket; does not alter/deploy migration guard/policies.
	await admin.query(
		`insert into private.campaign_ownership_operations(operation_id,campaign_id,previous_owner_id,new_owner_id,previous_membership_id,target_membership_id)
 select gen_random_uuid(),c.id,c.owner_id,c.owner_id,m.id,m.id from public.campaigns c join public.memberships m on m.campaign_id=c.id and m.user_id=c.owner_id and m.role='owner' where c.id=$1`,
		[ids.campaign],
	)
	const operation = (
		await admin.query(
			'select operation_id from private.campaign_ownership_operations where campaign_id=$1',
			[ids.campaign],
		)
	).rows[0]?.operation_id
	if (operation) {
		await admin.query(
			"select set_config('arkhiveon.ownership_operation_id',$1,true)",
			[operation],
		)
		await admin.query('set local role authenticated')
		await admin.query(
			"select set_config('request.jwt.claims',json_build_object('sub',$1::text,'role','authenticated')::text,true)",
			[ids.a],
		)
		await admin.query(
			"update public.memberships set role='editor' where campaign_id=$1 and user_id=$2 and role='owner'",
			[ids.campaign, ids.a],
		)
		await admin.query('reset role')
	}
	await admin.query('delete from public.memberships where campaign_id=$1', [
		ids.campaign,
	])
	await admin.query(
		"select set_config('arkhiveon.ownership_operation_id','',false)",
	)
	await admin.query(
		'delete from private.campaign_ownership_operations where campaign_id=$1',
		[ids.campaign],
	)
	await admin.query(
		'delete from auth.identities where user_id=any(array[$1,$2,$3]::uuid[])',
		[ids.a, ids.b, ids.c],
	)
	await admin.query('delete from public.campaigns where world_id=$1', [
		ids.world,
	])
	await admin.query('delete from public.worlds where id=$1', [ids.world])
	await admin.query(
		'delete from auth.users where id=any(array[$1,$2,$3]::uuid[])',
		[ids.a, ids.b, ids.c],
	)
	await admin.query('commit')
}
try {
	await admin.connect()
	await gate.connect()
	await bClient.connect()
	await cClient.connect()
	const target = (
		await admin.query(
			"select inet_server_addr()::text host,inet_server_port() port,current_setting('server_version') version",
		)
	).rows[0]
	assert.ok(
		docker.stdout.includes(JSON.stringify(target.host.split('/')[0])),
		`target must be local docker bridge, not ${target.host}`,
	)
	assert.equal(target.port, 5432)
	console.log('CONCURRENCY_LOCAL', JSON.stringify(target))
	await cleanup() // Scoped ID range only, allowing a clean retry after intentionally cancelled local test.
	await setupFixture()
	await gate.query('select pg_advisory_lock($1::bigint)', [barrier])
	const asyncB = request(bClient, ids.b, 2, newReady())
	const printedB = asyncB.then((r) =>
		console.log('B_WORKER', JSON.stringify(r)),
	)
	const asyncC = request(cClient, ids.c, 0.05, newReady())
	const printedC = asyncC.then((r) =>
		console.log('C_WORKER', JSON.stringify(r)),
	)
	let authenticated = []
	for (let n = 0; n < 100; n++) {
		authenticated = (
			await admin.query(
				'select pid,usename,wait_event_type,wait_event from pg_stat_activity where pid=any(array[$1,$2]::int[])',
				[bClient.processID, cClient.processID],
			)
		).rows
		await Promise.resolve()
		if (
			authenticated.length === 2 &&
			authenticated.every((row) => row.wait_event === 'advisory' || proven)
		)
			break
		await new Promise((resolve) => setTimeout(resolve, 20))
	}
	await Promise.all(ready)
	console.log('AUTHENTICATED_PARALLEL_BARRIER', JSON.stringify(authenticated))
	assert.equal(authenticated.length, 2)
	assert.ok(authenticated.every((r) => r.wait_event === 'advisory'))
	assert.equal(new Set(authenticated.map((r) => r.pid)).size, 2)
	await Promise.race([
		Promise.all(ready),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error('worker readiness timeout')), 5000),
		),
	])
	await gate.query('select pg_advisory_unlock($1::bigint)', [barrier])
	let waiting = []
	for (let n = 0; n < 80; n++) {
		waiting = (
			await admin.query(
				`select a.pid,a.usename,a.usesysid,a.state,a.wait_event_type,a.wait_event,l.locktype,l.mode,l.relation::regclass::text relation,l.objid,l.objsubid,l.classid::regclass::text classid,left(a.query,60) query from pg_stat_activity a left join pg_locks l on l.pid=a.pid and not l.granted where a.pid=any(array[$1,$2]::int[]) and wait_event_type='Lock' and query ilike '%transfer_campaign_ownership%'`,
				[bClient.processID, cClient.processID],
			)
		).rows
		if (waiting.length) break
		await new Promise((resolve) => setTimeout(resolve, 25))
	}
	assert.ok(
		waiting.length,
		'second transfer must actually wait at the explicit harness advisory barrier',
	)
	console.log('LOCK_WAIT_OBSERVED', JSON.stringify(waiting))
	const results = await Promise.all([asyncB, asyncC])
	await Promise.all([printedB, printedC])
	console.log('RACE_RESULTS', JSON.stringify(results))
	const success = results.filter((r) => r.outcome === 'SUCCESS'),
		error = results.filter((r) => r.outcome === 'ERROR')
	assert.equal(success.length, 1)
	assert.equal(error.length, 1)
	assert.equal(success[0].rowCount, 1)
	assert.equal(error[0].sqlState, '42501')
	assert.equal(error[0].message, 'transferência de mestre não permitida')
	const final = (
		await admin.query(
			`select c.owner_id,count(*) filter(where m.role='owner')::int owner_count,count(*) filter(where m.role='owner' and m.user_id=c.owner_id)::int consistent_count,(select role from public.memberships where campaign_id=$1 and user_id=$2) predecessor_role from public.campaigns c join public.memberships m on m.campaign_id=c.id where c.id=$1 group by c.owner_id`,
			[ids.campaign, ids.a],
		)
	).rows[0]
	assert.equal(final.owner_id, success[0].target)
	assert.equal(final.owner_count, 1)
	assert.equal(final.consistent_count, 1)
	assert.equal(final.predecessor_role, 'editor')
	assert.equal(
		(
			await admin.query(
				'select count(*)::int n from private.campaign_ownership_operations where campaign_id=$1',
				[ids.campaign],
			)
		).rows[0].n,
		0,
	)
	console.log('RACE_CONSISTENT_FINAL', JSON.stringify(final))
	proven = true
} finally {
	if (!proven) {
		await admin
			.query(
				'select pg_cancel_backend(pid) from pg_stat_activity where pid=any(array[$1,$2]::int[])',
				[bClient.processID, cClient.processID],
			)
			.catch(() => {})
		await new Promise((resolve) => setTimeout(resolve, 50))
		await gate.query('rollback').catch(() => {})
		await gate
			.query('select pg_advisory_unlock($1::bigint)', [barrier])
			.catch(() => {})
	}
	if (fixture) await cleanup()
	await gate.query('rollback').catch(() => {})
	await gate
		.query('select pg_advisory_unlock($1::bigint)', [barrier])
		.catch(() => {})
	clearTimeout(deadline)
	await Promise.allSettled([
		bClient.end(),
		cClient.end(),
		gate.end(),
		admin.end(),
	])
}
