import * as dagre from "@dagrejs/dagre";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Background,
	type Connection,
	Controls,
	type Edge,
	Handle,
	MarkerType,
	MiniMap,
	type Node,
	type NodeProps,
	Panel,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
	EyeOff,
	GitFork,
	MousePointer2,
	PencilLine,
	Trash2,
	User,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
	Character,
	FamilyRelation,
	FamilyRelationKind,
} from "@/lib/store";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/family-tree")({
	component: FamilyTreePage,
});

const relationOptions: Array<{
	value: FamilyRelationKind;
	label: string;
	description: string;
}> = [
	{ value: "father", label: "Pai", description: "Relação paterna direta" },
	{ value: "mother", label: "Mãe", description: "Relação materna direta" },
	{
		value: "parent",
		label: "Responsável",
		description: "Parente parental amplo",
	},
	{ value: "guardian", label: "Guardião", description: "Tutor ou responsável" },
	{
		value: "sibling",
		label: "Irmão/Irmã",
		description: "Relação entre irmãos",
	},
	{ value: "child", label: "Filho/Filha", description: "Descendente direto" },
	{
		value: "spouse",
		label: "Cônjuge",
		description: "Casamento ou união formal",
	},
	{
		value: "partner",
		label: "Parceiro",
		description: "Laço afetivo importante",
	},
	{
		value: "relative",
		label: "Parente",
		description: "Vínculo familiar genérico",
	},
];

const parentKinds = new Set<FamilyRelationKind>([
	"father",
	"mother",
	"parent",
	"guardian",
]);
const nodeWidth = 244;
const nodeHeight = 116;

type FamilyNode = Node<FamilyNodeData, "familyCharacter">;
type FamilyEdge = Edge<FamilyEdgeData>;

interface FamilyNodeData extends Record<string, unknown> {
	character: Character;
	directRelationCount: number;
	isEditMode: boolean;
}

interface FamilyEdgeData extends Record<string, unknown> {
	ownerCharacterId: string;
	relationId: string;
	kind: FamilyRelationKind;
	note?: string;
	isSecret?: boolean;
}

interface PendingConnection {
	sourceId: string;
	targetId: string;
	kind: FamilyRelationKind;
	note: string;
	isSecret: boolean;
	error?: string;
}

interface GraphModel {
	nodes: FamilyNode[];
	edges: FamilyEdge[];
}

function FamilyTreePage() {
	const characters = useRPGStore((state) => state.characters);
	const updateCharacter = useRPGStore((state) => state.updateCharacter);
	const [isEditMode, setIsEditMode] = useState(false);

	const relationCount = characters.reduce(
		(total, character) => total + (character.familyRelations?.length ?? 0),
		0,
	);
	const graphModel = useMemo(
		() => buildFamilyGraph(characters, isEditMode),
		[characters, isEditMode],
	);

	return (
		<div className="w-full">
			<PageHeader
				title="Árvore Genealógica"
				description="Explore toda a linhagem da campanha em um canvas com zoom, arraste e edição visual de vínculos."
				Icon={GitFork}
				iconColor="text-emerald-300"
				eyebrow="Linhagens"
				count={relationCount}
			/>

			<div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-8 sm:pb-10">
				{characters.length === 0 ? (
					<EmptyState
						Icon={GitFork}
						title="Nenhum personagem para montar árvore"
						description="Crie fichas no elenco para começar a vincular laços familiares."
					/>
				) : (
					<ReactFlowProvider>
						<FamilyFlowCanvas
							characters={characters}
							graphModel={graphModel}
							isEditMode={isEditMode}
							onEditModeChange={setIsEditMode}
							onUpdateCharacter={updateCharacter}
							relationCount={relationCount}
						/>
					</ReactFlowProvider>
				)}
			</div>
		</div>
	);
}

