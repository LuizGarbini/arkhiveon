import { createClient } from '@supabase/supabase-js'

// Prova de ponta a ponta SÓ contra o Realtime local (127.0.0.1:54321).
// Chaves vêm do ambiente do processo. Nunca são impressas.
// Contas sintéticas: UUIDs 00000000-… e e-mails @example.invalid.

const MODE = process.argv[2] || 'full'
const WAIT_MS = 3000
const JOIN_MS = 10000
const PASSWORD = 'Synthetic0066local'

const ID = {
	O: '00000000-0000-0000-0000-000000000001',
	E: '00000000-0000-0000-0000-000000000002',
	P: '00000000-0000-0000-0000-000000000003',
	P2: '00000000-0000-0000-0000-000000000004',
	X: '00000000-0000-0000-0000-000000000005',
	O2: '00000000-0000-0000-0000-000000000006',
	C: '00000000-0000-0000-0000-000000000021',
	C2: '00000000-0000-0000-0000-000000000022',
	S1: '00000000-0000-0000-0000-000000000031',
	S2: '00000000-0000-0000-0000-000000000032',
	S3: '00000000-0000-0000-0000-000000000033',
	W: '00000000-0000-0000-0000-000000000041',
	W2: '00000000-0000-0000-0000-000000000042',
}

const EMAIL = {
	[ID.O]: 'owner@example.invalid',
	[ID.E]: 'editor@example.invalid',
	[ID.P]: 'viewer@example.invalid',
	[ID.P2]: 'viewer2@example.invalid',
	[ID.X]: 'outsider@example.invalid',
	[ID.O2]: 'owner2@example.invalid',
}

const ROLE = {
	[ID.O]: 'owner',
	[ID.E]: 'editor',
	[ID.P]: 'viewer',
	[ID.P2]: 'viewer',
	[ID.O2]: 'owner',
}

function assertLocalApi() {
	const raw = process.env.API_URL
	if (!raw || !process.env.ANON_KEY || !process.env.SERVICE_ROLE_KEY) {
		console.error('BLOQUEIO: API_URL, ANON_KEY ou SERVICE_ROLE_KEY ausente')
		process.exit(1)
	}
	let url
	try {
		url = new URL(raw)
	} catch {
		console.error('BLOQUEIO: API_URL invalida')
		process.exit(1)
	}
	const host = url.hostname
	if (host !== '127.0.0.1' && host !== 'localhost') {
		console.error('BLOQUEIO: API fora do loopback')
		process.exit(1)
	}
	if (url.port !== '54321') {
		console.error('BLOQUEIO: API local precisa da porta 54321')
		process.exit(1)
	}
	return raw
}

function safeError(error) {
	return String(error?.message || error || 'erro')
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/gi, '[email]')
		.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]')
		.replace(
			/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
			'[id]',
		)
		.slice(0, 240)
}

function pass(id, description) {
	console.log(`PASS ${id} ${description}`)
}

