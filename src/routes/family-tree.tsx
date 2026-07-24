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
	Layers,
	Maximize2,
	MousePointer2,
	PencilLine,
	Search,
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
import { getCharacterPresetUrl } from "@/lib/character-presets";
import type {
	Character,
	FamilyRelation,
	FamilyRelationKind,
} from "@/lib/store";
import { useActiveCampaignRole, useRPGStore } from "@/lib/store";

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
	isDimmed?: boolean;
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
	const myRole = useActiveCampaignRole();
	const isPlayer = myRole === "viewer";

	const relationCount = characters.reduce(
		(total, character) =>
			total +
			(character.familyRelations?.filter((r) => !isPlayer || !r.isSecret)
				.length ?? 0),
		0,
	);

	const graphModel = useMemo(
		() => buildFamilyGraph(characters, isEditMode, isPlayer),
		[characters, isEditMode, isPlayer],
	);

	return (
		<div className="w-full relative">
			<PageHeader
				title="Árvore Genealógica"
				description="Explore toda a linhagem da campanha em um canvas com zoom, arraste, diretório de integrantes e edição visual de vínculos."
				Icon={GitFork}
				iconColor="text-emerald-300"
				eyebrow="Linhagens"
				count={relationCount}
			/>

			<div className="px-6 pb-16 sm:px-8">
				<div className="mx-auto w-full max-w-7xl">
					{characters.length === 0 ? (
						<EmptyState
							Icon={GitFork}
							title="Nenhum personagem para montar árvore"
							description="Crie fichas de personagens para começar a vincular laços familiares."
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
								isPlayer={isPlayer}
							/>
						</ReactFlowProvider>
					)}
				</div>
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
	isPlayer,
}: {
	characters: Character[];
	graphModel: GraphModel;
	isEditMode: boolean;
	onEditModeChange: (value: boolean) => void;
	onUpdateCharacter: (characterId: string, patch: Partial<Character>) => void;
	relationCount: number;
	isPlayer: boolean;
}) {
	const [nodes, setNodes, onNodesChange] = useNodesState<FamilyNode>(
		graphModel.nodes,
	);
	const [edges, setEdges, onEdgesChange] = useEdgesState<FamilyEdge>(
		graphModel.edges,
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
		null,
	);
	const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
	const [pendingConnection, setPendingConnection] =
		useState<PendingConnection | null>(null);
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const { fitView } = useReactFlow<FamilyNode, FamilyEdge>();

	const activeNodeIds = useMemo(() => {
		if (!hoveredNodeId) return null;
		const set = new Set<string>([hoveredNodeId]);
		for (const edge of edges) {
			if (edge.source === hoveredNodeId) set.add(edge.target);
			if (edge.target === hoveredNodeId) set.add(edge.source);
		}
		return set;
	}, [hoveredNodeId, edges]);

	const mappedNodes = useMemo(() => {
		if (!activeNodeIds) return nodes;
		return nodes.map((node) => ({
			...node,
			data: {
				...node.data,
				isDimmed: !activeNodeIds.has(node.id),
			},
		}));
	}, [nodes, activeNodeIds]);

	const mappedEdges = useMemo(() => {
		if (!hoveredNodeId) return edges;
		return edges.map((edge) => {
			const isRelated =
				edge.source === hoveredNodeId || edge.target === hoveredNodeId;
			return {
				...edge,
				animated: edge.data?.isSecret ? true : isRelated,
				style: {
					...edge.style,
					opacity: isRelated ? 1 : 0.15,
				},
			};
		});
	}, [edges, hoveredNodeId]);

	const filteredCharacters = useMemo(() => {
		if (!searchQuery.trim()) return characters;
		const query = searchQuery.toLowerCase();
		return characters.filter(
			(c) =>
				c.characterName.toLowerCase().includes(query) ||
				c.race?.toLowerCase().includes(query) ||
				c.class?.toLowerCase().includes(query),
		);
	}, [characters, searchQuery]);

	const characterById = useMemo(
		() => new Map(characters.map((character) => [character.id, character])),
		[characters],
	);

	const selectedCharacter = selectedCharacterId
		? characterById.get(selectedCharacterId)
		: undefined;
	const selectedEdge = selectedEdgeId
		? edges.find((e) => e.id === selectedEdgeId)
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
			if (isPlayer) return;
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
		[isEditMode, isPlayer],
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

	return (
		<section className="relative isolate overflow-hidden rounded-[1.75rem] border border-border/70 bg-card-elevated shadow-xl shadow-black/10 transition-all duration-300">
			{/* Top Header Controls Bar */}
			<div className="flex flex-col gap-3 rounded-t-[1.75rem] border-b border-border/70 bg-card-elevated px-6 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
						<Layers className="h-3.5 w-3.5" />
						Diretório e Grafo Interativo
					</div>
					<h3 className="font-display mt-1 text-xl font-bold text-foreground sm:text-2xl">
						Conexões Familiares da Campanha
					</h3>
				</div>

				<div className="flex items-center gap-2">
					{!isPlayer && (
						<Button
							type="button"
							variant={isEditMode ? "default" : "outline"}
							size="sm"
							onClick={() => {
								onEditModeChange(!isEditMode);
								setPendingConnection(null);
							}}
							className="gap-2"
						>
							<PencilLine className="h-4 w-4" />
							{isEditMode ? "Editando Vínculos" : "Modo Edição"}
						</Button>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={focusGraph}
						className="gap-2"
					>
						<Maximize2 className="h-4 w-4" />
						Recentralizar
					</Button>
				</div>
			</div>

			{/* Split Layout: 65% Interactive Canvas / 35% Persistent Inspector */}
			<div className="grid grid-cols-1 lg:grid-cols-12 h-[600px] w-full divide-y lg:divide-y-0 lg:divide-x divide-border/70 rounded-b-[1.75rem] overflow-hidden">
				{/* Left Column: Canvas (8 Cols) */}
				<div className="lg:col-span-8 h-full relative overflow-hidden rounded-bl-[1.75rem]">
					<ReactFlow<FamilyNode, FamilyEdge>
						nodes={mappedNodes}
						edges={mappedEdges}
						nodeTypes={nodeTypes}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
						onNodeMouseLeave={() => setHoveredNodeId(null)}
						colorMode="dark"
						connectionLineStyle={{
							stroke: "var(--primary)",
							strokeWidth: 2,
							strokeDasharray: "5 5",
						}}
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
						nodesConnectable={isEditMode}
						nodesDraggable
						elementsSelectable
						deleteKeyCode={null}
						fitView
						fitViewOptions={{ padding: 0.18 }}
						minZoom={0.18}
						maxZoom={1.7}
						proOptions={{ hideAttribution: true }}
						className="bg-background rounded-bl-[1.75rem]"
					>
						<Background color="var(--primary)" gap={24} size={1.2} />
						<Controls className="family-flow-controls" />
						<MiniMap
							pannable
							zoomable
							nodeColor="var(--primary)"
							maskColor="rgba(10, 8, 20, 0.78)"
							className="family-flow-minimap"
						/>
						<Panel position="top-left" className="hidden sm:block">
							<div className="max-w-[300px] rounded-xl border border-border/70 bg-card-elevated/95 px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-lg backdrop-blur-xl flex items-start gap-2">
								<MousePointer2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
								<div>
									<p className="font-semibold text-foreground">
										Navegação da Árvore:
									</p>
									<p className="mt-0.5 text-[10px] leading-relaxed">
										{isEditMode
											? "Arraste a partir dos pontos dos cards para vincular personagens."
											: "Clique e arraste pelo canvas para mover. Use a roda do mouse ou trackpad para dar zoom."}
									</p>
								</div>
							</div>
						</Panel>
					</ReactFlow>
				</div>

				{/* Right Column: Persistent Inspector & Directory (4 Cols) */}
				<aside className="lg:col-span-4 h-full p-4 overflow-y-auto flex flex-col gap-4 bg-card-elevated/50 rounded-br-[1.75rem]">
					<div>
						<h3 className="font-display text-base font-bold text-foreground flex items-center justify-between">
							<span>Diretório da Linhagem</span>
							<span className="text-xs font-normal text-muted-foreground">
								{characters.length} fichas
							</span>
						</h3>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Selecione um personagem para destacar vínculos.
						</p>

						<div className="mt-3 relative">
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Buscar por nome ou raça..."
								className="pl-9 text-xs"
							/>
						</div>
					</div>

					{selectedCharacter && (
						<div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 transition-all">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-primary/30 bg-primary/10">
									{selectedCharacter.imageUrl ? (
										<img
											src={selectedCharacter.imageUrl}
											alt={selectedCharacter.characterName}
											className="h-full w-full object-cover"
										/>
									) : (
										<User className="h-full w-full p-2 text-primary" />
									)}
								</div>
								<div className="min-w-0">
									<h4 className="font-display font-bold text-sm text-foreground truncate">
										{selectedCharacter.characterName}
									</h4>
									<p className="text-[11px] text-muted-foreground truncate">
										{[selectedCharacter.race, selectedCharacter.class]
											.filter(Boolean)
											.join(" · ") || "Sem classe/raça"}
									</p>
								</div>
							</div>
							<div className="mt-2.5 flex items-center justify-between text-xs pt-2.5 border-t border-border/60">
								<span className="text-muted-foreground">Vínculos Diretos:</span>
								<span className="font-bold text-primary">
									{selectedCharacter.familyRelations?.length ?? 0}
								</span>
							</div>
							<Link
								to="/sheets/$characterId"
								params={{ characterId: selectedCharacter.id }}
								className="mt-2.5 block text-center rounded-lg bg-primary text-primary-foreground py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity"
							>
								Abrir Ficha do Personagem
							</Link>
						</div>
					)}

					<div className="flex flex-col gap-1.5">
						<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							Lista de Integrantes
						</span>
						{filteredCharacters.map((char) => {
							const isSelected = char.id === selectedCharacterId;
							return (
								<button
									type="button"
									key={char.id}
									onClick={() => {
										setSelectedCharacterId(char.id);
										setSelectedEdgeId(null);
									}}
									className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
										isSelected
											? "border-primary bg-primary/10"
											: "border-border/60 bg-background/50 hover:border-primary/40"
									}`}
								>
									<div className="flex items-center gap-2.5 min-w-0">
										<div className="h-7 w-7 rounded-lg overflow-hidden border border-border/70 shrink-0">
											{char.imageUrl ? (
												<img
													src={char.imageUrl}
													alt={char.characterName}
													className="h-full w-full object-cover"
												/>
											) : (
												<User className="h-full w-full p-1.5 text-muted-foreground" />
											)}
										</div>
										<div className="min-w-0">
											<p className="truncate text-xs font-bold text-foreground">
												{char.characterName}
											</p>
											<p className="truncate text-[10px] text-muted-foreground">
												{char.race || "Sem raça"}
											</p>
										</div>
									</div>
									<span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background text-muted-foreground shrink-0">
										{char.familyRelations?.length ?? 0} laços
									</span>
								</button>
							);
						})}
					</div>
				</aside>
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
}

function buildFamilyGraph(
	characters: Character[],
	isEditMode: boolean,
	isPlayer: boolean,
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
			directRelationCount:
				character.familyRelations?.filter((r) => !isPlayer || !r.isSecret)
					.length ?? 0,
			isEditMode,
		},
	}));
	const edges: FamilyEdge[] = [];

	for (const owner of characters) {
		for (const relation of owner.familyRelations ?? []) {
			if (isPlayer && relation.isSecret) continue;
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
							color: "var(--primary)",
						}
					: undefined,
				style: {
					stroke: relation.isSecret
						? "var(--muted-foreground)"
						: visual.isDirectional
							? "var(--primary)"
							: "var(--border)",
					strokeWidth: 2,
				},
				labelBgBorderRadius: 10,
				labelBgPadding: [8, 4],
				labelStyle: {
					fill: "var(--foreground)",
					fontSize: 11,
					fontWeight: 700,
				},
				labelBgStyle: {
					fill: "var(--card)",
					stroke: "var(--border)",
					strokeWidth: 1,
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
	const { character, directRelationCount, isEditMode, isDimmed } = data;

	return (
		<div
			className={`group relative w-[244px] overflow-hidden rounded-2xl border bg-card-elevated p-3 shadow-lg backdrop-blur transition-all duration-300 ${
				selected
					? "border-primary ring-4 ring-primary/15"
					: "border-border/70 hover:border-primary/40"
			} ${
				isDimmed
					? "opacity-30 blur-[0.5px] scale-[0.97] pointer-events-none"
					: ""
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
						<img
							src={getCharacterPresetUrl(character.class || "")}
							alt={character.class || "Preset"}
							className="h-full w-full object-cover"
						/>
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
	const myRole = useActiveCampaignRole();
	const isPlayer = myRole === "viewer";
	if (!character && !edge) return null;
	const edgeData = edge?.data;

	return (
		<div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[80px] sm:w-[min(330px,calc(100%-2rem))]">
			<div className="pointer-events-auto rounded-2xl border border-border/70 bg-card-elevated p-4 shadow-2xl backdrop-blur-xl">
				{character && (
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
							Personagem Selecionado
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
								Vínculos Diretos
							</span>
							<span className="font-display text-lg font-bold text-foreground">
								{character.familyRelations?.filter(
									(r) => !isPlayer || !r.isSecret,
								).length ?? 0}
							</span>
						</div>
						<Link
							to="/sheets/$characterId"
							params={{ characterId: character.id }}
							className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-border/80 bg-background/65 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
						>
							Abrir Ficha
						</Link>
					</div>
				)}

				{edge && edgeData && (
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
							Vínculo Familiar
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
								Segredo do Mestre
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
								Remover Vínculo
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
		<div className="absolute inset-x-3 bottom-3 z-20 mx-auto max-h-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border/70 bg-card-elevated p-4 shadow-2xl backdrop-blur-xl sm:inset-x-4 sm:bottom-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
						Novo Vínculo Visual
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
				<Field label="Tipo de Relação">
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
				<Field label="Nota Opcional">
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

			<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<label className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-xs font-medium text-foreground cursor-pointer hover:bg-background/80 transition-colors">
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
						className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
					/>
					<span>Segredo do Mestre</span>
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
						Inverter Direção
					</Button>
					<Button type="button" onClick={onSave}>
						Salvar Vínculo
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