function FamilyFlowCanvas({
	characters,
	graphModel,
	isEditMode,
	onEditModeChange,
	onUpdateCharacter,
	relationCount,
}: {
	characters: Character[];
	graphModel: GraphModel;
	isEditMode: boolean;
	onEditModeChange: (value: boolean) => void;
	onUpdateCharacter: (characterId: string, patch: Partial<Character>) => void;
	relationCount: number;
}) {
	const [nodes, setNodes, onNodesChange] = useNodesState<FamilyNode>(
		graphModel.nodes,
	);
	const [edges, setEdges, onEdgesChange] = useEdgesState<FamilyEdge>(
		graphModel.edges,
	);
	const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
		null,
	);
	const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
	const [pendingConnection, setPendingConnection] =
		useState<PendingConnection | null>(null);
	const { fitView } = useReactFlow<FamilyNode, FamilyEdge>();

	const characterById = useMemo(
		() => new Map(characters.map((character) => [character.id, character])),
		[characters],
	);
	const selectedCharacter = selectedCharacterId
		? characterById.get(selectedCharacterId)
		: undefined;
	const selectedEdge = selectedEdgeId
		? edges.find((edge) => edge.id === selectedEdgeId)
		: undefined;

	useEffect(() => {
		setNodes(graphModel.nodes);
		setEdges(graphModel.edges);
	}, [graphModel, setEdges, setNodes]);

	useEffect(() => {
		window.setTimeout(() => fitView({ duration: 260, padding: 0.18 }), 60);
	}, [fitView]);

	const onConnect = useCallback(
		(connection: Connection) => {
			if (!isEditMode || !connection.source || !connection.target) return;
			if (connection.source === connection.target) return;

			setPendingConnection({
				sourceId: connection.source,
				targetId: connection.target,
				kind: "parent",
				note: "",
				isSecret: false,
			});
			setSelectedEdgeId(null);
		},
		[isEditMode],
	);

	function savePendingConnection() {
		if (!pendingConnection) return;
		const storage = relationStorageForConnection(pendingConnection);
		const owner = characterById.get(storage.ownerCharacterId);
		if (!owner) return;

		const ownerRelations = owner.familyRelations ?? [];
		const existing = ownerRelations.some(
			(relation) =>
				relation.relatedCharacterId === storage.relatedCharacterId &&
				relation.kind === pendingConnection.kind,
		);
		if (existing) {
			setPendingConnection({
				...pendingConnection,
				error: "Esse vínculo já existe entre os personagens selecionados.",
			});
			return;
		}

		const nextRelation: FamilyRelation = {
			id: crypto.randomUUID(),
			relatedCharacterId: storage.relatedCharacterId,
			kind: pendingConnection.kind,
			note: pendingConnection.note.trim() || undefined,
			isSecret: pendingConnection.isSecret,
		};

		onUpdateCharacter(owner.id, {
			familyRelations: [...ownerRelations, nextRelation],
		});
		setPendingConnection(null);
		setSelectedCharacterId(storage.ownerCharacterId);
	}

	function removeEdge(edge: FamilyEdge) {
		if (!edge.data) return;
		const owner = characterById.get(edge.data.ownerCharacterId);
		if (!owner) return;
		const relationId = edge.data.relationId;
		onUpdateCharacter(owner.id, {
			familyRelations: (owner.familyRelations ?? []).filter(
				(relation) => relation.id !== relationId,
			),
		});
		setSelectedEdgeId(null);
	}

	function focusGraph() {
		void fitView({ duration: 320, padding: 0.18 });
	}

	const sourceCharacter = pendingConnection
		? characterById.get(pendingConnection.sourceId)
		: undefined;
	const targetCharacter = pendingConnection
		? characterById.get(pendingConnection.targetId)
		: undefined;

	const canvas = (
		<section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm shadow-black/5 sm:rounded-[1.75rem]">
			<div className="flex flex-col gap-3 border-b border-border/60 bg-card/90 p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
				<div className="min-w-0">
					<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
						Grafo da campanha
					</p>
					<h2 className="font-display mt-1 text-xl font-bold text-foreground sm:text-2xl">
						Conexões familiares
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						{characters.length} personagem(ns), {relationCount} vínculo(s)
						direto(s). Arraste o canvas, use zoom e conecte nós no modo edição.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
					<Button
						type="button"
						variant={isEditMode ? "default" : "outline"}
						onClick={() => {
							onEditModeChange(!isEditMode);
							setPendingConnection(null);
						}}
						className="min-w-0 gap-2"
					>
						<PencilLine className="h-4 w-4" />
						{isEditMode ? "Editando" : "Modo edição"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={focusGraph}
						className="min-w-0 gap-2"
					>
						<MousePointer2 className="h-4 w-4" />
						Recentralizar
					</Button>
				</div>
			</div>

			<div className="h-[min(72vh,680px)] min-h-[430px] sm:h-[640px] lg:h-[680px]">
				<ReactFlow<FamilyNode, FamilyEdge>
					nodes={nodes}
					edges={edges}
					nodeTypes={nodeTypes}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onNodeClick={(_, node) => {
						setSelectedCharacterId(node.id);
						setSelectedEdgeId(null);
					}}
					onEdgeClick={(_, edge) => {
						setSelectedEdgeId(edge.id);
						setSelectedCharacterId(null);
					}}
					onPaneClick={() => {
						setSelectedCharacterId(null);
						setSelectedEdgeId(null);
					}}
					onSelectionChange={({
						nodes: selectedNodes,
						edges: selectedEdges,
					}) => {
						setSelectedCharacterId(selectedNodes[0]?.id ?? null);
						setSelectedEdgeId(selectedEdges[0]?.id ?? null);
					}}
					nodesConnectable={isEditMode}
					nodesDraggable
					elementsSelectable
					deleteKeyCode={null}
					fitView
					fitViewOptions={{ padding: 0.18 }}
					minZoom={0.18}
					maxZoom={1.7}
					proOptions={{ hideAttribution: true }}
					className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_38%),linear-gradient(135deg,rgba(74,222,128,0.08),transparent_34%),linear-gradient(225deg,rgba(168,85,247,0.07),transparent_34%)]"
				>
					<Background color="oklch(0.55 0.03 285 / 0.35)" gap={28} size={1.1} />
					<Controls className="family-flow-controls" />
					<MiniMap
						pannable
						zoomable
						nodeColor="oklch(0.42 0.12 290)"
						maskColor="oklch(0.1 0.01 285 / 0.62)"
						className="family-flow-minimap"
					/>
					<Panel position="top-left" className="hidden sm:block">
						<div className="max-w-[320px] rounded-2xl border border-border/70 bg-card/90 px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-lg shadow-black/10 backdrop-blur-xl">
							{isEditMode
								? "Arraste de um ponto do card até outro para criar vínculo."
								: "Use o mouse ou trackpad para mover e aproximar a árvore."}
						</div>
					</Panel>
					{isEditMode && (
						<Panel position="top-right" className="family-flow-edit-panel">
							<div className="rounded-2xl border border-border/70 bg-card/90 p-3 shadow-lg shadow-black/10 backdrop-blur-xl">
								{selectedEdge ? (
									<Button
										type="button"
										variant="destructive"
										size="sm"
										className="gap-2"
										onClick={() => removeEdge(selectedEdge)}
									>
										<Trash2 className="h-3.5 w-3.5" />
										Remover vínculo selecionado
									</Button>
								) : (
									<p className="max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">
										Para remover um vínculo, clique em uma linha da árvore e use
										o botão de remoção.
									</p>
								)}
							</div>
						</Panel>
					)}
				</ReactFlow>
			</div>

			<GraphSidePanel
				character={selectedCharacter}
				edge={selectedEdge}
				edgeSource={
					selectedEdge ? characterById.get(selectedEdge.source) : undefined
				}
				edgeTarget={
					selectedEdge ? characterById.get(selectedEdge.target) : undefined
				}
				isEditMode={isEditMode}
				onRemoveEdge={selectedEdge ? () => removeEdge(selectedEdge) : undefined}
			/>

			{pendingConnection && sourceCharacter && targetCharacter && (
				<ConnectionEditor
					connection={pendingConnection}
					sourceCharacter={sourceCharacter}
					targetCharacter={targetCharacter}
					onCancel={() => setPendingConnection(null)}
					onChange={setPendingConnection}
					onSave={savePendingConnection}
				/>
			)}
		</section>
	);

	return canvas;
}

