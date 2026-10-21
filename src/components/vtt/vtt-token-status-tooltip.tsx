import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { canSeeTokenStatus, conditionDef } from "@/lib/vtt/conditions";
import { useVTTStore } from "@/lib/vtt/vtt-store";

/**
 * Tooltip do DS com os status do token sob o ponteiro (desktop). O canvas só
 * marca `hoveredStatusTokenId`; a âncora é um ponto fixo no topo do token.
 */
export function VTTTokenStatusTooltip() {
	const token = useVTTStore((s) =>
		s.hoveredStatusTokenId
			? (s.tokens.find((t) => t.id === s.hoveredStatusTokenId) ?? null)
			: null,
	);
	const gridSize = useVTTStore(
		(s) => s.scenes.find((sc) => sc.id === s.activeSceneId)?.gridSize ?? 70,
	);
	const vx = useVTTStore((s) => s.viewport.x);
	const vy = useVTTStore((s) => s.viewport.y);
	const scale = useVTTStore((s) => s.viewport.scale);
	const dragging = useVTTStore((s) => s.draggedTokenId !== null);
	const isGM = useVTTStore((s) => s.isGM);

	if (!token || dragging || !canSeeTokenStatus(token, isGM)) return null;
	// No tooltip vão todos os status (inclusive os que viraram "+N").
	const labels = [...new Set(token.conditions ?? [])]
		.filter((id) => id.trim())
		.map((id) => conditionDef(id).label);
	if (labels.length === 0) return null;

	const radius = ((token.sizeCells * gridSize) / 2) * scale;
	const left = token.x * scale + vx;
	const top = token.y * scale + vy - radius;

	return (
		<Tooltip open>
			<TooltipTrigger
				render={
					<span
						aria-hidden
						data-testid="token-status-anchor"
						className="pointer-events-none fixed size-px"
						style={{ left, top }}
					/>
				}
			/>
			<TooltipContent side="top" sideOffset={8}>
				<span className="sr-only">{token.name}: </span>
				{labels.join(" · ")}
			</TooltipContent>
		</Tooltip>
	);
}
