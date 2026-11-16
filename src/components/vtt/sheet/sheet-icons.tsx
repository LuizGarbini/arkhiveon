import { cn } from "@/lib/utils";

interface GlyphProps {
	className?: string;
}

/** Icosaedro d20 facetado com geometria interna. */
export function D20Glyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<polygon
				points="12,2.2 20.5,7.1 20.5,16.9 12,21.8 3.5,16.9 3.5,7.1"
				fill="currentColor"
				fillOpacity="0.12"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<polygon
				points="12,5.6 17.5,15.1 6.5,15.1"
				fill="currentColor"
				fillOpacity="0.1"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinejoin="round"
			/>
			<path
				d="M12 2.2V5.6M20.5 7.1L17.5 15.1M3.5 7.1L6.5 15.1M12 21.8L6.5 15.1M12 21.8L17.5 15.1M3.5 16.9L6.5 15.1M20.5 16.9L17.5 15.1M3.5 7.1L12 5.6M20.5 7.1L12 5.6"
				stroke="currentColor"
				strokeWidth="1.1"
				strokeOpacity="0.55"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Escudo heráldico chanfrado com losango arcano central. */
export function ArcaneShieldGlyph({
	className,
	filled = false,
}: GlyphProps & { filled?: boolean }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<path
				d="M12 2.5L19.5 5.4V11.2C19.5 16.1 16.3 19.8 12 21.6C7.7 19.8 4.5 16.1 4.5 11.2V5.4L12 2.5Z"
				fill="currentColor"
				fillOpacity={filled ? "0.24" : "0.08"}
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M12 7.2L15.1 11.2L12 15.6L8.9 11.2L12 7.2Z"
				fill="currentColor"
				fillOpacity={filled ? "0.75" : "0.18"}
				stroke="currentColor"
				strokeWidth="1.2"
				strokeOpacity={filled ? "0.9" : "0.55"}
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Estrela arcana de 4 pontas com núcleo em diamante para Inspiração. */
export function ArcaneSparkGlyph({
	className,
	active = false,
}: GlyphProps & { active?: boolean }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<path
				d="M12 2.4L14.3 9.7L21.6 12L14.3 14.3L12 21.6L9.7 14.3L2.4 12L9.7 9.7L12 2.4Z"
				fill="currentColor"
				fillOpacity={active ? "0.28" : "0.1"}
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<circle
				cx="12"
				cy="12"
				r="2"
				fill="currentColor"
				fillOpacity={active ? "0.95" : "0.35"}
			/>
			<path
				d="M18.2 4.8L18.8 6.4L20.4 7L18.8 7.6L18.2 9.2L17.6 7.6L16 7L17.6 6.4L18.2 4.8Z"
				fill="currentColor"
				fillOpacity={active ? "0.75" : "0.3"}
			/>
		</svg>
	);
}

/** Cristal de vitalidade facetado para Pontos de vida. */
export function VitalityHeartGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<path
				d="M12 20.6L4.6 13.4C2.7 11.4 2.8 8.1 4.9 6.3C6.8 4.6 9.6 4.9 11.2 6.8L12 7.8L12.8 6.8C14.4 4.9 17.2 4.6 19.1 6.3C21.2 8.1 21.3 11.4 19.4 13.4L12 20.6Z"
				fill="currentColor"
				fillOpacity="0.16"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M12 9.2L14.7 12.2L12 16.5L9.3 12.2L12 9.2Z"
				fill="currentColor"
				fillOpacity="0.22"
				stroke="currentColor"
				strokeWidth="1.15"
				strokeOpacity="0.65"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Égide octogonal com cruz arcana interna para Vida temporária. */
export function WardShieldGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<polygon
				points="8.2,3 15.8,3 21,8.2 21,15.8 15.8,21 8.2,21 3,15.8 3,8.2"
				fill="currentColor"
				fillOpacity="0.14"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M12 7.5V16.5M7.5 12H16.5"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Grimório / pergaminho selado detalhado para o botão Ficha. */
export function CodexScrollGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<path
				d="M6.5 3.5H16.5C18.2 3.5 19.5 4.8 19.5 6.5V18.5C19.5 19.6 18.6 20.5 17.5 20.5H7.5C5.8 20.5 4.5 19.2 4.5 17.5V5.5C4.5 4.4 5.4 3.5 6.5 3.5Z"
				fill="currentColor"
				fillOpacity="0.14"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M8 8.2H15.5M8 11.8H14M8 15.4H11.5"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeOpacity="0.8"
				strokeLinecap="round"
			/>
			<circle
				cx="15.3"
				cy="16"
				r="1.7"
				fill="currentColor"
				fillOpacity="0.55"
			/>
		</svg>
	);
}

/** Olho místico com pupila em losango e raios para Visão. */
export function ArcaneEyeGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<path
				d="M2.6 12C4.9 7.6 8.2 5.6 12 5.6C15.8 5.6 19.1 7.6 21.4 12C19.1 16.4 15.8 18.4 12 18.4C8.2 18.4 4.9 16.4 2.6 12Z"
				fill="currentColor"
				fillOpacity="0.12"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M12 8.7L14.6 12L12 15.3L9.4 12L12 8.7Z"
				fill="currentColor"
				fillOpacity="0.35"
				stroke="currentColor"
				strokeWidth="1.3"
				strokeLinejoin="round"
			/>
			<circle cx="12" cy="12" r="1.1" fill="currentColor" />
		</svg>
	);
}