function buildFamilyGraph(
	characters: Character[],
	isEditMode: boolean,
): GraphModel {
	const characterById = new Map(
		characters.map((character) => [character.id, character]),
	);
	const nodes: FamilyNode[] = characters.map((character) => ({
		id: character.id,
		type: "familyCharacter",
		position: { x: 0, y: 0 },
		data: {
			character,
			directRelationCount: character.familyRelations?.length ?? 0,
			isEditMode,
		},
	}));
	const edges: FamilyEdge[] = [];

	for (const owner of characters) {
		for (const relation of owner.familyRelations ?? []) {
			const related = characterById.get(relation.relatedCharacterId);
			if (!related) continue;

			const visual = visualEdgeForRelation(owner.id, relation);
			edges.push({
				id: `${owner.id}:${relation.id}`,
				source: visual.source,
				target: visual.target,
				type: "smoothstep",
				label: relation.isSecret
					? `${relationLabel(relation.kind)} · segredo`
					: relationLabel(relation.kind),
				data: {
					ownerCharacterId: owner.id,
					relationId: relation.id,
					kind: relation.kind,
					note: relation.note,
					isSecret: relation.isSecret,
				},
				interactionWidth: 24,
				animated: relation.isSecret,
				deletable: false,
				focusable: true,
				markerEnd: visual.isDirectional
					? {
							type: MarkerType.ArrowClosed,
							width: 18,
							height: 18,
							color: "oklch(0.68 0.13 150)",
						}
					: undefined,
				style: {
					stroke: relation.isSecret
						? "oklch(0.76 0.14 80)"
						: visual.isDirectional
							? "oklch(0.68 0.13 150)"
							: "oklch(0.72 0.12 310)",
					strokeWidth: 2,
				},
				labelBgBorderRadius: 10,
				labelBgPadding: [8, 4],
				labelStyle: {
					fill: "oklch(0.92 0.01 285)",
					fontSize: 11,
					fontWeight: 700,
				},
				labelBgStyle: {
					fill: "oklch(0.18 0.015 285 / 0.88)",
				},
			});
		}
	}

	return layoutGraph({ nodes, edges });
}

