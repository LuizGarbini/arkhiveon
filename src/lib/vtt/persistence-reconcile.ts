/** Pure remote-base/local-intent reconciliation. No storage, network or UI. */

export interface EntityScope {
	campaignId: string;
	sceneId: string;
}

export interface EntityRevision {
	key: string;
	scope: EntityScope;
	seq: number;
	generation: number;
}

export interface PendingPatch extends EntityRevision {
	kind: "update";
	patch: Readonly<Record<string, unknown>>;
}

export interface PendingDelete extends EntityRevision {
	kind: "delete";
}

export interface PendingSnapshot<T> extends EntityRevision {
	kind: "snapshot";
	snapshot: T;
}

export type PatchReconciliation<T> =
	| { status: "absent" | "deleted"; value: null }
	| { status: "remote"; value: T }
	| { status: "pending"; value: T; pendingSeq: number }
	| { status: "missing-conflict"; value: null; pendingSeq: number };

/**
 * Remote absent + local patch is a conflict, not proof of a deletion.
 * A missing/RLS-hidden entity must never be fabricated from its partial patch.
 */
export function reconcilePatch<T extends object>(
	remote: T | null,
	pending?: PendingPatch,
): PatchReconciliation<T> {
	if (!pending) {
		return remote === null
			? { status: "absent", value: null }
			: { status: "remote", value: remote };
	}
	if (remote === null) {
		return { status: "missing-conflict", value: null, pendingSeq: pending.seq };
	}
	return {
		status: "pending",
		value: { ...remote, ...pending.patch },
		pendingSeq: pending.seq,
	};
}

/** A confirmed absent server row completes a pending delete without replaying it. */
export function reconcileDelete<T>(
	remote: T | null,
	pending?: PendingDelete,
):
	| PatchReconciliation<T>
	| { status: "delete-pending"; value: T; pendingSeq: number } {
	if (!pending) {
		return remote === null
			? { status: "absent", value: null }
			: { status: "remote", value: remote };
	}
	if (remote === null) return { status: "deleted", value: null };
	return { status: "delete-pending", value: remote, pendingSeq: pending.seq };
}

/** Fog is replaced by the newest whole snapshot, never concatenated with remote paths. */
export function reconcileSnapshot<T>(
	remote: T | null,
	pending?: PendingSnapshot<T>,
): PatchReconciliation<T> {
	if (pending) {
		return {
			status: "pending",
			value: pending.snapshot,
			pendingSeq: pending.seq,
		};
	}
	return remote === null
		? { status: "absent", value: null }
		: { status: "remote", value: remote };
}

/**
 * Reconciles every retained scene, including one not present in a partial refetch.
 * Complexity is O(remote + pending), only on commit/ACK/refetch (never per frame).
 */
export interface RemoteEntity<T> {
	key: string;
	value: T | null;
	/** true: complete scope; false: unknown/partial, never treated as deletion. */
	present: boolean;
}

/** One map pass builds bases; a second over retained intent covers other scenes. */
export function reconcileRemoteMap<T extends object>(
	remote: Iterable<RemoteEntity<T>>,
	pending: ReadonlyMap<string, PendingPatch>,
): Map<string, PatchReconciliation<T>> {
	const bases = new Map<string, T | null>();
	for (const item of remote) {
		if (item.present) bases.set(item.key, item.value);
	}
	for (const key of pending.keys()) {
		if (!bases.has(key)) bases.set(key, null);
	}
	const result = new Map<string, PatchReconciliation<T>>();
	for (const [key, value] of bases) {
		result.set(key, reconcilePatch(value, pending.get(key)));
	}
	return result;
}
