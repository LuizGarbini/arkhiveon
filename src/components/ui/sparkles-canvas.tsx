import { useCallback, useEffect, useRef } from "react";

/* ── Design-system sparkle palette ── */
const SPARKLE_COLORS = [
	"#8B5CF6", // primary purple
	"#D946EF", // fuchsia accent
	"#F59E0B", // amber/gold
	"#FEF08A", // soft yellow
	"#A78BFA", // light purple
	"#C084FC", // orchid
	"#FBBF24", // warm gold
];

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	rotation: number;
	rotationSpeed: number;
	color: string;
	opacity: number;
	decay: number;
	gravity: number;
}

function drawStar(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	size: number,
	rotation: number,
	color: string,
	opacity: number,
) {
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(rotation);
	ctx.globalAlpha = opacity;

	// 4-pointed star
	const outerRadius = size;
	const innerRadius = size * 0.35;
	const points = 4;

	ctx.beginPath();
	for (let i = 0; i < points * 2; i++) {
		const radius = i % 2 === 0 ? outerRadius : innerRadius;
		const angle = (i * Math.PI) / points - Math.PI / 2;
		const x = Math.cos(angle) * radius;
		const y = Math.sin(angle) * radius;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.closePath();

	// Glow effect
	ctx.shadowColor = color;
	ctx.shadowBlur = size * 2.5;
	ctx.fillStyle = color;
	ctx.fill();

	// Bright core
	ctx.shadowBlur = 0;
	ctx.globalAlpha = opacity * 0.6;
	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	const coreSize = size * 0.25;
	ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

interface SparklesCanvasProps {
	/** Number of particles to spawn */
	count?: number;
	/** Duration in milliseconds before auto-cleanup */
	duration?: number;
	/** Called when all particles have faded out */
	onComplete?: () => void;
}

export function SparklesCanvas({
	count = 120,
	duration = 4000,
	onComplete,
}: SparklesCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animFrameRef = useRef(0);
	const particlesRef = useRef<Particle[]>([]);
	const hasSpawned = useRef(false);

	const spawnParticles = useCallback(
		(width: number, height: number) => {
			const particles: Particle[] = [];
			for (let i = 0; i < count; i++) {
				const angle = Math.random() * Math.PI * 2;
				const speed = 1.5 + Math.random() * 5;
				particles.push({
					x: width * (0.2 + Math.random() * 0.6),
					y: height * (0.1 + Math.random() * 0.4),
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed - 2,
					size: 3 + Math.random() * 8,
					rotation: Math.random() * Math.PI * 2,
					rotationSpeed: (Math.random() - 0.5) * 0.15,
					color:
						SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
					opacity: 0.7 + Math.random() * 0.3,
					decay: 0.003 + Math.random() * 0.006,
					gravity: 0.03 + Math.random() * 0.04,
				});
			}
			particlesRef.current = particles;
		},
		[count],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		function resize() {
			if (!canvas) return;
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
		resize();
		window.addEventListener("resize", resize);

		if (!hasSpawned.current) {
			spawnParticles(canvas.width, canvas.height);
			hasSpawned.current = true;
		}

		let active = true;

		function animate() {
			if (!active || !canvas || !ctx) return;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const particles = particlesRef.current;
			let aliveCount = 0;

			for (const p of particles) {
				if (p.opacity <= 0) continue;
				aliveCount++;

				p.x += p.vx;
				p.vy += p.gravity;
				p.y += p.vy;
				p.vx *= 0.995;
				p.rotation += p.rotationSpeed;
				p.opacity -= p.decay;

				// Wind sway
				p.x += Math.sin(p.y * 0.01 + p.rotation) * 0.3;

				if (p.opacity > 0) {
					drawStar(ctx, p.x, p.y, p.size, p.rotation, p.color, p.opacity);
				}
			}

			if (aliveCount === 0) {
				onComplete?.();
				return;
			}

			animFrameRef.current = requestAnimationFrame(animate);
		}

		animFrameRef.current = requestAnimationFrame(animate);

		// Safety timeout — force cleanup after duration
		const timeout = window.setTimeout(() => {
			for (const p of particlesRef.current) {
				p.decay = 0.04; // fast fade
			}
		}, duration);

		return () => {
			active = false;
			cancelAnimationFrame(animFrameRef.current);
			clearTimeout(timeout);
			window.removeEventListener("resize", resize);
		};
	}, [duration, onComplete, spawnParticles]);

	return (
		<canvas
			ref={canvasRef}
			className="pointer-events-none fixed inset-0 z-[9999]"
			aria-hidden="true"
		/>
	);
}
