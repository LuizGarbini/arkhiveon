import { useEffect, useState, useRef } from "react";
import { Dices } from "lucide-react";
import * as THREE from "three";

interface DiceRollOverlayProps {
	open: boolean;
	attributeLabel: string;
	diceType: "d20" | "d100" | "d10" | "d6";
	onComplete: (value: number) => void;
	onClose: () => void;
}

// ============================================================
// Constantes de Timing (milissegundos)
// ============================================================
const ROLL_DURATION = 4200;       // Duração total da rolagem
const RESULT_HOLD = 2200;         // Tempo mostrando resultado antes de fechar
const RESULT_HOLD_CRIT = 3000;    // Tempo extra para críticos (Nat 20 / Nat 1)
const PARTICLE_COUNT = 40;        // Partículas na explosão do resultado

// ============================================================
// Helpers de Canvas / Textura
// ============================================================
function drawNumberOnCanvas(canvas: HTMLCanvasElement, text: string) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.clearRect(0, 0, 256, 256);

	// Reduz o tamanho da fonte para números com 2 dígitos (dezenas do D100) para evitar corte nas bordas
	const fontSize = text.length > 1 ? 78 : 96;

	ctx.font = `900 ${fontSize}px 'Outfit', 'Inter', sans-serif`;
	ctx.fillStyle = "#ffffff";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// Sombra forte para contraste
	ctx.shadowColor = "rgba(0, 0, 0, 1)";
	ctx.shadowBlur = 16;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 3;
	ctx.fillText(text, 128, 128);

	// Segunda passada para brilho extra
	ctx.shadowBlur = 0;
	ctx.globalAlpha = 0.6;
	ctx.fillText(text, 128, 128);
	ctx.globalAlpha = 1.0;
}

function createStaticTexture(text: string): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = 256;
	canvas.height = 256;
	drawNumberOnCanvas(canvas, text);
	const tex = new THREE.CanvasTexture(canvas);
	tex.minFilter = THREE.LinearFilter;
	return tex;
}

// ============================================================
// Helpers de geração de listas de números
// ============================================================

/** Retorna [1..20] com targetVal trocado para índice 0 */
function getD20NumbersList(targetVal: number) {
	const list = Array.from({ length: 20 }, (_, i) => i + 1);
	const idx = list.indexOf(targetVal);
	if (idx > 0) [list[0], list[idx]] = [list[idx], list[0]];
	return list;
}

/** Retorna [0,10,20..90] com targetTens trocado para índice 0 */
function getTensList(targetTens: number) {
	const list = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
	const idx = list.indexOf(targetTens);
	if (idx > 0) [list[0], list[idx]] = [list[idx], list[0]];
	return list;
}

/** Retorna [0..9] com targetUnits trocado para índice 0 */
function getUnitsList(targetUnits: number) {
	const list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	const idx = list.indexOf(targetUnits);
	if (idx > 0) [list[0], list[idx]] = [list[idx], list[0]];
	return list;
}

/** Calcula centro e normal de uma face triangular a partir dos vértices */
function computeFaceGeometry(pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, faceIndex: number) {
	const i = faceIndex * 3;
	const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
	const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
	const c = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));

	const center = a.clone().add(b).add(c).divideScalar(3);
	const normal = new THREE.Vector3().crossVectors(
		c.clone().sub(b),
		a.clone().sub(b),
	).normalize();

	return { center, normal };
}

/** Retorna os dados geométricos base de um D10 perfeito (Trapezoedro Pentagonal) */
function createD10GeometryData() {
	const R = 1.35; // Raio
	const H = 1.15; // Altura
	const cos36 = Math.cos(Math.PI / 5);
	const h = H * (1 - cos36) / (1 + cos36); // Altura exata para as faces (kites) serem perfeitamente planas

	const equator: THREE.Vector3[] = [];
	for (let i = 0; i < 10; i++) {
		const angle = i * Math.PI / 5;
		const y = (i % 2 === 0) ? -h : h;
		equator.push(new THREE.Vector3(R * Math.cos(angle), y, R * Math.sin(angle)));
	}
	const top = new THREE.Vector3(0, H, 0);
	const bot = new THREE.Vector3(0, -H, 0);

	return { R, H, h, equator, top, bot };
}

