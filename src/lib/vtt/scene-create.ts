/**
 * Creating a scene must be idempotent. The insert used to let the database
 * pick the id, so the same create reaching the server twice stored two
 * scenes with the same name: a POST repeated by the network layer, a retry
 * after an error whose insert had already committed, or a second press while
 * the first create was still in flight (the empty-table button has no
 * pending state). Each create now carries an id chosen by the client and kept
 * for retries of the same draft; a repeat hits the primary key and the
 * existing row is read back instead of a new one being inserted.
 */

/** Postgres unique_violation, returned by PostgREST when the id already exists. */
export const PG_UNIQUE_VIOLATION = "23505";

/** True when an insert failed only because the same create already landed. */
export function isRepeatedCreate(
	error: { code?: string } | null | undefined,
): boolean {
	return error?.code === PG_UNIQUE_VIOLATION;
}

/** Fresh id for a scene draft; reuse it for every retry of that draft. */
export function newSceneId(): string {
	return crypto.randomUUID();
}

/**
 * Runs one task at a time: calls made while a task is pending get the same
 * promise instead of starting another task.
 */
export function singleFlight<T>(): (run: () => Promise<T>) => Promise<T> {
	let pending: Promise<T> | null = null;
	return (run) => {
		if (pending) return pending;
		const current = run().finally(() => {
			if (pending === current) pending = null;
		});
		pending = current;
		return current;
	};
}
