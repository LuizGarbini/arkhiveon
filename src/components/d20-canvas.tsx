/**
 * D20Canvas — Interactive 3D Polyhedral Die
 * Supports auto-rotation, hover parallax, click-and-drag rotation with inertia,
 * and click-to-roll with 3D numbers engraved on each icosahedron face and
 * quaternion snap so the rolled face lands facing the camera.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface D20CanvasProps {
	className?: string;
}

const FACE_NUMBERS = [
	20, 1, 19, 2, 18, 3, 17, 4, 16, 5, 15, 6, 14, 7, 13, 8, 12, 9, 11, 10,
];

function createD20Material() {
	return new THREE.MeshPhysicalMaterial({
		color: new THREE.Color("#18122c"),
		metalness: 0.88,
		roughness: 0.24,
		clearcoat: 1.0,
		clearcoatRoughness: 0.1,
		reflectivity: 1.0,
		transmission: 0.08,
		thickness: 0.4,
		ior: 1.6,
		envMapIntensity: 1.6,
		flatShading: true,
	});
}

function createWireframeMaterial() {
	return new THREE.MeshBasicMaterial({
		color: new THREE.Color("#b258ff"),
		wireframe: true,
		transparent: true,
		opacity: 0.22,
	});
}

function createFaceNumberTexture(num: number): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext("2d");

	if (ctx) {
		ctx.clearRect(0, 0, 256, 256);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		const isCrit = num === 20;
		const isFail = num === 1;

		ctx.shadowColor = isCrit
			? "rgba(250, 204, 21, 0.85)"
			: isFail
				? "rgba(244, 63, 94, 0.85)"
				: "rgba(192, 132, 252, 0.7)";
		ctx.shadowBlur = 14;

		ctx.font = "900 96px 'Cinzel', Georgia, serif";
		ctx.fillStyle = isCrit ? "#fde047" : isFail ? "#fb7185" : "#e9d5ff";
		ctx.fillText(String(num), 128, 136);

		// Sublinhado tradicional de dados em 6 e 9
		if (num === 6 || num === 9) {
			ctx.fillRect(104, 182, 48, 6);
		}
	}

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
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
		const ambient = new THREE.AmbientLight(0xffffff, 0.45);
		scene.add(ambient);

		const key = new THREE.DirectionalLight(0xffffff, 2.6);
		key.position.set(4, 5, 6);
		scene.add(key);

		const fill = new THREE.DirectionalLight(0x7e4aff, 1.9);
		fill.position.set(-4, -2, 2);
		scene.add(fill);

		const back = new THREE.DirectionalLight(0xa855f7, 1.3);
		back.position.set(0, 3, -4);
		scene.add(back);

		const rim = new THREE.PointLight(0xff6bff, 2.0, 15);
		rim.position.set(0, -3, -2);
		scene.add(rim);

		// ── Pivot Group (Hover Parallax) & Die Group ─────────────────────────
		const pivot = new THREE.Group();
		scene.add(pivot);

		const dieGroup = new THREE.Group();
		pivot.add(dieGroup);

		// ── Mesh, Wireframe & Engraved Face Numbers ───────────────────────────
		const geo = new THREE.IcosahedronGeometry(1, 0);
		const mat = createD20Material();
		const mesh = new THREE.Mesh(geo, mat);
		dieGroup.add(mesh);

		const wireMat = createWireframeMaterial();
		const wire = new THREE.Mesh(geo.clone(), wireMat);
		wire.scale.setScalar(1.003);
		dieGroup.add(wire);

		// Compute each triangular face center + normal and place a number plane on it
		const posAttr = geo.attributes.position;
		const faceNormals: THREE.Vector3[] = [];
		const faceUpVectors: THREE.Vector3[] = [];
		const labelTextures: THREE.CanvasTexture[] = [];
		const labelMaterials: THREE.MeshBasicMaterial[] = [];
		const labelGeometries: THREE.PlaneGeometry[] = [];

		const vA = new THREE.Vector3();
		const vB = new THREE.Vector3();
		const vC = new THREE.Vector3();

		for (let f = 0; f < 20; f++) {
			const i = f * 3;
			vA.fromBufferAttribute(posAttr, i);
			vB.fromBufferAttribute(posAttr, i + 1);
			vC.fromBufferAttribute(posAttr, i + 2);

			const center = new THREE.Vector3()
				.add(vA)
				.add(vB)
				.add(vC)
				.divideScalar(3);
			const normal = center.clone().normalize();
			faceNormals.push(normal);

			// Up vector pointing towards the top vertex of the triangle
			const upVec = new THREE.Vector3().subVectors(vA, center);
			upVec.addScaledVector(normal, -upVec.dot(normal)).normalize();
			faceUpVectors.push(upVec);

			const rightVec = new THREE.Vector3()
				.crossVectors(upVec, normal)
				.normalize();
			const basis = new THREE.Matrix4().makeBasis(rightVec, upVec, normal);

			const num = FACE_NUMBERS[f];
			const tex = createFaceNumberTexture(num);
			labelTextures.push(tex);

			const labelMat = new THREE.MeshBasicMaterial({
				map: tex,
				transparent: true,
				depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: -1,
			});
			labelMaterials.push(labelMat);

			const labelGeo = new THREE.PlaneGeometry(0.52, 0.52);
			labelGeometries.push(labelGeo);

			const labelMesh = new THREE.Mesh(labelGeo, labelMat);
			labelMesh.position.copy(center).multiplyScalar(1.006);
			labelMesh.quaternion.setFromRotationMatrix(basis);
			dieGroup.add(labelMesh);
		}

		// Orient initial face 20 roughly towards the viewer
		dieGroup.rotation.set(0.35, -0.45, 0.1);

		const innerGeo = new THREE.SphereGeometry(0.78, 32, 32);
		const innerMat = new THREE.MeshBasicMaterial({
			color: new THREE.Color("#9d6eff"),
			transparent: true,
			opacity: 0.06,
		});
		const innerGlow = new THREE.Mesh(innerGeo, innerMat);
		pivot.add(innerGlow);

		// ── Particles ─────────────────────────────────────────────────────────
		const particleCount = 90;
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

		// ── Interaction & Roll Physics State ──────────────────────────────────
		let isDragging = false;
		let previousPointerPosition = { x: 0, y: 0 };
		let dragVelocity = { x: 0, y: 0 };
		let dragStartPos = { x: 0, y: 0 };
		let dragStartTime = 0;

		const hoverParallax = { x: 0, y: 0 };
		const targetHoverParallax = { x: 0, y: 0 };

		let isRolling = false;
		let rollStartTime = 0;
		const rollDuration = 1250; // ms
		let rollVelX = 0;
		let rollVelY = 0;
		let rollVelZ = 0;
		const targetQuat = new THREE.Quaternion();
		let pendingFaceNumber = 20;
		let rollTimeoutId: number | null = null;
		let recoilScale = 1;

		const computeTargetQuatForFace = (faceIdx: number) => {
			const normal = faceNormals[faceIdx];
			const upVec = faceUpVectors[faceIdx];
			const rightVec = new THREE.Vector3()
				.crossVectors(upVec, normal)
				.normalize();
			const faceMatrix = new THREE.Matrix4().makeBasis(rightVec, upVec, normal);
			const faceQuat = new THREE.Quaternion().setFromRotationMatrix(faceMatrix);
			// Rotate the die so that this face's local frame aligns with camera (+Z, +Y up)
			return faceQuat.invert();
		};

		const triggerRoll = () => {
			if (isRolling) return;
			isRolling = true;
			rollStartTime = performance.now();

			const chosenFaceIndex = Math.floor(Math.random() * 20);
			pendingFaceNumber = FACE_NUMBERS[chosenFaceIndex];
			targetQuat.copy(computeTargetQuatForFace(chosenFaceIndex));

			// Energetic multi-axis tumble impulse
			const dirX = Math.random() > 0.5 ? 1 : -1;
			const dirY = Math.random() > 0.5 ? 1 : -1;
			rollVelX = dirX * (0.28 + Math.random() * 0.14);
			rollVelY = dirY * (0.32 + Math.random() * 0.14);
			rollVelZ = (Math.random() - 0.5) * 0.22;
			recoilScale = 1.12;

			setRolling(true);

			if (rollTimeoutId !== null) {
				window.clearTimeout(rollTimeoutId);
			}
			rollTimeoutId = window.setTimeout(() => {
				setLastFace(pendingFaceNumber);
				setRolling(false);
				isRolling = false;
			}, rollDuration);
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
				dieGroup.rotation.y += deltaMove.x * 0.008;
				dieGroup.rotation.x += deltaMove.y * 0.008;
				dragVelocity.x = deltaMove.x * 0.008;
				dragVelocity.y = deltaMove.y * 0.008;
				previousPointerPosition = { x: e.clientX, y: e.clientY };
			} else {
				targetHoverParallax.x = nx * 0.24;
				targetHoverParallax.y = -ny * 0.18;
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
			if (dragDistance < 12 && dragDuration < 350) {
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

			if (!isVisible) return;

			const t = clock.getElapsedTime();

			if (isRolling) {
				const elapsed = performance.now() - rollStartTime;
				const progress = Math.min(1, elapsed / rollDuration);

				// Fast tumble during first 65%, then smooth magnetic lock onto target face
				const spinFactor = Math.max(0, 1 - progress * 1.25);
				dieGroup.rotation.x += rollVelX * spinFactor;
				dieGroup.rotation.y += rollVelY * spinFactor;
				dieGroup.rotation.z += rollVelZ * spinFactor;

				if (progress > 0.35) {
					const lockStrength = Math.min(1, ((progress - 0.35) / 0.65) * 0.24);
					dieGroup.quaternion.slerp(targetQuat, lockStrength);
				}

				recoilScale += (1 - recoilScale) * 0.12;
				dieGroup.scale.setScalar(recoilScale);
			} else if (!isDragging) {
				recoilScale += (1 - recoilScale) * 0.15;
				dieGroup.scale.setScalar(recoilScale);

				dieGroup.rotation.y += dragVelocity.x;
				dieGroup.rotation.x += dragVelocity.y;
				dragVelocity.x *= 0.94;
				dragVelocity.y *= 0.94;

				// Gentle idle rotation only when no face has been rolled yet
				if (
					Math.abs(dragVelocity.x) < 0.001 &&
					Math.abs(dragVelocity.y) < 0.001
				) {
					dieGroup.rotation.y += 0.0025;
					dieGroup.rotation.x += Math.sin(t * 0.4) * 0.0008;
				}
			}

			// Hover parallax on outer pivot
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
			if (rollTimeoutId !== null) {
				window.clearTimeout(rollTimeoutId);
			}
			cancelAnimationFrame(frameId);
			observer.disconnect();
			window.removeEventListener("resize", onResize);
			mount.removeEventListener("pointerdown", onPointerDown);
			mount.removeEventListener("pointerleave", onPointerLeave);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);

			geo.dispose();
			innerGeo.dispose();
			particleGeo.dispose();
			wire.geometry.dispose();
			for (const g of labelGeometries) g.dispose();
			for (const m of labelMaterials) m.dispose();
			for (const tx of labelTextures) tx.dispose();

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
			className={`relative bg-transparent transition-all duration-700 ease-out ${
				isReady ? "opacity-100 scale-100" : "opacity-0 scale-[0.92]"
			} ${className ?? ""}`}
		>
			<div
				ref={mountRef}
				className="h-full w-full bg-transparent cursor-grab active:cursor-grabbing touch-pan-y select-none"
				title="Arraste para girar · clique para rolar o d20"
			/>

			{/* Discrete result pill at bottom so it doesn't cover the 3D engraved face */}
			<div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
				{lastFace !== null ? (
					<div
						className={`inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-card/85 px-4 py-1.5 backdrop-blur-md shadow-lg transition-all duration-300 ${
							rolling
								? "opacity-0 translate-y-2 scale-95"
								: "opacity-100 translate-y-0 scale-100"
						}`}
					>
						<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							Resultado
						</span>
						<span
							className={`font-display text-base font-black tabular-nums ${
								lastFace === 20
									? "text-amber-300"
									: lastFace === 1
										? "text-rose-400"
										: "text-foreground"
							}`}
						>
							{lastFace}
						</span>
						{(lastFace === 20 || lastFace === 1) && (
							<span
								className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
									lastFace === 20 ? "text-amber-300" : "text-rose-400"
								}`}
							>
								{lastFace === 20 ? "· Sucesso Crítico" : "· Falha Crítica"}
							</span>
						)}
					</div>
				) : (
					<span className="rounded-full border border-border/50 bg-card/50 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
						{rolling
							? "Rolando d20..."
							: "Clique para rolar · arraste para girar"}
					</span>
				)}
			</div>
		</div>
	);
}
