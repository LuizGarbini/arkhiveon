/**
 * D20Canvas — PROTOTYPE COMPONENT
 * Three.js interactive d20 die for the landing page hero.
 * Supports auto-rotation, hover parallax rotation, click-and-drag rotation with physics inertia,
 * and quick-click to roll the die.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface D20CanvasProps {
	className?: string;
}

const FACE_NUMBERS = [
	20, 1, 19, 2, 18, 3, 17, 4, 16, 5, 15, 6, 14, 7, 13, 8, 12, 9, 11, 10,
];

function createD20Geometry() {
	return new THREE.IcosahedronGeometry(1, 0);
}

function createD20Material() {
	return new THREE.MeshPhysicalMaterial({
		color: new THREE.Color("#18122c"), // Deep metallic purple/gray
		metalness: 0.92,
		roughness: 0.22,
		clearcoat: 1.0,
		clearcoatRoughness: 0.08,
		reflectivity: 1.0,
		transmission: 0.08,
		thickness: 0.4,
		ior: 1.6,
		envMapIntensity: 1.6,
	});
}

function createWireframeMaterial() {
	return new THREE.MeshBasicMaterial({
		color: new THREE.Color("#b258ff"),
		wireframe: true,
		transparent: true,
		opacity: 0.15,
	});
}

export function D20Canvas({ className }: D20CanvasProps) {
	const mountRef = useRef<HTMLDivElement>(null);
	const [lastFace, setLastFace] = useState<number | null>(null);
	const [rolling, setRolling] = useState(false);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const mount = mountRef.current;
		if (!mount) return;

		// ── WebGL Support Check ───────────────────────────────────────────────
		let isWebGLSupported = true;
		try {
			const canvas = document.createElement("canvas");
			const gl = window.WebGLRenderingContext
				? canvas.getContext("webgl")
				: null;
			// Libera o contexto de teste na hora: o Chrome mantém poucos vivos (~16).
			gl?.getExtension("WEBGL_lose_context")?.loseContext();
			isWebGLSupported = !!gl;
		} catch {
			isWebGLSupported = false;
		}

		if (!isWebGLSupported) {
			return;
		}

		// ── Scene & Camera ────────────────────────────────────────────────────
		const scene = new THREE.Scene();
		const w = mount.clientWidth;
		const h = mount.clientHeight;
		const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
		camera.position.set(0, 0, 4.2);

		// ── Renderer ──────────────────────────────────────────────────────────
		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			powerPreference: "high-performance",
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(w, h);
		renderer.setClearColor(0x000000, 0);
		renderer.domElement.style.background = "transparent";
		renderer.domElement.style.backgroundColor = "transparent";
		mount.appendChild(renderer.domElement);

		// ── Lights ────────────────────────────────────────────────────────────
		const ambient = new THREE.AmbientLight(0xffffff, 0.35);
		scene.add(ambient);

		const key = new THREE.DirectionalLight(0xffffff, 2.5);
		key.position.set(4, 5, 6);
		scene.add(key);

		const fill = new THREE.DirectionalLight(0x7e4aff, 1.8);
		fill.position.set(-4, -2, 2);
		scene.add(fill);

		const back = new THREE.DirectionalLight(0xa855f7, 1.2);
		back.position.set(0, 3, -4);
		scene.add(back);

		const rim = new THREE.PointLight(0xff6bff, 2.0, 15);
		rim.position.set(0, -3, -2);
		scene.add(rim);

		// ── Pivot Group (Hover Parallax) ──────────────────────────────────────
		const pivot = new THREE.Group();
		scene.add(pivot);

		// ── Mesh, Wireframe & Inner Glow ──────────────────────────────────────
		const geo = createD20Geometry();
		const mat = createD20Material();
		const mesh = new THREE.Mesh(geo, mat);
		pivot.add(mesh);

		const wireMat = createWireframeMaterial();
		const wire = new THREE.Mesh(geo.clone(), wireMat);
		wire.scale.setScalar(1.002);
		pivot.add(wire);

		const innerGeo = new THREE.SphereGeometry(0.8, 32, 32);
		const innerMat = new THREE.MeshBasicMaterial({
			color: new THREE.Color("#9d6eff"),
			transparent: true,
			opacity: 0.05,
		});
		const innerGlow = new THREE.Mesh(innerGeo, innerMat);
		pivot.add(innerGlow);

		// ── Particles ─────────────────────────────────────────────────────────
		const particleCount = 100;
		const particlePositions = new Float32Array(particleCount * 3);
		for (let i = 0; i < particleCount; i++) {
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const r = 1.5 + Math.random() * 1.0;
			particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
			particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
			particlePositions[i * 3 + 2] = r * Math.cos(phi);
		}
		const particleGeo = new THREE.BufferGeometry();
		particleGeo.setAttribute(
			"position",
			new THREE.BufferAttribute(particlePositions, 3),
		);
		const particleMat = new THREE.PointsMaterial({
			color: 0xc084fc,
			size: 0.02,
			transparent: true,
			opacity: 0.45,
		});
		const particles = new THREE.Points(particleGeo, particleMat);
		pivot.add(particles);

		// ── Interaction state ─────────────────────────────────────────────────
		let isDragging = false;
		let previousPointerPosition = { x: 0, y: 0 };
		let dragVelocity = { x: 0, y: 0 };
		let dragStartPos = { x: 0, y: 0 };
		let dragStartTime = 0;

		// Hover Parallax States
		const hoverParallax = { x: 0, y: 0 };
		const targetHoverParallax = { x: 0, y: 0 };

		let isRolling = false;
		let rollVelX = 0;
		let rollVelY = 0;
		let rollVelZ = 0;
		const rollDecay = 0.94;

		const triggerRoll = () => {
			if (isRolling) return;
			isRolling = true;
			rollVelX = (Math.random() - 0.5) * 18;
			rollVelY = (Math.random() - 0.5) * 18;
			rollVelZ = (Math.random() - 0.5) * 8;
			setRolling(true);

			setTimeout(() => {
				const face = FACE_NUMBERS[Math.floor(Math.random() * 20)];
				setLastFace(face);
				setRolling(false);
				isRolling = false;
			}, 1500);
		};

		// ── Pointer Handlers ──────────────────────────────────────────────────
		const onPointerDown = (e: PointerEvent) => {
			isDragging = true;
			previousPointerPosition = { x: e.clientX, y: e.clientY };
			dragStartPos = { x: e.clientX, y: e.clientY };
			dragStartTime = performance.now();
			dragVelocity = { x: 0, y: 0 };
		};

		const onPointerMove = (e: PointerEvent) => {
			const rect = mount.getBoundingClientRect();
			const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
			const ny = -((e.clientY - rect.top) / rect.height - 0.5) * 2;

			if (isDragging) {
				if (isRolling) return;
				const deltaMove = {
					x: e.clientX - previousPointerPosition.x,
					y: e.clientY - previousPointerPosition.y,
				};
				mesh.rotation.y += deltaMove.x * 0.007;
				mesh.rotation.x += deltaMove.y * 0.007;
				dragVelocity.x = deltaMove.x * 0.007;
				dragVelocity.y = deltaMove.y * 0.007;
				previousPointerPosition = { x: e.clientX, y: e.clientY };
			} else {
				// Target hover parallax when simply moving mouse over canvas
				targetHoverParallax.x = nx * 0.28;
				targetHoverParallax.y = -ny * 0.22; // Inverted relative to mouse y
			}
		};

		const onPointerUp = (e: PointerEvent) => {
			if (!isDragging) return;
			isDragging = false;
			const dragDistance = Math.hypot(
				e.clientX - dragStartPos.x,
				e.clientY - dragStartPos.y,
			);
			const dragDuration = performance.now() - dragStartTime;
			if (dragDistance < 6 && dragDuration < 200) {
				triggerRoll();
			}
		};

		const onPointerLeave = () => {
			targetHoverParallax.x = 0;
			targetHoverParallax.y = 0;
		};

		mount.addEventListener("pointerdown", onPointerDown);
		mount.addEventListener("pointerleave", onPointerLeave);
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);

		// ── Visibility / Loop Throttling via IntersectionObserver ────────────
		let isVisible = true;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					isVisible = entry.isIntersecting;
				}
			},
			{ threshold: 0.05 },
		);
		observer.observe(mount);

		// ── Animate ───────────────────────────────────────────────────────────
		let frameId = 0;
		const clock = new THREE.Clock();
		let hasRenderedFirstFrame = false;

		const animate = () => {
			frameId = requestAnimationFrame(animate);

			// Skip render steps if off-screen to save CPU/GPU resource
			if (!isVisible) return;

			const t = clock.getElapsedTime();

			if (isRolling) {
				mesh.rotation.x += rollVelX * 0.01;
				mesh.rotation.y += rollVelY * 0.01;
				mesh.rotation.z += rollVelZ * 0.01;
				rollVelX *= rollDecay;
				rollVelY *= rollDecay;
				rollVelZ *= rollDecay;
				wire.rotation.copy(mesh.rotation);
			} else if (isDragging) {
				wire.rotation.copy(mesh.rotation);
			} else {
				// Apply drag momentum (inertia)
				mesh.rotation.y += dragVelocity.x;
				mesh.rotation.x += dragVelocity.y;
				dragVelocity.x *= 0.95;
				dragVelocity.y *= 0.95;

				// Idle spin when drag momentum is nearly zero
				if (
					Math.abs(dragVelocity.x) < 0.001 &&
					Math.abs(dragVelocity.y) < 0.001
				) {
					mesh.rotation.y += 0.003;
					mesh.rotation.x += Math.sin(t * 0.4) * 0.001;
				}
				wire.rotation.copy(mesh.rotation);
			}

			// Apply hover parallax to the pivot group
			hoverParallax.x += (targetHoverParallax.x - hoverParallax.x) * 0.06;
			hoverParallax.y += (targetHoverParallax.y - hoverParallax.y) * 0.06;
			pivot.rotation.y = hoverParallax.x;
			pivot.rotation.x = hoverParallax.y;

			particles.rotation.y = t * 0.06;
			particles.rotation.x = Math.sin(t * 0.08) * 0.12;
			innerGlow.scale.setScalar(1 + Math.sin(t * 1.1) * 0.03);
			rim.position.x = Math.sin(t * 0.5) * 2.8;
			rim.position.z = Math.cos(t * 0.5) * 2.8 - 1;

			renderer.render(scene, camera);

			// Reveal canvas smoothly after the very first WebGL frame renders
			if (!hasRenderedFirstFrame) {
				hasRenderedFirstFrame = true;
				setIsReady(true);
			}
		};
		animate();

		// ── Resize ────────────────────────────────────────────────────────────
		const onResize = () => {
			if (!mount) return;
			const nw = mount.clientWidth;
			const nh = mount.clientHeight;
			camera.aspect = nw / nh;
			camera.updateProjectionMatrix();
			renderer.setSize(nw, nh);
		};
		window.addEventListener("resize", onResize);

		// ── Cleanup ───────────────────────────────────────────────────────────
		return () => {
			cancelAnimationFrame(frameId);
			observer.disconnect();
			window.removeEventListener("resize", onResize);
			mount.removeEventListener("pointerdown", onPointerDown);
			mount.removeEventListener("pointerleave", onPointerLeave);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);

			// Dispose geometries
			geo.dispose();
			innerGeo.dispose();
			particleGeo.dispose();
			wire.geometry.dispose();

			// Dispose materials
			mat.dispose();
			wireMat.dispose();
			innerMat.dispose();
			particleMat.dispose();

			renderer.dispose();
			renderer.forceContextLoss();
			if (mount.contains(renderer.domElement)) {
				mount.removeChild(renderer.domElement);
			}
		};
	}, []);

	return (
		<div
			className={`relative bg-transparent transition-all duration-[1200ms] ease-out ${
				isReady ? "opacity-100 scale-100" : "opacity-0 scale-[0.88]"
			} ${className ?? ""}`}
		>
			<div
				ref={mountRef}
				className="h-full w-full bg-transparent cursor-grab active:cursor-grabbing touch-none select-none"
				title="Arraste para girar, clique para rolar o d20!"
			/>
			{/* Face result overlay */}
			{lastFace !== null && (
				<div
					className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${rolling ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}
				>
					<span
						className={`font-display text-[80px] font-black leading-none tabular-nums ${
							lastFace === 20
								? "text-yellow-400 drop-shadow-[0_0_24px_rgba(250,204,21,0.8)]"
								: lastFace === 1
									? "text-rose-500 drop-shadow-[0_0_24px_rgba(239,68,68,0.8)]"
									: "text-white drop-shadow-[0_0_12px_rgba(178,88,255,0.6)]"
						}`}
					>
						{lastFace}
					</span>
					<span className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
						{lastFace === 20
							? "✦ Crítico!"
							: lastFace === 1
								? "✦ Falha!"
								: "d20"}
					</span>
				</div>
			)}
			{/* Hint to click & drag */}
			{lastFace === null && !rolling && (
				<div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
					<span className="animate-pulse text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
						Arraste para girar · clique para rolar
					</span>
				</div>
			)}
		</div>
	);
}
