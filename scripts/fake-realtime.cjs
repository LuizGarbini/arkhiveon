// Servidor de Realtime de mentira (protocolo Phoenix do Supabase, vsn 2.0.0) para
// os checks de navegador. Entra no lugar do WebSocket real com
// `context.routeWebSocket`, aceita os joins, guarda a presença de quem entra e
// deixa o teste "ser" outros integrantes: empurrar presença, cursores, pings e
// réguas, e ler o que a página enviou (inclusive os broadcasts binários).
// Não é código do app: só serve a `scripts/check-*.cjs`.

/** Decodifica o broadcast binário que o supabase-js envia (kind 3, "userBroadcastPush"). */
function decodeUserBroadcastPush(buffer) {
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	if (view.getUint8(0) !== 3) return null;
	const joinRefLen = view.getUint8(1);
	const refLen = view.getUint8(2);
	const topicLen = view.getUint8(3);
	const eventLen = view.getUint8(4);
	const metaLen = view.getUint8(5);
	const encoding = view.getUint8(6);
	let offset = 7;
	const text = (len) => {
		const out = buffer.subarray(offset, offset + len).toString("utf8");
		offset += len;
		return out;
	};
	text(joinRefLen);
	text(refLen);
	const topic = text(topicLen);
	const event = text(eventLen);
	text(metaLen);
	const body = buffer.subarray(offset).toString("utf8");
	return { topic, event, payload: encoding === 1 ? JSON.parse(body) : body };
}

async function installFakeRealtime(context) {
	const state = {
		sockets: [],
		/** Tópicos em que a página deu join. */
		joined: [],
		/** Tudo que a página rastreou na presença (track), na ordem. */
		tracked: [],
		/** Broadcasts que a página enviou: { topic, event, payload }. */
		sent: [],
		/** Presença conhecida: key -> payload. */
		presence: new Map(),
		/** Última entrada (com phx_ref) de cada key, para o leave da velha. */
		presenceMetas: new Map(),
		selfKey: null,
		/** join_ref do join na sala: o Phoenix descarta presença com outro ref. */
		roomJoinRef: null,
		/** Por tópico: join_ref e os filtros de postgres_changes (com os ids devolvidos). */
		topics: new Map(),
	};
	const roomTopic = () => state.joined.find((t) => t.includes("vtt-room:"));
	const send = (socket, ...frame) => socket.send(JSON.stringify(frame));
	const metas = (payload) => ({ metas: [{ phx_ref: `r${Math.random().toString(36).slice(2, 8)}`, ...payload }] });

	// Reentradas na mesma página (reload) começam sem a entrada velha.
	await context.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
		state.sockets.push(ws);
		ws.onMessage((raw) => {
			if (typeof raw !== "string") {
				const decoded = decodeUserBroadcastPush(Buffer.from(raw));
				if (decoded) state.sent.push(decoded);
				return;
			}
			const [joinRef, ref, topic, event, payload] = JSON.parse(raw);
			if (event === "heartbeat") {
				send(ws, null, ref, "phoenix", "phx_reply", { status: "ok", response: {} });
				return;
			}
			if (event === "phx_join") {
				if (!state.joined.includes(topic)) state.joined.push(topic);
				const changes = (payload?.config?.postgres_changes ?? []).map((c, i) => ({ ...c, id: i + 1 }));
				state.topics.set(topic, { joinRef, ws, bindings: changes });
				send(ws, joinRef, ref, topic, "phx_reply", { status: "ok", response: { postgres_changes: changes } });
				if (topic.includes("vtt-room:")) {
					state.selfKey = payload?.config?.presence?.key ?? null;
					state.roomJoinRef = joinRef;
					const snapshot = {};
					for (const [key, value] of state.presence) snapshot[key] = metas(value);
					send(ws, joinRef, null, topic, "presence_state", snapshot);
				}
				return;
			}
			if (event === "presence" && payload?.event === "track") {
				state.tracked.push(payload.payload);
				if (state.selfKey) {
					// Como o Realtime: re-anunciar troca a entrada (join da nova + leave da velha).
					const old = state.presenceMetas.get(state.selfKey);
					const next = metas(payload.payload);
					state.presenceMetas.set(state.selfKey, next);
					state.presence.set(state.selfKey, payload.payload);
					send(ws, joinRef, null, topic, "presence_diff", { joins: { [state.selfKey]: next }, leaves: old ? { [state.selfKey]: old } : {} });
				}
				send(ws, joinRef, ref, topic, "phx_reply", { status: "ok", response: {} });
				return;
			}
			if (event === "broadcast") {
				state.sent.push({ topic, event: payload?.event, payload: payload?.payload });
				send(ws, joinRef, ref, topic, "phx_reply", { status: "ok", response: {} });
				return;
			}
			send(ws, joinRef, ref, topic, "phx_reply", { status: "ok", response: {} });
		});
	});

	return {
		state,
		/** Outra pessoa entra (ou muda) na presença da sala. */
		peerJoin(key, payload) {
			const old = state.presenceMetas.get(key);
			const next = metas(payload);
			state.presenceMetas.set(key, next);
			state.presence.set(key, payload);
			for (const ws of state.sockets) {
				send(ws, state.roomJoinRef, null, roomTopic(), "presence_diff", { joins: { [key]: next }, leaves: old ? { [key]: old } : {} });
			}
		},
		peerLeave(key) {
			const old = state.presenceMetas.get(key);
			state.presence.delete(key);
			state.presenceMetas.delete(key);
			for (const ws of state.sockets) {
				send(ws, state.roomJoinRef, null, roomTopic(), "presence_diff", { joins: {}, leaves: { [key]: old ?? metas({}) } });
			}
		},
		/**
		 * Empurra uma mudança do banco (postgres_changes) para quem assinou a
		 * tabela. Como o Realtime: DELETE não chega a quem usa filtro por coluna.
		 */
		pushChange(table, { type, record, old }) {
			for (const [topic, info] of state.topics) {
				const ids = info.bindings
					.filter((b) => b.table === table && (b.event === "*" || b.event === type))
					.filter((b) => type !== "DELETE" || !b.filter)
					.map((b) => b.id);
				if (ids.length === 0) continue;
				send(info.ws, info.joinRef, null, topic, "postgres_changes", {
					ids,
					data: { schema: "public", table, commit_timestamp: new Date().toISOString(), type, record: record ?? {}, old_record: old ?? {}, columns: [], errors: null },
				});
			}
		},
		/** Esquece tudo (entre páginas do teste). */
		reset() {
			state.tracked.length = 0;
			state.joined.length = 0;
			state.sent.length = 0;
			state.presence.clear();
			state.presenceMetas.clear();
			state.topics.clear();
		},
		/** Outra pessoa manda um broadcast (cursor_move, ping, ruler_move…). */
		peerBroadcast(event, payload) {
			for (const ws of state.sockets) {
				send(ws, null, null, roomTopic(), "broadcast", { type: "broadcast", event, payload });
			}
		},
		sentCount: (event) => state.sent.filter((m) => m.event === event).length,
	};
}

module.exports = { installFakeRealtime };
