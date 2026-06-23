/** Design System — ativo em dev local ou quando explicitamente habilitado no build. */
export function isDesignSystemEnabled(): boolean {
	return (
		import.meta.env.DEV || import.meta.env.VITE_ENABLE_DESIGN_SYSTEM === "true"
	);
}
