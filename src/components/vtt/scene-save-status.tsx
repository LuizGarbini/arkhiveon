import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import type { SceneSession } from "@/lib/vtt/scene-session";

const noopSubscribe = () => () => {};
export function useSceneSaveState(
	session: SceneSession | undefined,
	sceneId: string,
) {
	const read = useCallback(
		() => session?.persistence.getSceneSnapshot(sceneId) ?? null,
		[session, sceneId],
	);
	const readScale = useCallback(
		() => session?.scale.getScaleSnapshot(sceneId) ?? null,
		[session, sceneId],
	);
	const snapshot = useSyncExternalStore(
		session?.persistence.subscribe ?? noopSubscribe,
		read,
		read,
	);
	const scale = useSyncExternalStore(
		session?.scale.subscribe ?? noopSubscribe,
		readScale,
		readScale,
	);
	return {
		snapshot,
		scale,
		blocked: Boolean(
			snapshot?.error ||
				scale ||
				snapshot?.entity.status === "recovering" ||
				snapshot?.entity.status === "conflict",
		),
		pending: Boolean(
			snapshot?.entity.queued ||
				snapshot?.entity.inFlight ||
				Object.keys(snapshot?.pendingPatch ?? {}).length,
		),
	};
}
export function SceneSaveStatus({
	session,
	sceneId,
}: {
	session: SceneSession;
	sceneId: string;
}) {
	const { snapshot, scale, pending } = useSceneSaveState(session, sceneId);
	if (scale?.status === "recovering")
		return (
			<div role="alert" className="flex items-center gap-2 text-xs">
				<span>Escala incerta. Leia a cena antes de continuar.</span>
				<Button
					className="min-h-[44px] shrink-0"
					variant="outline"
					onClick={() => void session.reconcile(sceneId)}
				>
					Reconciliar
				</Button>
			</div>
		);
	if (scale?.status === "failed")
		return (
			<div role="alert" className="flex items-center gap-2 text-xs">
				<span>Não foi possível mudar a escala.</span>
				<Button
					className="min-h-[44px] shrink-0"
					variant="outline"
					onClick={() => void session.dismissFailure(sceneId)}
				>
					Voltar aos ajustes
				</Button>
			</div>
		);
	if (snapshot?.error)
		return (
			<div role="alert" className="flex items-center gap-2 text-xs">
				<span>Não foi possível salvar este ajuste.</span>
				<Button
					className="min-h-[44px] shrink-0"
					variant="outline"
					onClick={() => void session.persistence.retry(sceneId)}
				>
					Tentar novamente
				</Button>
			</div>
		);
	return (
		<output className="text-xs text-muted-foreground">
			{scale
				? "Aguardando a escala…"
				: pending
					? "Ajuste pendente nesta máquina."
					: "Ajustes salvos."}
		</output>
	);
}
