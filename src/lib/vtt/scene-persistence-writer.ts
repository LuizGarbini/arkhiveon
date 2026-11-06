import type { Database } from "@/lib/database.types";
import type {
	PersistenceWriter,
	WriteFailure,
	WriteFailureKind,
} from "./persistence-queue";

type SceneUpdate = Database["public"]["Tables"]["vtt_scenes"]["Update"];
export interface SceneWriteError {
	code?: string;
	message: string;
}
export interface SceneWriteResult {
	data: { id: string; updated_at: string } | null;
	error: SceneWriteError | null;
}
export interface SceneSaveClient {
	from(table: "vtt_scenes"): {
		update(patch: SceneUpdate): {
			eq(
				column: "id",
				value: string,
			): {
				eq(
					column: "campaign_id",
					value: string,
				): {
					select(columns: "id, updated_at"): {
						maybeSingle(): PromiseLike<SceneWriteResult>;
					};
				};
			};
		};
	};
}
export function classifySceneWriteError(error: unknown): WriteFailure {
	const candidate =
		typeof error === "object" && error !== null
			? (error as { code?: unknown; message?: unknown })
			: {};
	const code = typeof candidate.code === "string" ? candidate.code : "";
	const message =
		typeof candidate.message === "string"
			? candidate.message
			: error instanceof Error
				? error.message
				: "Não foi possível salvar";
	const session =
		code === "PGRST303" ||
		code === "401" ||
		/jwt.*expired|session.*expired/i.test(message);
	const permanent =
		error instanceof TypeError
			? false
			: code === "42501" || code === "403" || code === "PGRST116";
	const kind: WriteFailureKind = session
		? "session"
		: permanent
			? "permanent"
			: "transient";
	return { kind, message };
}

/** D7: RLS sem linha ou sem resposta nunca é ACK de gravação. */
export function createSceneWriter(
	client: SceneSaveClient | null,
): PersistenceWriter {
	return async (write) => {
		if (!client)
			return { kind: "transient", message: "Sem conexão com o servidor" };
		if (
			write.kind !== "update" ||
			!write.patch ||
			Object.keys(write.patch).length === 0
		) {
			return {
				kind: "permanent",
				message: "A fila da cena aceita somente ajustes não vazios",
			};
		}
		try {
			const result = await client
				.from("vtt_scenes")
				.update(write.patch)
				.eq("id", write.scope.sceneId)
				.eq("campaign_id", write.scope.campaignId)
				.select("id, updated_at")
				.maybeSingle();
			if (result.error) return classifySceneWriteError(result.error);
			if (!result.data?.id)
				return {
					kind: "permanent",
					message: "Cena inexistente ou sem permissão para salvar",
				};
			return undefined;
		} catch (cause) {
			return classifySceneWriteError(cause);
		}
	};
}