/** Gera a geometria real de um D10 (Trapezoedro Pentagonal) como uma única malha sólida */
function createD10Geometry() {
	const { equator, top, bot } = createD10GeometryData();
	const vertices = [];
	const indices = [];

	for (let i = 0; i < 10; i++) {
		vertices.push(equator[i].x, equator[i].y, equator[i].z);
	}
	vertices.push(top.x, top.y, top.z); // idx 10
	vertices.push(bot.x, bot.y, bot.z); // idx 11

	const topIdx = 10;
	const botIdx = 11;

	// Faces Superiores (5 kites, 10 triângulos)
	for (let i = 0; i < 5; i++) {
		const eMid = i * 2;
		const eLeft = (i * 2 + 9) % 10;
		const eRight = (i * 2 + 1) % 10;
		indices.push(topIdx, eMid, eLeft);
		indices.push(topIdx, eRight, eMid);
	}

	// Faces Inferiores (5 kites, 10 triângulos)
	for (let i = 0; i < 5; i++) {
		const eMid = (i * 2 + 1) % 10;
		const eLeft = (i * 2) % 10;
		const eRight = (i * 2 + 2) % 10;
		indices.push(botIdx, eLeft, eMid);
		indices.push(botIdx, eMid, eRight);
	}

	const geom = new THREE.BufferGeometry();
	geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
	geom.setIndex(indices);
	geom.computeVertexNormals();
	return geom;
}

/** Calcula o centro e a normal corretos para as texturas na face (kite) correspondente do D10 */
function getD10FaceData(f: number, isTop: boolean) {
	const { equator, top, bot } = createD10GeometryData();
	let eLeft, eMid, eRight, tip;

	if (isTop) {
		eMid = equator[f * 2];
		eLeft = equator[(f * 2 + 9) % 10];
		eRight = equator[(f * 2 + 1) % 10];
		tip = top;
	} else {
		eMid = equator[(f * 2 + 1) % 10];
		eLeft = equator[(f * 2) % 10];
		eRight = equator[(f * 2 + 2) % 10];
		tip = bot;
	}

	// Centro da face kite (média exata dos 4 vértices coplanares)
	const center = new THREE.Vector3().add(tip).add(eLeft).add(eMid).add(eRight).multiplyScalar(0.25);

	// Normal (produto vetorial das diagonais do kite aponta sempre para fora, com ajuste de sinal)
	const diag1 = new THREE.Vector3().subVectors(eRight, eLeft);
	const diag2 = new THREE.Vector3().subVectors(eMid, tip);
	const normal = new THREE.Vector3().crossVectors(diag1, diag2).normalize();
	
	if (isTop && normal.y < 0) normal.negate();
	if (!isTop && normal.y > 0) normal.negate();

	return { center, normal, tip };
}