/** Sol radiante para Descanso curto. */
export function SunburstGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<circle
				cx="12"
				cy="12"
				r="4.2"
				fill="currentColor"
				fillOpacity="0.18"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<path
				d="M12 3.2V5.3M12 18.7V20.8M3.2 12H5.3M18.7 12H20.8M5.8 5.8L7.3 7.3M16.7 16.7L18.2 18.2M18.2 5.8L16.7 7.3M7.3 16.7L5.8 18.2"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Lua crescente com estrelas para Descanso longo. */
export function CrescentMoonGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<path
				d="M19.4 14.3A7.5 7.5 0 0 1 9.7 4.6A7.6 7.6 0 1 0 19.4 14.3Z"
				fill="currentColor"
				fillOpacity="0.18"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M16.8 5.2L17.3 6.5L18.6 7L17.3 7.5L16.8 8.8L16.3 7.5L15 7L16.3 6.5L16.8 5.2Z"
				fill="currentColor"
				fillOpacity="0.7"
			/>
		</svg>
	);
}

/** Lâminas cruzadas para ataques corpo a corpo. */
export function CrossedBladesGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<path
				d="M14.5 4.2L19.8 4.2L19.8 9.5L11.2 18.1L5.9 12.8L14.5 4.2Z"
				fill="currentColor"
				fillOpacity="0.14"
				stroke="currentColor"
				strokeWidth="1.45"
				strokeLinejoin="round"
			/>
			<path
				d="M9.5 4.2L4.2 4.2L4.2 9.5L12.8 18.1L18.1 12.8"
				stroke="currentColor"
				strokeWidth="1.45"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M4.5 19.5L8.2 15.8M19.5 19.5L15.8 15.8"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Retículo de mira para ataques à distância. */
export function BowTargetGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<circle
				cx="12"
				cy="12"
				r="7.5"
				fill="currentColor"
				fillOpacity="0.1"
				stroke="currentColor"
				strokeWidth="1.45"
			/>
			<circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.3" />
			<path
				d="M12 2.6V6M12 18V21.4M2.6 12H6M18 12H21.4"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Runa arcana geométrica para magias. */
export function SpellRuneGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<circle
				cx="12"
				cy="12"
				r="8.2"
				stroke="currentColor"
				strokeWidth="1.25"
				strokeOpacity="0.55"
				strokeDasharray="2.5 2.5"
			/>
			<polygon
				points="12,4.5 18.4,15.5 5.6,15.5"
				fill="currentColor"
				fillOpacity="0.14"
				stroke="currentColor"
				strokeWidth="1.45"
				strokeLinejoin="round"
			/>
			<circle cx="12" cy="12.2" r="1.5" fill="currentColor" />
		</svg>
	);
}

/** Cantoneiras de precisão para expandir / tela cheia. */
export function ExpandFrameGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-4 shrink-0", className)}
		>
			<path
				d="M4.5 9V5.5C4.5 4.9 4.9 4.5 5.5 4.5H9M15 4.5H18.5C19.1 4.5 19.5 4.9 19.5 5.5V9M19.5 15V18.5C19.5 19.1 19.1 19.5 18.5 19.5H15M9 19.5H5.5C4.9 19.5 4.5 19.1 4.5 18.5V15"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect
				x="8.2"
				y="8.2"
				width="7.6"
				height="7.6"
				rx="1.5"
				fill="currentColor"
				fillOpacity="0.18"
				stroke="currentColor"
				strokeWidth="1.2"
				strokeOpacity="0.65"
			/>
		</svg>
	);
}

/** Astrolábio geométrico para aba Resumo. */
export function SummaryGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-3.5 shrink-0", className)}
		>
			<rect
				x="3.5"
				y="3.5"
				width="7.2"
				height="7.2"
				rx="1.8"
				fill="currentColor"
				fillOpacity="0.2"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<rect
				x="13.3"
				y="3.5"
				width="7.2"
				height="7.2"
				rx="1.8"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<rect
				x="3.5"
				y="13.3"
				width="7.2"
				height="7.2"
				rx="1.8"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<rect
				x="13.3"
				y="13.3"
				width="7.2"
				height="7.2"
				rx="1.8"
				fill="currentColor"
				fillOpacity="0.12"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
		</svg>
	);
}

/** Régua de perícia em 3 níveis para aba Perícias. */
export function SkillsGlyph({ className }: GlyphProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			className={cn("size-3.5 shrink-0", className)}
		>
			<path
				d="M5 7H19M5 12H15M5 17H11"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
			<circle cx="17.5" cy="12" r="2" fill="currentColor" fillOpacity="0.45" />
			<circle cx="14.5" cy="17" r="2" fill="currentColor" fillOpacity="0.85" />
		</svg>
	);
}