function layoutGraph(graphModel: GraphModel): GraphModel {
	const graph = new dagre.graphlib.Graph();
	graph.setDefaultEdgeLabel(() => ({}));
	graph.setGraph({
		rankdir: "TB",
		nodesep: 90,
		ranksep: 125,
		marginx: 48,
		marginy: 48,
	});

	for (const node of graphModel.nodes) {
		graph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	}

	for (const edge of graphModel.edges) {
		graph.setEdge(edge.source, edge.target);
	}

	dagre.layout(graph);

	return {
		nodes: graphModel.nodes.map((node) => {
			const position = graph.node(node.id);
			return {
				...node,
				position: {
					x: position.x - nodeWidth / 2,
					y: position.y - nodeHeight / 2,
				},
				sourcePosition: Position.Bottom,
				targetPosition: Position.Top,
			};
		}),
		edges: graphModel.edges,
	};
}

function visualEdgeForRelation(
	ownerCharacterId: string,
	relation: FamilyRelation,
) {
	if (parentKinds.has(relation.kind)) {
		return {
			source: relation.relatedCharacterId,
			target: ownerCharacterId,
			isDirectional: true,
		};
	}

	if (relation.kind === "child") {
		return {
			source: ownerCharacterId,
			target: relation.relatedCharacterId,
			isDirectional: true,
		};
	}

	return {
		source: ownerCharacterId,
		target: relation.relatedCharacterId,
		isDirectional: false,
	};
}

