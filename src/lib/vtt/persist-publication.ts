export type PublishSceneRpc = (
	name: "publish_scene",
	args: { p_scene_id: string },
) => PromiseLike<{
	data: string | null;
	error: { code?: string; message: string } | null;
}>;

type Toast = (
	variant: "error",
	toast: { title: string; description: string },
) => void;

export async function publishScene<
	Scene extends { id: string; isActive: boolean },
>({
	sceneId,
	rpc,
	scenes,
	toast,
}: {
	sceneId: string;
	rpc: PublishSceneRpc;
	scenes: Scene[];
	toast: Toast;
}): Promise<Scene[]> {
	try {
		const { error } = await rpc("publish_scene", { p_scene_id: sceneId });
		if (error?.code === "PGRST202") {
			throw new Error(
				"A publicação atômica ainda não está habilitada nesta mesa. Avise o administrador.",
			);
		}
		if (error) throw new Error(error.message);
	} catch (cause) {
		const message =
			cause instanceof Error
				? cause.message
				: "Não foi possível exibir a cena.";
		toast("error", {
			title: "Não foi possível exibir a cena",
			description: message,
		});
		throw cause;
	}

	// Só depois do ACK: a RPC de 0053 desativa as demais na mesma transação.
	return scenes.map((scene) => ({
		...scene,
		isActive: scene.id === sceneId,
	}));
}
