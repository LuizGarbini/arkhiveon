import { Loader2 } from "lucide-react";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { scenePersistenceKey } from "@/lib/vtt/scene-persistence";
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
type SceneSaveStatusProps = { session: SceneSession; sceneId: string };
export function SceneSaveStatus(props: SceneSaveStatusProps) {
	return <SceneStatusForScene key={props.sceneId} {...props} />;
}
function SceneStatusForScene({
	session,
	sceneId,
}: {
	session: SceneSession;
	sceneId: string;
}) {
	const { snapshot, scale, pending } = useSceneSaveState(session, sceneId);
	const [retryPending, setRetryPending] = useState(false);
	const retryFlight = useRef(false);
	const physicalRetryPending = () => {
		const entity = session.persistence.queue.inspect(
			scenePersistenceKey(sceneId),
		);
		return Boolean(!entity?.error && (entity?.inFlight || entity?.queued));
	};
	// The handler owns immediate feedback; the P1 state survives panel remounts.
	const retrying =
		retryPending || (Boolean(snapshot?.error) && physicalRetryPending());
	const handleRetry = async () => {
		if (retryFlight.current || physicalRetryPending()) return;
		retryFlight.current = true;
		setRetryPending(true);
		try {
			await session.persistence.retry(sceneId);
		} finally {
			retryFlight.current = false;
			setRetryPending(false);
		}
	};
	if (scale?.status === "recovering")
		return (
			<div role="alert" className="flex items-center gap-2 text-xs">
				<span className="text-destructive">
					Escala incerta. Leia a cena antes de continuar.
				</span>
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
				<span className="text-destructive">
					Não foi possível mudar a escala.
				</span>
				<Button
					className="min-h-[44px] shrink-0"
					variant="outline"
					onClick={() => void session.dismissFailure(sceneId)}
				>
					Voltar aos ajustes
				</Button>
			</div>
		);
	if (snapshot?.error || retrying)
		return (
			<div role="alert" className="flex items-center gap-2 text-xs">
				<span className="text-destructive">
					Não foi possível salvar este ajuste.
				</span>
				<Button
					className="min-h-[44px] shrink-0"
					variant="outline"
					disabled={retrying}
					aria-busy={retrying}
					loading={retrying}
					onClick={() => void handleRetry()}
				>
					{retrying && (
						<Loader2 aria-hidden="true" className="size-4 animate-spin" />
					)}
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
