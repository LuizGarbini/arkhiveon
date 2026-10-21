import {
	ArrowDownToLine,
	Biohazard,
	Brain,
	CircleDot,
	EyeOff,
	Flame,
	Ghost,
	type LucideIcon,
	Zap,
} from "lucide-react";
import { STATUS_CHIP, type VTTStatusIconName } from "./conditions";

/** Status → ícone do lucide-react (mesmo mapa do canvas). */
export const STATUS_ICONS: Record<VTTStatusIconName, LucideIcon> = {
	biohazard: Biohazard,
	"arrow-down-to-line": ArrowDownToLine,
	"eye-off": EyeOff,
	zap: Zap,
	ghost: Ghost,
	flame: Flame,
	brain: Brain,
	"circle-dot": CircleDot,
};

/** Ícone de status monocromático (`currentColor`, traço 1.5). */
export function StatusIcon({
	name,
	size = STATUS_CHIP.desktop.icon,
	className,
}: {
	name: VTTStatusIconName;
	size?: number;
	className?: string;
}) {
	const Icon = STATUS_ICONS[name];
	return (
		<Icon
			aria-hidden
			data-status-icon={name}
			size={size}
			strokeWidth={STATUS_CHIP.stroke}
			className={className}
		/>
	);
}
