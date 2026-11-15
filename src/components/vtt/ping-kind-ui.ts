import {
	Focus,
	Footprints,
	LifeBuoy,
	Megaphone,
	Radio,
	TriangleAlert,
} from "lucide-react";
import type { ComponentType } from "react";
import type { PingKind } from "@/lib/vtt/ping-kinds";

/** Ícone e cor de cada tipo de ping na interface (roda, painel e lista). */
export const PING_KIND_ICON: Record<
	PingKind,
	ComponentType<{ className?: string }>
> = {
	attention: Radio,
	danger: TriangleAlert,
	going: Footprints,
	help: LifeBuoy,
	highlight: Focus,
	focus: Megaphone,
};

export const PING_KIND_TEXT_CLASS: Record<PingKind, string> = {
	attention: "text-foreground",
	danger: "text-red-400",
	going: "text-emerald-400",
	help: "text-amber-400",
	highlight: "text-primary",
	focus: "text-yellow-300",
};