// ============================================================
// Componente Principal
// ============================================================
export function DiceRollOverlay({
	open,
	attributeLabel,
	diceType,
	onComplete,
	onClose,
}: DiceRollOverlayProps) {
	const [displayVal, setDisplayVal] = useState(0);
	const [phase, setPhase] = useState<"rolling" | "result">("rolling");
	const [opacity, setOpacity] = useState(0);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!open) {
			setOpacity(0);
			return;
		}

		// Reset
		setOpacity(1);
		setPhase("rolling");
		setDisplayVal(0);

		if (!canvasRef.current) return;

		const finalVal =
			diceType === "d20"
				? Math.floor(Math.random() * 20) + 1
				: diceType === "d10"
					? Math.floor(Math.random() * 10) + 1
					: diceType === "d6"
						? Math.floor(Math.random() * 6) + 1
						: Math.floor(Math.random() * 100) + 1;

		// ========================================================
		// THREE.JS — Cena, Câmera, Renderer
		// ========================================================
		const W = 320, H = 320;
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
		camera.position.z = 5.5;

		const renderer = new THREE.WebGLRenderer({
			canvas: canvasRef.current,
			antialias: true,
			alpha: true,
		});
		renderer.setSize(W, H);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.2;

		// ========================================================
		// Iluminação premium
		// ========================================================
		scene.add(new THREE.AmbientLight(0xffffff, 0.4));

		const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
		keyLight.position.set(4, 6, 5);
		scene.add(keyLight);

		const fillLight = new THREE.DirectionalLight(0x8b5cf6, 1.5);
		fillLight.position.set(-3, -2, 4);
		scene.add(fillLight);

		const rimLight = new THREE.PointLight(0xa855f7, 8, 12);
		rimLight.position.set(0, 0, -3);
		scene.add(rimLight);

		const topGlow = new THREE.PointLight(0x6d28d9, 4, 8);
		topGlow.position.set(0, 4, 2);
		scene.add(topGlow);

		// ========================================================
		// Chão semi-transparente para profundidade
		// ========================================================
		const groundGeo = new THREE.PlaneGeometry(8, 8);
		const groundMat = new THREE.MeshStandardMaterial({
			color: 0x0a0a14,
			transparent: true,
			opacity: 0.35,
			roughness: 0.9,
			metalness: 0.0,
		});
		const ground = new THREE.Mesh(groundGeo, groundMat);
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = -2.6;
		scene.add(ground);

		// ========================================================
		// Grupo do dado
		// ========================================================
		const diceGroup = new THREE.Group();
		scene.add(diceGroup);

		// Material premium com clearcoat
		const faceMat = new THREE.MeshPhysicalMaterial({
			color: 0x1a1028,
			roughness: 0.15,
			metalness: 0.3,
			clearcoat: 0.8,
			clearcoatRoughness: 0.1,
			flatShading: true,
		});

		const edgeMat = new THREE.LineBasicMaterial({
			color: 0xa855f7,
			linewidth: 2,
		});

		// ========================================================
		// Construção dos dados 3D — TODOS os números são ESTÁTICOS
		// O dado já nasce completo como um dado real.
		// Face 0 sempre contém o valor sorteado (finalVal).
		// ========================================================
		const diceMeshes: THREE.Object3D[] = [];
		const targetQuats: THREE.Quaternion[] = [];

		if (diceType === "d20") {
			const geo = new THREE.IcosahedronGeometry(1.5, 0);
			const mesh = new THREE.Mesh(geo, faceMat);
			mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));

			const pos = geo.attributes.position;
			const faceCount = pos.count / 3;
			const numbers = getD20NumbersList(finalVal); // [finalVal, ...outros]

			let face0Normal: THREE.Vector3 | null = null;

			for (let f = 0; f < faceCount; f++) {
				const { center, normal } = computeFaceGeometry(pos, f);
				if (f === 0) face0Normal = normal.clone();

				const planeGeo = new THREE.PlaneGeometry(0.72, 0.72);
				const mat = new THREE.MeshBasicMaterial({
					map: createStaticTexture(String(numbers[f])),
					transparent: true,
					depthWrite: false,
					side: THREE.DoubleSide,
				});

				const plane = new THREE.Mesh(planeGeo, mat);
				plane.position.copy(center.clone().multiplyScalar(1.015));
				plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
				mesh.add(plane);
			}

			diceGroup.add(mesh);
			diceMeshes.push(mesh);

			const tq = new THREE.Quaternion();
			tq.setFromUnitVectors(face0Normal!, new THREE.Vector3(0, 0, 1));
			targetQuats.push(tq);
		} else if (diceType === "d100" || diceType === "d10") {
			// D100 (dois D10s) ou D10 Simples
			const isD100 = diceType === "d100";
			const tensList = isD100 ? getTensList(Math.floor(finalVal / 10) * 10) : [];
			const unitsList = getUnitsList(finalVal % 10);

			const createD10 = (isLeft: boolean) => {
				const geom = createD10Geometry();

				const grp = new THREE.Group();
				const mesh = new THREE.Mesh(geom, faceMat);
				mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeMat));
				grp.add(mesh);

				const list = isLeft ? tensList : unitsList;
				let face0Normal: THREE.Vector3 | null = null;

				// 5 faces superiores
				for (let f = 0; f < 5; f++) {
					const { center, normal, tip } = getD10FaceData(f, true);
					if (f === 0) face0Normal = normal.clone();

					const v = list[f];
					const numStr = isLeft ? String(v).padStart(2, "0") : String(v);

					const mat = new THREE.MeshBasicMaterial({
						map: createStaticTexture(numStr),
						transparent: true,
						depthWrite: false,
						side: THREE.DoubleSide,
					});

					const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), mat);
					// Desloca sutilmente para fora da face para evitar z-fighting
					plane.position.copy(center).add(normal.clone().multiplyScalar(0.005));

					const upVector = new THREE.Vector3().subVectors(tip, plane.position).normalize();
					const rightVector = new THREE.Vector3().crossVectors(upVector, normal).normalize();
					const orthoUp = new THREE.Vector3().crossVectors(normal, rightVector).normalize();

					const matrix = new THREE.Matrix4().makeBasis(rightVector, orthoUp, normal);
					plane.quaternion.setFromRotationMatrix(matrix);

					mesh.add(plane);
				}

				// 5 faces inferiores
				for (let f = 0; f < 5; f++) {
					const { center, normal, tip } = getD10FaceData(f, false);
					const v = list[f + 5];
					const numStr = isLeft ? String(v).padStart(2, "0") : String(v);

					const mat = new THREE.MeshBasicMaterial({
						map: createStaticTexture(numStr),
						transparent: true,
						depthWrite: false,
						side: THREE.DoubleSide,
					});

					const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), mat);
					// Desloca sutilmente para fora da face para evitar z-fighting
					plane.position.copy(center).add(normal.clone().multiplyScalar(0.005));

					const upVector = new THREE.Vector3().subVectors(tip, plane.position).normalize();
					const rightVector = new THREE.Vector3().crossVectors(upVector, normal).normalize();
					const orthoUp = new THREE.Vector3().crossVectors(normal, rightVector).normalize();

					const matrix = new THREE.Matrix4().makeBasis(rightVector, orthoUp, normal);
					plane.quaternion.setFromRotationMatrix(matrix);

					mesh.add(plane);
				}

				// Target quaternion para alinhar face 0 do topo à câmera
				const tq = new THREE.Quaternion();
				tq.setFromUnitVectors(face0Normal!, new THREE.Vector3(0, 0, 1));
				return { grp, tq };
			};

			const { grp: d1, tq: tq1 } = createD10(false); // Die das unidades (ou único)
			
			if (isD100) {
				const { grp: d2, tq: tq2 } = createD10(true); // Die das dezenas
				d2.position.x = -1.0;
				d1.position.x = 1.0;
				d1.position.y = -0.3;

				diceGroup.add(d2);
				diceGroup.add(d1);
				diceMeshes.push(d2);
				diceMeshes.push(d1);
				targetQuats.push(tq2);
				targetQuats.push(tq1);
			} else {
				// D10 simples centralizado
				diceGroup.add(d1);
				diceMeshes.push(d1);
				targetQuats.push(tq1);
			}
		} else if (diceType === "d6") {
			// D6 (Cubo)
			const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
			const mesh = new THREE.Mesh(geo, faceMat);
			mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));

			const facesData = [
				{ num: 1, pos: [0, 0, 0.81], rot: [0, 0, 0] },                // Frente (Face 0)
				{ num: 6, pos: [0, 0, -0.81], rot: [Math.PI, 0, 0] },         // Costas
				{ num: 2, pos: [0.81, 0, 0], rot: [0, Math.PI / 2, 0] },      // Direita
				{ num: 5, pos: [-0.81, 0, 0], rot: [0, -Math.PI / 2, 0] },    // Esquerda
				{ num: 3, pos: [0, 0.81, 0], rot: [-Math.PI / 2, 0, 0] },     // Topo
				{ num: 4, pos: [0, -0.81, 0], rot: [Math.PI / 2, 0, 0] },     // Fundo
			];

			const list = [1, 2, 3, 4, 5, 6];
			if (finalVal !== 1) {
				const idx = list.indexOf(finalVal);
				[list[0], list[idx]] = [list[idx], list[0]];
			}

			for (let i = 0; i < 6; i++) {
				const fData = facesData[i];
				const v = list[i];
				const planeGeo = new THREE.PlaneGeometry(0.9, 0.9);
				const mat = new THREE.MeshBasicMaterial({
					map: createStaticTexture(String(v)),
					transparent: true,
					depthWrite: false,
					side: THREE.DoubleSide,
				});
				const plane = new THREE.Mesh(planeGeo, mat);
				plane.position.set(fData.pos[0], fData.pos[1], fData.pos[2]);
				plane.rotation.set(fData.rot[0], fData.rot[1], fData.rot[2]);
				mesh.add(plane);
			}

			diceGroup.add(mesh);
			diceMeshes.push(mesh);

			const tq = new THREE.Quaternion();
			tq.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
			targetQuats.push(tq);
		}

		// ========================================================
		// Estado da Simulação Física do Rolamento Caótico
		// ========================================================
		const currentQuats: THREE.Quaternion[] = [];
		const angularVelocities: THREE.Vector3[] = [];

		for (let i = 0; i < diceMeshes.length; i++) {
			// Começa com orientação física aleatória
			const q = new THREE.Quaternion().setFromEuler(
				new THREE.Euler(
					Math.random() * Math.PI * 2,
					Math.random() * Math.PI * 2,
					Math.random() * Math.PI * 2
				)
			);
			currentQuats.push(q);
			diceMeshes[i].quaternion.copy(q);

			// Velocidade angular inicial caótica alta
			const vel = new THREE.Vector3(
				(Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 15),
				(Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 15),
				(Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 10)
			);
			angularVelocities.push(vel);
		}

		// ========================================================
		// Loop de Animação
		// ========================================================
		let animId: number;
		let lastTime = performance.now();
		const animStartTime = lastTime;
		let resultShown = false;
		let closeTimeout: ReturnType<typeof setTimeout>;

		const tick = () => {
			const now = performance.now();
			const elapsed = now - animStartTime;
			const dt = Math.min((now - lastTime) / 1000, 0.05); // cap a 20 FPS para estabilidade
			lastTime = now;

			if (elapsed < ROLL_DURATION) {
				const progress = elapsed / ROLL_DURATION;

				// 1. Simulação física livre com fricção
				for (let i = 0; i < diceMeshes.length; i++) {
					const vel = angularVelocities[i];
					const q = currentQuats[i];

					// Fricção natural (decaimento exponencial)
					const frictionDecay = Math.max(0.1, 1 - 0.75 * dt);
					vel.multiplyScalar(frictionDecay);

					// Aplica delta rotação do frame ao quaternion físico
					const deltaRot = new THREE.Quaternion().setFromEuler(
						new THREE.Euler(vel.x * dt, vel.y * dt, vel.z * dt)
					);
					q.multiplyQuaternions(deltaRot, q);
				}

				// 2. Interpolação/Blend indetectável para a rotação de pouso (apenas nos últimos 35% do tempo)
				for (let i = 0; i < diceMeshes.length; i++) {
					const mesh = diceMeshes[i];
					const physQ = currentQuats[i];
					const targetQ = targetQuats[i];

					if (progress < 0.65) {
						// Rolagem 100% física e caótica
						mesh.quaternion.copy(physQ);
					} else {
						// Blend suave usando ease-in-out para pousar na face correta
						const blendProgress = (progress - 0.65) / 0.35;
						const blendFactor = Math.pow(blendProgress, 2.5);
						
						const blendedQuat = physQ.clone().slerp(targetQ, blendFactor);
						mesh.quaternion.copy(blendedQuat);
					}
				}

				diceGroup.position.set(0, 0, 0);

				// Mostra resultado quando a rolagem atinge 88% (pousando e quase parado)
				if (!resultShown && progress >= 0.88) {
					resultShown = true;
					setPhase("result");
					setDisplayVal(finalVal);

					// Explosão de partículas
					const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
					const particleVelocities: THREE.Vector3[] = [];
					for (let p = 0; p < PARTICLE_COUNT; p++) {
						particlePositions[p * 3] = 0;
						particlePositions[p * 3 + 1] = 0;
						particlePositions[p * 3 + 2] = 0;
						const theta = Math.random() * Math.PI * 2;
						const phi = Math.random() * Math.PI - Math.PI / 2;
						const speed = 2 + Math.random() * 4;
						particleVelocities.push(
							new THREE.Vector3(
								Math.cos(theta) * Math.cos(phi) * speed,
								Math.sin(phi) * speed * 0.8,
								Math.sin(theta) * Math.cos(phi) * speed,
							),
						);
					}

					const particleGeo = new THREE.BufferGeometry();
					particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

					const isCrit20 = diceType === "d20" && finalVal === 20;
					const isCrit1 = diceType === "d20" && finalVal === 1;
					const particleColor = isCrit20 ? 0xfbbf24 : isCrit1 ? 0xef4444 : 0xa855f7;

					const particleMat = new THREE.PointsMaterial({
						color: particleColor,
						size: 0.12,
						transparent: true,
						opacity: 1.0,
						blending: THREE.AdditiveBlending,
						depthWrite: false,
					});

					const particles = new THREE.Points(particleGeo, particleMat);
					scene.add(particles);

					// Animar partículas em sub-loop
					const particleStart = performance.now();
					const animateParticles = () => {
						const pElapsed = (performance.now() - particleStart) / 1000;
						if (pElapsed > 1.5) {
							scene.remove(particles);
							particleGeo.dispose();
							particleMat.dispose();
							return;
						}

						const posArr = particleGeo.attributes.position.array as Float32Array;
						for (let p = 0; p < PARTICLE_COUNT; p++) {
							const vel = particleVelocities[p];
							posArr[p * 3] += vel.x * 0.016;
							posArr[p * 3 + 1] += vel.y * 0.016;
							posArr[p * 3 + 2] += vel.z * 0.016;
							vel.y -= 3.5 * 0.016;
						}
						particleGeo.attributes.position.needsUpdate = true;
						particleMat.opacity = Math.max(0, 1 - pElapsed / 1.5);

						requestAnimationFrame(animateParticles);
					};
					requestAnimationFrame(animateParticles);

					const holdTime = (isCrit20 || isCrit1) ? RESULT_HOLD_CRIT : RESULT_HOLD;

					closeTimeout = setTimeout(() => {
						setOpacity(0);
						setTimeout(() => {
							onComplete(finalVal);
							onClose();
						}, 200);
					}, holdTime);
				}
			} else {
				// ——— Parado na posição final alinhada ———
				for (let i = 0; i < diceMeshes.length; i++) {
					diceMeshes[i].quaternion.copy(targetQuats[i]);
				}
				diceGroup.position.set(0, 0, 0);
			}

			renderer.render(scene, camera);
			animId = requestAnimationFrame(tick);
		};

		animId = requestAnimationFrame(tick);

		// ========================================================
		// Cleanup
		// ========================================================
		return () => {
			clearTimeout(closeTimeout);
			cancelAnimationFrame(animId);
			renderer.dispose();
			faceMat.dispose();
			edgeMat.dispose();
			groundMat.dispose();
			groundGeo.dispose();
		};
	}, [open, diceType, onComplete, onClose]);

	if (!open) return null;

	return (
		<div
			style={{ opacity, transition: "opacity 200ms ease-out" }}
			className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/92 backdrop-blur-md"
		>
			{/* Header */}
			<div className="text-center mb-6 animate-fade-in space-y-2">
				<span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
					Rolando Atributo
				</span>
				<h2 className="font-display text-2xl font-black uppercase text-foreground tracking-wider">
					{attributeLabel}
				</h2>
			</div>

			{/* Canvas 3D */}
			<div className="relative flex items-center justify-center h-80 w-80">
				<canvas
					ref={canvasRef}
					className="absolute inset-0 h-full w-full pointer-events-none"
				/>
			</div>

			{/* Status / Resultado */}
			<div className="mt-6 text-center h-12 flex items-center justify-center">
				{phase !== "result" ? (
					<div className="flex items-center gap-2 text-muted-foreground text-sm tracking-wide">
						<Dices className="h-4 w-4 animate-spin text-primary" />
						Aguardando destino...
					</div>
				) : diceType === "d20" && displayVal === 20 ? (
					<div className="animate-bounce text-amber-400 font-extrabold text-xl tracking-wider flex items-center gap-2 bg-amber-500/15 px-6 py-3 rounded-full border border-amber-500/30 shadow-[0_0_25px_rgba(251,191,36,0.3)]">
						🎉 ACERTO CRÍTICO! 20!
					</div>
				) : diceType === "d20" && displayVal === 1 ? (
					<div className="animate-shake text-red-400 font-extrabold text-xl tracking-wider flex items-center gap-2 bg-red-500/15 px-6 py-3 rounded-full border border-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
						💀 Falha Crítica! 1
					</div>
				) : (
					<div className="animate-bounce text-emerald-400 font-extrabold text-lg tracking-wider flex items-center gap-1.5 bg-emerald-500/10 px-5 py-2.5 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
						Resultado: {displayVal}!
					</div>
				)}
			</div>
		</div>
	);
}
