import assert from "node:assert/strict";
import { Client } from "pg";

const url = new URL(
	process.env.LOCAL_DB_URL ||
		"postgresql://ubuntu:postgres@127.0.0.1:5432/arkhiveon_0063",
);
assert.equal(url.hostname, "127.0.0.1", "somente Postgres local (127.0.0.1)");

const ids = {
	a: "00000000-0000-0000-0000-0000000000a1",
	world: "10000000-0000-0000-0000-0000000000a1",
	campaign: "20000000-0000-0000-0000-0000000000a1",
	character: "30000000-0000-0000-0000-0000000000f1",
	item: "40000000-0000-0000-0000-0000000000a1",
	c1: "60000000-0000-0000-0000-000000000001",
	c2: "60000000-0000-0000-0000-000000000002",
};

const config = {
	host: url.hostname,
	port: Number(url.port || 5432),
	database: url.pathname.replace(/^\//, "") || "arkhiveon_0063",
	user: decodeURIComponent(url.username || "ubuntu"),
	password: decodeURIComponent(url.password || "postgres"),
};

const admin = new Client(config);
const left = new Client(config);
const right = new Client(config);

function consumeSql(consumptionId) {
	return {
		text: `select public.consume_ammo($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text) as result`,
		values: [consumptionId, ids.campaign, ids.character, "inv-ammo", "1d8"],
	};
}

async function asOwner(client) {
	await client.query("set role authenticated");
	await client.query(
		"select set_config('request.jwt.claims', json_build_object('sub',$1::text,'role','authenticated')::text, false)",
		[ids.a],
	);
	const identity = (
		await client.query("select current_user db_role, auth.uid()::text jwt_uid")
	).rows[0];
	assert.equal(identity.db_role, "authenticated");
	assert.equal(identity.jwt_uid, ids.a);
}

async function setupFixtures() {
	await admin.query(
		`insert into auth.users (id, email) values ($1, 'gm-race@teste.local')
		 on conflict (id) do nothing`,
		[ids.a],
	);
	await admin.query(
		`insert into public.worlds (id, owner_user_id, name) values ($1, $2, 'Mundo A')
		 on conflict (id) do nothing`,
		[ids.world, ids.a],
	);
	await admin.query(
		`insert into public.campaigns (id, owner_id, name, world_id) values ($1, $2, 'Campanha A', $3)
		 on conflict (id) do nothing`,
		[ids.campaign, ids.a, ids.world],
	);
	await admin.query(
		`insert into public.memberships (campaign_id, user_id, role) values ($1, $2, 'owner')
		 on conflict (campaign_id, user_id) do nothing`,
		[ids.campaign, ids.a],
	);
	await admin.query(
		`insert into public.items (id, user_id, created_by, campaign_id, world_id, name, item_type, data)
		 values ($1, $2, $2, $3, $4, 'Flechas', 'Munição',
		 '{"type":"Munição","ammo":{"unitLabel":"flecha"}}'::jsonb)
		 on conflict (id) do nothing`,
		[ids.item, ids.a, ids.campaign, ids.world],
	);
	await admin.query(
		`insert into public.characters (id, campaign_id, name, user_id, created_by, data)
		 values ($1, $2, 'Ficha race', $3, $3, $4::jsonb)
		 on conflict (id) do update set data = excluded.data`,
		[
			ids.character,
			ids.campaign,
			ids.a,
			JSON.stringify({
				inventoryList: [
					{
						id: "inv-ammo",
						name: "Flechas",
						quantity: 1,
						campaignItemId: ids.item,
					},
				],
			}),
		],
	);
	await admin.query(
		`delete from public.ammo_consumptions where consumption_id in ($1::uuid, $2::uuid)`,
		[ids.c1, ids.c2],
	);
}

try {
	await admin.connect();
	await left.connect();
	await right.connect();
	await setupFixtures();

	const start = Date.now();
	const deadline = setTimeout(() => {
		console.error("CONCURRENCY_TIMEOUT");
		process.exit(124);
	}, 20000);

	await Promise.all([asOwner(left), asOwner(right)]);
	const results = await Promise.allSettled([
		left.query(consumeSql(ids.c1)),
		right.query(consumeSql(ids.c2)),
	]);
	clearTimeout(deadline);

	const outcomes = results.map((r) => {
		if (r.status === "fulfilled") {
			return { ok: true, result: r.value.rows[0].result };
		}
		return { ok: false, code: r.reason.code, message: r.reason.message };
	});
	const ok = outcomes.filter((o) => o.ok);
	const denied = outcomes.filter((o) => !o.ok);
	assert.equal(
		ok.length,
		1,
		`esperado 1 sucesso, veio ${JSON.stringify(outcomes)}`,
	);
	assert.equal(
		denied.length,
		1,
		`esperado 1 estoque 0, veio ${JSON.stringify(outcomes)}`,
	);
	assert.equal(denied[0].code, "22023");
	assert.match(denied[0].message, /esgotado/i);

	const qty = (
		await admin.query(
			`select (e->>'quantity')::int as qty
			 from public.characters c, jsonb_array_elements(c.data->'inventoryList') e
			 where c.id = $1 and e->>'id' = 'inv-ammo'`,
			[ids.character],
		)
	).rows[0].qty;
	assert.equal(qty, 0);
	const ledgers = (
		await admin.query(
			`select count(*)::int as n from public.ammo_consumptions
			 where consumption_id in ($1::uuid, $2::uuid)`,
			[ids.c1, ids.c2],
		)
	).rows[0].n;
	assert.equal(ledgers, 1);

	await admin.query(
		`delete from public.ammo_consumptions where consumption_id in ($1::uuid, $2::uuid)`,
		[ids.c1, ids.c2],
	);
	console.log(
		`0063 concurrency: 1 sucesso / 1 estoque 0, qty=0, ledger=1, ${Date.now() - start}ms (duas conexões SQL ROLE, não HTTP)`,
	);
} finally {
	await Promise.allSettled([left.end(), right.end(), admin.end()]);
}