function fail(id, description) {
	const message = `FAIL ${id} ${description}`
	console.log(message)
	const error = new Error(message)
	error.reported = true
	throw error
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function topicGm(campaign, scene) {
	return `vtt:${campaign}:${scene}:gm`
}

function topicGmOnly(campaign, scene) {
	return `vtt:${campaign}:${scene}:gmonly`
}

function topicUser(campaign, scene, user) {
	return `vtt:${campaign}:${scene}:u:${user}`
}

function privateConfig(presenceKey) {
	return {
		private: true,
		broadcast: { self: false, ack: true },
		presence: presenceKey
			? { key: presenceKey, enabled: true }
			: { enabled: false },
	}
}

function clientOptions() {
	return {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	}
}

function waitStatus(channel, timeoutMs = JOIN_MS) {
	return new Promise((resolve) => {
		let done = false
		const finish = (status) => {
			if (done) return
			done = true
			clearTimeout(timer)
			resolve(status)
		}
		const timer = setTimeout(() => finish('TIMEOUT'), timeoutMs)
		channel.subscribe((status) => {
			if (
				status === 'SUBSCRIBED' ||
				status === 'CHANNEL_ERROR' ||
				status === 'TIMED_OUT' ||
				status === 'CLOSED'
			) {
				finish(status)
			}
		})
	})
}

async function sendBroadcast(channel, event, payload) {
	return channel.send({ type: 'broadcast', event, payload }, { timeout: 4000 })
}

async function close(client, channel) {
	if (!channel) return
	await client.removeChannel(channel)
}

async function signIn(apiUrl, anonKey, userId) {
	const client = createClient(apiUrl, anonKey, clientOptions())
	const { data, error } = await client.auth.signInWithPassword({
		email: EMAIL[userId],
		password: PASSWORD,
	})
	if (error || !data.session?.access_token) {
		throw new Error(`login falhou: ${safeError(error)}`)
	}
	await client.realtime.setAuth(data.session.access_token)
	return client
}

async function cleanup(admin) {
	await admin.from('campaigns').delete().in('id', [ID.C, ID.C2])
	await admin.from('worlds').delete().in('id', [ID.W, ID.W2])
	for (const userId of [ID.O, ID.E, ID.P, ID.P2, ID.X, ID.O2]) {
		await admin.auth.admin.deleteUser(userId)
	}
}

async function seed(admin) {
	const accounts = [ID.O, ID.E, ID.P, ID.P2, ID.X, ID.O2]
	for (const userId of accounts) {
		const created = await admin.auth.admin.createUser({
			id: userId,
			email: EMAIL[userId],
			password: PASSWORD,
			email_confirm: true,
		})
		if (created.error) {
			throw new Error(`criar conta falhou: ${safeError(created.error)}`)
		}
	}

	const worlds = await admin.from('worlds').insert([
		{ id: ID.W, owner_user_id: ID.O, name: 'Mundo sintetico' },
		{ id: ID.W2, owner_user_id: ID.O2, name: 'Mundo sintetico 2' },
	])
	if (worlds.error) throw new Error(`mundo falhou: ${safeError(worlds.error)}`)

	const campaigns = await admin.from('campaigns').insert([
		{
			id: ID.C,
			owner_id: ID.O,
			name: 'Campanha C',
			world_id: ID.W,
			member_limit: 20,
		},
		{
			id: ID.C2,
			owner_id: ID.O2,
			name: 'Campanha C2',
			world_id: ID.W2,
			member_limit: 20,
		},
	])
	if (campaigns.error) {
		throw new Error(`campanha falhou: ${safeError(campaigns.error)}`)
	}

	const members = await admin.from('memberships').insert([
		{ campaign_id: ID.C, user_id: ID.E, role: 'editor' },
		{ campaign_id: ID.C, user_id: ID.P, role: 'viewer' },
		{ campaign_id: ID.C, user_id: ID.P2, role: 'viewer' },
	])
	if (members.error) {
		throw new Error(`membership falhou: ${safeError(members.error)}`)
	}

	const scenes = await admin.from('vtt_scenes').insert([
		{ id: ID.S1, campaign_id: ID.C, name: 'Cena ativa', is_active: true },
		{ id: ID.S2, campaign_id: ID.C, name: 'Cena inativa', is_active: false },
		{ id: ID.S3, campaign_id: ID.C2, name: 'Cena C2', is_active: true },
	])
	if (scenes.error) throw new Error(`cena falhou: ${safeError(scenes.error)}`)

	const owner = await admin
		.from('memberships')
		.select('role')
		.eq('campaign_id', ID.C)
		.eq('user_id', ID.O)
		.maybeSingle()
	if (owner.error || owner.data?.role !== 'owner') {
		throw new Error('membership do dono ausente')
	}
}

async function expectOwnerJoin(apiUrl, anonKey, expected) {
	const owner = await signIn(apiUrl, anonKey, ID.O)
	const channel = owner.channel(topicGm(ID.C, ID.S1), {
		config: privateConfig(),
	})
	try {
		const status = await waitStatus(channel)
		if (status !== expected) {
			fail(
				expected === 'SUBSCRIBED' ? 'reapply.join' : 'rollback.join',
				`join privado do dono ficou ${status}, esperava ${expected}`,
			)
		}
		pass(
			expected === 'SUBSCRIBED' ? 'reapply.join' : 'rollback.join',
			expected === 'SUBSCRIBED'
				? 'dono entra no gm depois de reaplicar a 0066'
				: 'dono nao entra no canal privado sem as policies',
		)
	} finally {
		await close(owner, channel)
		await owner.removeAllChannels()
	}
}

async function runR1(clients) {
	const outsiderGm = clients.X.channel(topicGm(ID.C, ID.S1), {
		config: privateConfig(),
	})
	const outsiderUser = clients.X.channel(topicUser(ID.C, ID.S1, ID.X), {
		config: privateConfig(),
	})
	const ownerGm = clients.O.channel(topicGm(ID.C, ID.S1), {
		config: privateConfig(),
	})
	const otherGm = clients.O2.channel(topicGm(ID.C, ID.S1), {
		config: privateConfig(),
	})
	const otherOwn = clients.O2.channel(topicGm(ID.C2, ID.S3), {
		config: privateConfig(),
	})
	try {
		const deniedGm = await waitStatus(outsiderGm)
		const deniedUser = await waitStatus(outsiderUser)
		const allowed = await waitStatus(ownerGm)
		const deniedOther = await waitStatus(otherGm)
		const allowedOther = await waitStatus(otherOwn)
		if (allowed !== 'SUBSCRIBED') {
			fail('R1', `controle do dono no gm ficou ${allowed}`)
		}
		if (deniedGm !== 'CHANNEL_ERROR' || deniedUser !== 'CHANNEL_ERROR') {
			fail('R1', `nao-membro entrou (gm ${deniedGm}, proprio u ${deniedUser})`)
		}
		if (allowedOther !== 'SUBSCRIBED' || deniedOther !== 'CHANNEL_ERROR') {
			fail(
				'R1',
				`campanha cruzada ficou outro-gm ${deniedOther}, propria ${allowedOther}`,
			)
		}
		pass(
			'R1',
			'nao-membro nao entra em gm nem no proprio u; dono entra; membro de outra campanha nao entra',
		)
	} finally {
		await close(clients.X, outsiderGm)
		await close(clients.X, outsiderUser)
		await close(clients.O, ownerGm)
		await close(clients.O2, otherGm)
		await close(clients.O2, otherOwn)
	}
}

async function runR2(clients) {
	const denied = []
	const allowed = []
	const owner = clients.O.channel(topicGm(ID.C, ID.S1), {
		config: privateConfig(),
	})
	const player = clients.P.channel(topicGm(ID.C, ID.S1), {
		config: privateConfig(),
	})
	owner.on('broadcast', { event: 'fog_update' }, () => denied.push(1))
	player.on('broadcast', { event: 'fog_ok' }, () => allowed.push(1))
	try {
		const ownerStatus = await waitStatus(owner)
		const playerStatus = await waitStatus(player)
		if (ownerStatus !== 'SUBSCRIBED') {
			fail('R2', `dono nao entrou no gm (${ownerStatus})`)
		}
		if (playerStatus !== 'SUBSCRIBED') {
			fail(
				'R2',
				`jogador legitimo bloqueado no gm da cena ativa (${playerStatus})`,
			)
		}
		const deniedSend = await sendBroadcast(player, 'fog_update', {
			marker: 'negado',
		})
		const allowedSend = await sendBroadcast(owner, 'fog_ok', {
			marker: 'ok',
		})
		await sleep(WAIT_MS)
		if (allowed.length < 1 || allowedSend !== 'ok') {
			fail('R2', 'controle positivo do dono no gm nao chegou ao jogador')
		}
		if (denied.length > 0) {
			fail('R2', 'jogador enviou fog_update no gm e o dono recebeu')
		}
		pass(
			'R2',
			`jogador nao entrega fog_update no gm (envio ${deniedSend}); dono entrega o controle`,
		)
	} finally {
		await close(clients.O, owner)
		await close(clients.P, player)
	}
}

async function runR3(clients) {
	const topic = topicUser(ID.C, ID.S1, ID.O)
	const leaked = []
	const allowed = []
	const owner = clients.O.channel(topic, { config: privateConfig() })
	const player = clients.P.channel(topic, { config: privateConfig() })
	const other = clients.P2.channel(topic, { config: privateConfig() })
	owner.on('broadcast', { event: 'forge_owner' }, () => leaked.push(1))
	other.on('broadcast', { event: 'forge_owner' }, () => leaked.push(1))
	other.on('broadcast', { event: 'owner_ok' }, () => allowed.push(1))
	try {
		const ownerStatus = await waitStatus(owner)
		const playerStatus = await waitStatus(player)
		const otherStatus = await waitStatus(other)
		if (ownerStatus !== 'SUBSCRIBED' || otherStatus !== 'SUBSCRIBED') {
			fail('R3', 'ouvintes legitimos nao entraram no u do dono')
		}
		if (playerStatus !== 'SUBSCRIBED') {
			fail(
				'R3',
				`jogador legitimo bloqueado ao ler o u do dono (${playerStatus})`,
			)
		}
		const deniedSend = await sendBroadcast(player, 'forge_owner', {
			userId: ID.O,
		})
		const allowedSend = await sendBroadcast(owner, 'owner_ok', {
			marker: 'ok',
		})
		await sleep(WAIT_MS)
		if (allowed.length < 1 || allowedSend !== 'ok') {
			fail('R3', 'controle positivo no u do dono nao chegou')
		}
		if (leaked.length > 0) {
			fail('R3', 'jogador escreveu no u do dono e alguem recebeu')
		}
		pass(
			'R3',
			`jogador nao entrega mensagem no u do dono (envio ${deniedSend})`,
		)
	} finally {
		await close(clients.O, owner)
		await close(clients.P, player)
		await close(clients.P2, other)
	}
}

async function runR4(clients) {
	const topic = topicUser(ID.C, ID.S1, ID.P)
	let received = null
	const owner = clients.O.channel(topic, { config: privateConfig() })
	const player = clients.P.channel(topic, { config: privateConfig() })
	owner.on('broadcast', { event: 'cursor_move' }, (payload) => {
		received = payload
	})
	try {
		const ownerStatus = await waitStatus(owner)
		const playerStatus = await waitStatus(player)
		if (playerStatus !== 'SUBSCRIBED') {
			fail('R4', `jogador legitimo bloqueado no proprio u (${playerStatus})`)
		}
		if (ownerStatus !== 'SUBSCRIBED') {
			fail('R4', `dono nao leu o u do jogador (${ownerStatus})`)
		}
		const sent = await sendBroadcast(player, 'cursor_move', {
			userId: ID.O,
			x: 1,
			y: 2,
		})
		await sleep(WAIT_MS)
		if (sent !== 'ok' || !received) {
			fail('R4', 'cursor no proprio u nao chegou ao dono')
		}
		const parts = topic.split(':')
		const topicUserId = parts[3] === 'u' ? parts[4] : ''
		const payloadUserId = received.payload?.userId
		if (topicUserId !== ID.P || payloadUserId !== ID.O) {
			fail('R4', 'payload ou topico nao bateu com o cenario')
		}
		const classified = ROLE[topicUserId]
		if (classified !== 'viewer') {
			fail('R4', 'classificacao pelo topico nao ficou viewer')
		}
		pass(
			'R4',
			'receptor classifica o cursor pelo topico do jogador e ignora userId do dono no payload',
		)
	} finally {
		await close(clients.O, owner)
		await close(clients.P, player)
	}
}

async function runR5(clients) {
	const topic = topicUser(ID.C, ID.S1, ID.P)
	let sawClaim = false
	const owner = clients.O.channel(topic, {
		config: privateConfig('ouvinte'),
	})
	const player = clients.P.channel(topic, {
		config: privateConfig(ID.P),
	})
	owner.on('presence', { event: 'sync' }, () => {
		const state = owner.presenceState()
		const metas = Object.values(state).flat()
		sawClaim = metas.some((meta) => meta.isGM === true)
	})
	try {
		const ownerStatus = await waitStatus(owner)
		const playerStatus = await waitStatus(player)
		if (playerStatus !== 'SUBSCRIBED' || ownerStatus !== 'SUBSCRIBED') {
			fail(
				'R5',
				`presenca nao abriu (jogador ${playerStatus}, dono ${ownerStatus})`,
			)
		}
		const tracked = await player.track({ isGM: true, userId: ID.O })
		const started = Date.now()
		while (!sawClaim && Date.now() - started < WAIT_MS) {
			await sleep(100)
		}
		if (tracked !== 'ok' || !sawClaim) {
			fail('R5', 'presenca com isGM true nao foi observada')
		}
		if (ROLE[ID.P] !== 'viewer') {
			fail('R5', 'papel calculado pela membership nao e viewer')
		}
		pass(
			'R5',
			'track com isGM true nao altera o papel calculado do jogador, que continua viewer',
		)
	} finally {
		await close(clients.O, owner)
		await close(clients.P, player)
	}
}

async function runR6(clients) {
	const topic = topicGmOnly(ID.C, ID.S1)
	const leaked = []
	const allowed = []
	const player = clients.P.channel(topic, { config: privateConfig() })
	player.on('broadcast', { event: 'hidden_move' }, () => leaked.push(1))
	const editor = clients.E.channel(topic, { config: privateConfig() })
	editor.on('broadcast', { event: 'hidden_move' }, () => allowed.push(1))
	const owner = clients.O.channel(topic, { config: privateConfig() })
	try {
		const playerStatus = await waitStatus(player)
		const editorStatus = await waitStatus(editor)
		const ownerStatus = await waitStatus(owner)
		if (editorStatus !== 'SUBSCRIBED' || ownerStatus !== 'SUBSCRIBED') {
			fail(
				'R6',
				`mestre nao entrou no gmonly (dono ${ownerStatus}, co-mestre ${editorStatus})`,
			)
		}
		if (playerStatus === 'SUBSCRIBED') {
			fail('R6', 'jogador entrou no gmonly')
		}
		const sent = await sendBroadcast(owner, 'hidden_move', { marker: 'gm' })
		await sleep(WAIT_MS)
		if (allowed.length < 1 || sent !== 'ok') {
			fail('R6', 'co-mestre nao recebeu o gmonly do dono')
		}
		if (leaked.length > 0) {
			fail('R6', 'jogador recebeu mensagem de gmonly')
		}
		pass(
			'R6',
			`jogador nao recebe gmonly (join ${playerStatus}); co-mestre recebe o dono`,
		)
	} finally {
		await close(clients.P, player)
		await close(clients.E, editor)
		await close(clients.O, owner)
	}
}

async function runR7(clients) {
	const gmDenied = []
	const gmAllowed = []
	const userAllowed = []
	let presenceOk = false
	const gmOwner = clients.O.channel(topicGm(ID.C, ID.S1), {
		config: privateConfig(),
	})
	const gmPlayer = clients.P.channel(topicGm(ID.C, ID.S1), {
		config: privateConfig(),
	})
	gmPlayer.on('broadcast', { event: 'r7_gm' }, () => gmAllowed.push(1))
	gmOwner.on('broadcast', { event: 'r7_gm_neg' }, () => gmDenied.push(1))
	const userOwner = clients.O.channel(topicUser(ID.C, ID.S1, ID.P), {
		config: privateConfig('ouvinte-r7'),
	})
	const userPlayer = clients.P.channel(topicUser(ID.C, ID.S1, ID.P), {
		config: privateConfig(ID.P),
	})
	userOwner.on('broadcast', { event: 'r7_user' }, () => userAllowed.push(1))
	userOwner.on('presence', { event: 'sync' }, () => {
		const metas = Object.values(userOwner.presenceState()).flat()
		presenceOk = metas.some((meta) => meta.marker === 'r7')
	})
	const inactivePlayer = clients.P.channel(topicGm(ID.C, ID.S2), {
		config: privateConfig(),
	})
	const inactiveOwner = clients.O.channel(topicGm(ID.C, ID.S2), {
		config: privateConfig(),
	})
	try {
		const gmOwnerStatus = await waitStatus(gmOwner)
		const gmPlayerStatus = await waitStatus(gmPlayer)
		if (gmPlayerStatus !== 'SUBSCRIBED') {
			fail(
				'R7',
				`jogador legitimo bloqueado no gm da cena ativa (${gmPlayerStatus})`,
			)
		}
		if (gmOwnerStatus !== 'SUBSCRIBED') fail('R7', 'dono nao entrou no gm')
		const gmSend = await sendBroadcast(gmOwner, 'r7_gm', { marker: 'ok' })
		const userOwnerStatus = await waitStatus(userOwner)
		const userPlayerStatus = await waitStatus(userPlayer)
		if (userPlayerStatus !== 'SUBSCRIBED') {
			fail(
				'R7',
				`jogador legitimo bloqueado no proprio u (${userPlayerStatus})`,
			)
		}
		if (userOwnerStatus !== 'SUBSCRIBED') {
			fail('R7', 'dono nao leu o u do jogador')
		}
		const userSend = await sendBroadcast(userPlayer, 'r7_user', {
			marker: 'ok',
		})
		const tracked = await userPlayer.track({ marker: 'r7', isGM: false })
		const inactivePlayerStatus = await waitStatus(inactivePlayer)
		const inactiveOwnerStatus = await waitStatus(inactiveOwner)
		const started = Date.now()
		while (
			(!gmAllowed.length || !userAllowed.length || !presenceOk) &&
			Date.now() - started < WAIT_MS
		) {
			await sleep(100)
		}
		if (gmSend !== 'ok' || gmAllowed.length < 1) {
			fail('R7', 'jogador nao recebeu o broadcast do dono no gm')
		}
		if (userSend !== 'ok' || userAllowed.length < 1) {
			fail('R7', 'dono nao recebeu o broadcast do jogador no u')
		}
		if (tracked !== 'ok' || !presenceOk) {
			fail('R7', 'presenca do jogador nao chegou ao dono')
		}
		if (gmDenied.length > 0) fail('R7', 'controle negativo inesperado no gm')
		if (inactivePlayerStatus === 'SUBSCRIBED') {
			fail('R7.s2', 'jogador entrou no gm da cena inativa')
		}
		if (inactiveOwnerStatus !== 'SUBSCRIBED') {
			fail(
				'R7.s2',
				`dono nao entrou no gm da cena inativa (${inactiveOwnerStatus})`,
			)
		}
		pass(
			'R7',
			'dono entrega no gm, jogador entrega no proprio u, e a presenca chega',
		)
		pass('R7.s2', 'jogador nao entra no gm da cena inativa; dono entra')
	} finally {
		await close(clients.O, gmOwner)
		await close(clients.P, gmPlayer)
		await close(clients.O, userOwner)
		await close(clients.P, userPlayer)
		await close(clients.P, inactivePlayer)
		await close(clients.O, inactiveOwner)
	}
}

async function runR8(admin, clients) {
	const topic = topicGm(ID.C, ID.S1)
	const before = []
	const after = []
	const owner = clients.O.channel(topic, { config: privateConfig() })
	const player = clients.P.channel(topic, { config: privateConfig() })
	player.on('broadcast', { event: 'r8_before' }, () => before.push(1))
	player.on('broadcast', { event: 'r8_cache' }, () => after.push(1))
	try {
		const ownerStatus = await waitStatus(owner)
		const playerStatus = await waitStatus(player)
		if (ownerStatus !== 'SUBSCRIBED' || playerStatus !== 'SUBSCRIBED') {
			fail(
				'R8',
				`antes de remover, join ficou dono ${ownerStatus} jogador ${playerStatus}`,
			)
		}
		const first = await sendBroadcast(owner, 'r8_before', { marker: 'antes' })
		const started = Date.now()
		while (!before.length && Date.now() - started < WAIT_MS) await sleep(100)
		if (first !== 'ok' || before.length < 1) {
			fail('R8', 'jogador nao recebia antes de ser removido')
		}

		const removed = await admin
			.from('memberships')
			.delete()
			.eq('campaign_id', ID.C)
			.eq('user_id', ID.P)
			.select('role')
		if (removed.error || removed.data?.length !== 1) {
			fail('R8', `nao removeu o jogador (${safeError(removed.error)})`)
		}

		const cachedSend = await sendBroadcast(owner, 'r8_cache', {
			marker: 'cache',
		})
		await sleep(WAIT_MS)
		const stillReceives = after.length > 0 && cachedSend === 'ok'
		console.log(
			`INFO R8.cache jogador ja conectado ${stillReceives ? 'continua recebendo' : 'parou de receber'} ate renovar o JWT`,
		)

		await close(clients.P, player)
		const refreshed = await clients.P.auth.refreshSession()
		if (refreshed.error || !refreshed.data.session?.access_token) {
			fail('R8', `renovar JWT falhou (${safeError(refreshed.error)})`)
		}
		await clients.P.realtime.setAuth(refreshed.data.session.access_token)
		const renewed = clients.P.channel(topic, { config: privateConfig() })
		const renewedStatus = await waitStatus(renewed)
		await close(clients.P, renewed)

		let finalStatus = renewedStatus
		let how = 'mesmo cliente apos renovar o JWT'
		if (finalStatus !== 'CHANNEL_ERROR') {
			const fresh = await signIn(
				process.env.API_URL,
				process.env.ANON_KEY,
				ID.P,
			)
			const freshChannel = fresh.channel(topic, { config: privateConfig() })
			try {
				finalStatus = await waitStatus(freshChannel)
				how = 'cliente novo apos novo login'
			} finally {
				await close(fresh, freshChannel)
				await fresh.removeAllChannels()
			}
		}
		if (finalStatus !== 'CHANNEL_ERROR') {
			fail('R8', `novo join depois de remover ficou ${finalStatus}`)
		}
		pass('R8', `novo join negado (${how}) depois de remover o jogador`)
	} finally {
		await close(clients.O, owner)
	}
}

async function runTiso(apiUrl, anonKey, clients) {
	const topic = topicGm(ID.C, ID.S1)
	const leaked = []
	const allowed = []
	const owner = clients.O.channel(topic, { config: privateConfig() })
	owner.on('broadcast', { event: 'iso_public' }, () => leaked.push(1))
	owner.on('broadcast', { event: 'iso_private' }, () => allowed.push(1))
	const editor = clients.E.channel(topic, { config: privateConfig() })
	let publicClient = null
	let publicChannel = null
	try {
		const ownerStatus = await waitStatus(owner)
		const editorStatus = await waitStatus(editor)
		if (ownerStatus !== 'SUBSCRIBED' || editorStatus !== 'SUBSCRIBED') {
			fail('T-iso', 'assinantes privados nao entraram')
		}

		publicClient = createClient(apiUrl, anonKey, clientOptions())
		publicChannel = publicClient.channel(topic, {
			config: {
				private: false,
				broadcast: { self: false, ack: true },
			},
		})
		let publicStatus = await waitStatus(publicChannel)
		if (publicStatus !== 'SUBSCRIBED') {
			await close(publicClient, publicChannel)
			publicClient = await signIn(apiUrl, anonKey, ID.X)
			publicChannel = publicClient.channel(topic, {
				config: {
					private: false,
					broadcast: { self: false, ack: true },
				},
			})
			publicStatus = await waitStatus(publicChannel)
		}

		let publicSend = 'sem-join'
		if (publicStatus === 'SUBSCRIBED') {
			publicSend = await sendBroadcast(publicChannel, 'iso_public', {
				marker: 'public',
			})
		}
		const privateSend = await sendBroadcast(editor, 'iso_private', {
			marker: 'private',
		})
		await sleep(WAIT_MS)
		if (privateSend !== 'ok' || allowed.length < 1) {
			fail('T-iso', 'controle positivo privado nao chegou')
		}
		if (leaked.length > 0) {
			fail(
				'T-iso',
				'mistura publico/privado: mensagem do canal publico chegou ao assinante privado',
			)
		}
		if (publicStatus !== 'SUBSCRIBED' || publicSend !== 'ok') {
			pass(
				'T-iso',
				`nenhuma mensagem publica chegou ao privado; o join publico ficou ${publicStatus} e o envio ${publicSend}`,
			)
			return
		}
		pass(
			'T-iso',
			'envio no canal publico com o mesmo nome nao chega ao assinante privado',
		)
	} finally {
		await close(clients.O, owner)
		await close(clients.E, editor)
		if (publicClient && publicChannel) {
			await close(publicClient, publicChannel)
			await publicClient.removeAllChannels()
		}
	}
}

async function runPresenceKey(clients) {
	const topic = topicUser(ID.C, ID.S1, ID.P)
	const allowed = []
	let keys = []
	const owner = clients.O.channel(topic, {
		config: privateConfig('ouvinte-chave'),
	})
	let player = clients.P.channel(topic, {
		config: privateConfig(ID.P),
	})
	owner.on('broadcast', { event: 'key_ok' }, () => allowed.push(1))
	owner.on('presence', { event: 'sync' }, () => {
		keys = Object.keys(owner.presenceState())
	})
	try {
		const ownerStatus = await waitStatus(owner)
		const ownStatus = await waitStatus(player)
		if (ownerStatus !== 'SUBSCRIBED') {
			fail('T-presence-key', `dono nao leu o u do jogador (${ownerStatus})`)
		}
		if (ownStatus !== 'SUBSCRIBED') {
			fail(
				'T-presence-key',
				`jogador legitimo bloqueado no proprio u (${ownStatus})`,
			)
		}
		const sent = await sendBroadcast(player, 'key_ok', { marker: 'ok' })
		const started = Date.now()
		while (!allowed.length && Date.now() - started < WAIT_MS) {
			await sleep(100)
		}
		if (sent !== 'ok' || allowed.length < 1) {
			fail('T-presence-key', 'controle positivo no u do jogador nao chegou')
		}

		await close(clients.P, player)
		keys = []
		player = clients.P.channel(topic, {
			config: privateConfig(ID.O),
		})
		const forgedStatus = await waitStatus(player)
		if (forgedStatus === 'CHANNEL_ERROR') {
			pass(
				'T-presence-key',
				'servidor recusou o join com chave de presenca igual ao uid de outro; a chave propria entra',
			)
			return
		}
		if (forgedStatus !== 'SUBSCRIBED') {
			fail('T-presence-key', `join com chave alheia ficou ${forgedStatus}`)
		}
		const tracked = await player.track({ isGM: true, userId: ID.O })
		const trackedAt = Date.now()
		while (keys.length < 1 && Date.now() - trackedAt < WAIT_MS) {
			await sleep(100)
		}
		keys = Object.keys(owner.presenceState())
		if (tracked !== 'ok' || keys.length < 1) {
			fail('T-presence-key', 'presenca com chave alheia nao foi observada')
		}
		if (keys.includes(ID.O)) {
			pass(
				'T-presence-key',
				'chave de presenca e escolhida pelo cliente e aceitou uid alheio; o topico continua o do jogador',
			)
			return
		}
		pass(
			'T-presence-key',
			'servidor nao usou a chave alheia pedida pelo cliente',
		)
	} finally {
		await close(clients.O, owner)
		await close(clients.P, player)
	}
}

async function main() {
	if (!['full', 'join-denied', 'join-allowed'].includes(MODE)) {
		console.error('BLOQUEIO: modo invalido')
		process.exit(1)
	}
	const apiUrl = assertLocalApi()
	const anonKey = process.env.ANON_KEY
	const admin = createClient(
		apiUrl,
		process.env.SERVICE_ROLE_KEY,
		clientOptions(),
	)
	const clients = []
	try {
		await cleanup(admin)
		await seed(admin)
		if (MODE === 'join-denied') {
			await expectOwnerJoin(apiUrl, anonKey, 'CHANNEL_ERROR')
			return
		}
		if (MODE === 'join-allowed') {
			await expectOwnerJoin(apiUrl, anonKey, 'SUBSCRIBED')
			return
		}
		for (const userId of [ID.O, ID.E, ID.P, ID.P2, ID.X, ID.O2]) {
			clients.push(await signIn(apiUrl, anonKey, userId))
		}
		const byRole = {
			O: clients[0],
			E: clients[1],
			P: clients[2],
			P2: clients[3],
			X: clients[4],
			O2: clients[5],
		}
		await runR1(byRole)
		await runR2(byRole)
		await runR3(byRole)
		await runR4(byRole)
		await runR5(byRole)
		await runR6(byRole)
		await runR7(byRole)
		await runTiso(apiUrl, anonKey, byRole)
		await runPresenceKey(byRole)
		await runR8(admin, byRole)
	} finally {
		for (const client of clients) {
			await client.removeAllChannels()
		}
		await cleanup(admin)
	}
}

main().catch((error) => {
	if (!error?.reported) console.error(`FAIL setup ${safeError(error)}`)
	process.exitCode = String(error?.message || '').includes(
		'mistura publico/privado',
	)
		? 2
		: 1
})
