import { useRouterState } from "@tanstack/react-router";

/**
 * Caminho que o layout raiz deve usar para escolher a casca.
 *
 * Durante uma navegação, `location` já aponta para a URL nova, mas o
 * `<Outlet />` ainda mostra a rota anterior enquanto o chunk da nova carrega
 * (ex.: a mesa, que é pesada). Decidir a casca pela rota já resolvida evita
 * mostrar a página antiga com a casca da página nova.
 */
export function pickLayoutPathname(
	locationPathname: string,
	resolvedPathname: string | undefined,
): string {
	return resolvedPathname ?? locationPathname;
}

export function isFullscreenTabletopPath(pathname: string): boolean {
	return pathname.includes("/vtt");
}

export function useLayoutPathname(): string {
	return useRouterState({
		select: (s) =>
			pickLayoutPathname(s.location.pathname, s.resolvedLocation?.pathname),
	});
}