function relationStorageForConnection(connection: PendingConnection) {
	if (parentKinds.has(connection.kind)) {
		return {
			ownerCharacterId: connection.targetId,
			relatedCharacterId: connection.sourceId,
		};
	}

	return {
		ownerCharacterId: connection.sourceId,
		relatedCharacterId: connection.targetId,
	};
}

function FamilyCharacterNode({ data, selected }: NodeProps<FamilyNode>) {
	const { character, directRelationCount, isEditMode } = data;

	return (
		<div
			className={`group relative w-[244px] overflow-hidden rounded-2xl border bg-card/95 p-3 shadow-lg shadow-black/10 backdrop-blur transition duration-200 ${
				selected
					? "border-primary/70 ring-4 ring-primary/15"
					: "border-border/70 hover:border-primary/40"
			}`}
		>
			<Handle
				type="target"
				position={Position.Top}
				className={`!h-3 !w-3 !border-primary !bg-primary ${
					isEditMode ? "!opacity-100" : "!opacity-0"
				}`}
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className={`!h-3 !w-3 !border-primary !bg-primary ${
					isEditMode ? "!opacity-100" : "!opacity-0"
				}`}
			/>
			<div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/20 via-primary to-primary/20" />
			<div className="flex items-start gap-3">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 text-primary">
					{character.imageUrl ? (
						<img
							src={character.imageUrl}
							alt={character.characterName}
							className="h-full w-full object-cover"
						/>
					) : (
						<User className="h-5 w-5" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<Link
						to="/sheets/$characterId"
						params={{ characterId: character.id }}
						className="nodrag nopan font-display block truncate text-[15px] font-bold text-foreground transition-colors hover:text-primary"
					>
						{character.characterName || "Ficha sem nome"}
					</Link>
					<p className="mt-1 truncate text-[11px] text-muted-foreground">
						{[character.race, character.class].filter(Boolean).join(" · ") ||
							"Sem identidade definida"}
					</p>
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
				<span className="rounded-full border border-border/70 bg-background/55 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
					{directRelationCount} vínculo(s)
				</span>
				{isEditMode && (
					<span className="text-[10px] font-medium text-primary">
						conectável
					</span>
				)}
			</div>
		</div>
	);
}

const nodeTypes = {
	familyCharacter: FamilyCharacterNode,
};

function GraphSidePanel({
	character,
	edge,
	edgeSource,
	edgeTarget,
	isEditMode,
	onRemoveEdge,
}: {
	character?: Character;
	edge?: FamilyEdge;
	edgeSource?: Character;
	edgeTarget?: Character;
	isEditMode: boolean;
	onRemoveEdge?: () => void;
}) {
	if (!character && !edge) return null;
	const edgeData = edge?.data;

	return (
		<div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[116px] sm:w-[min(330px,calc(100%-2rem))]">
			<div className="pointer-events-auto rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
				{character && (
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
							Personagem
						</p>
						<div className="mt-3 flex items-center gap-3">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								{character.imageUrl ? (
									<img
										src={character.imageUrl}
										alt={character.characterName}
										className="h-full w-full object-cover"
									/>
								) : (
									<User className="h-5 w-5" />
								)}
							</div>
							<div className="min-w-0">
								<h3 className="font-display truncate text-lg font-bold text-foreground">
									{character.characterName || "Ficha sem nome"}
								</h3>
								<p className="truncate text-[12px] text-muted-foreground">
									{[character.race, character.class]
										.filter(Boolean)
										.join(" · ") || "Sem identidade definida"}
								</p>
							</div>
						</div>
						<div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 bg-background/45 px-3 py-2">
							<span className="text-[11px] font-medium text-muted-foreground">
								Vínculos diretos
							</span>
							<span className="font-display text-lg font-bold text-foreground">
								{character.familyRelations?.length ?? 0}
							</span>
						</div>
						<Link
							to="/sheets/$characterId"
							params={{ characterId: character.id }}
							className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-border/80 bg-background/65 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
						>
							Abrir ficha
						</Link>
					</div>
				)}

				{edge && edgeData && (
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
							Vínculo
						</p>
						<h3 className="font-display mt-2 text-lg font-bold text-foreground">
							{relationLabel(edgeData.kind)}
						</h3>
						<p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
							{edgeSource?.characterName || "Personagem removido"} conectado a{" "}
							{edgeTarget?.characterName || "personagem removido"}.
						</p>
						{edgeData.isSecret && (
							<div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-200">
								<EyeOff className="h-3.5 w-3.5" />
								Segredo do mestre
							</div>
						)}
						{edgeData.note && (
							<p className="mt-3 rounded-xl border border-border/70 bg-background/45 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
								{edgeData.note}
							</p>
						)}
						{isEditMode && onRemoveEdge && (
							<Button
								type="button"
								variant="destructive"
								className="mt-4 w-full gap-2"
								onClick={onRemoveEdge}
							>
								<Trash2 className="h-4 w-4" />
								Remover vínculo
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function ConnectionEditor({
	connection,
	sourceCharacter,
	targetCharacter,
	onCancel,
	onChange,
	onSave,
}: {
	connection: PendingConnection;
	sourceCharacter: Character;
	targetCharacter: Character;
	onCancel: () => void;
	onChange: (connection: PendingConnection) => void;
	onSave: () => void;
}) {
	const storage = relationStorageForConnection(connection);
	const ownerName =
		storage.ownerCharacterId === sourceCharacter.id
			? sourceCharacter.characterName
			: targetCharacter.characterName;
	const relatedName =
		storage.relatedCharacterId === sourceCharacter.id
			? sourceCharacter.characterName
			: targetCharacter.characterName;

	return (
		<div className="absolute inset-x-3 bottom-3 z-20 mx-auto max-h-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:inset-x-4 sm:bottom-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
						Novo vínculo visual
					</p>
					<h3 className="font-display mt-1 text-lg font-bold text-foreground">
						{sourceCharacter.characterName || "Ficha sem nome"} →{" "}
						{targetCharacter.characterName || "Ficha sem nome"}
					</h3>
					<p className="mt-1 text-[12px] text-muted-foreground">
						Será salvo em {ownerName || "Ficha sem nome"} apontando para{" "}
						{relatedName || "Ficha sem nome"}.
					</p>
				</div>
				<button
					type="button"
					onClick={onCancel}
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
				<Field label="Tipo de relação">
					<Select
						value={connection.kind}
						onChange={(event) =>
							onChange({
								...connection,
								kind: event.target.value as FamilyRelationKind,
								error: undefined,
							})
						}
					>
						{relationOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Nota opcional">
					<Input
						value={connection.note}
						onChange={(event) =>
							onChange({
								...connection,
								note: event.target.value,
								error: undefined,
							})
						}
						placeholder="Ex: pai adotivo, irmã perdida..."
					/>
				</Field>
			</div>

			<div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<label className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/45 px-3 py-2 text-[12px] font-medium text-muted-foreground">
					<input
						type="checkbox"
						checked={connection.isSecret}
						onChange={(event) =>
							onChange({
								...connection,
								isSecret: event.target.checked,
								error: undefined,
							})
						}
						className="h-3.5 w-3.5 rounded border-border accent-primary"
					/>
					Segredo do mestre
				</label>

				<div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							onChange({
								...connection,
								sourceId: connection.targetId,
								targetId: connection.sourceId,
								error: undefined,
							})
						}
					>
						Inverter direção
					</Button>
					<Button type="button" onClick={onSave}>
						Salvar vínculo
					</Button>
				</div>
			</div>

			{connection.error && (
				<p className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12px] font-medium text-rose-200">
					{connection.error}
				</p>
			)}
		</div>
	);
}

function relationLabel(kind: FamilyRelationKind) {
	return (
		relationOptions.find((option) => option.value === kind)?.label ?? "Parente"
	);
}
