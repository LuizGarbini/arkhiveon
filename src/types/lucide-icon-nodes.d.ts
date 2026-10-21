/** Deep import dos ícones do lucide-react (para desenhar no Pixi). */
declare module "lucide-react/dist/esm/icons/*.js" {
	export const __iconNode: ReadonlyArray<
		readonly [string, Readonly<Record<string, string>>]
	>;
}
