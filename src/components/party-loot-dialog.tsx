import { Gift, Package, Plus, Sparkles, UserCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PartyLootDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [isAdding, setIsAdding] = useState(false);

	const partyLoot = useRPGStore((state) => state.partyLoot || []);
	const characters = useRPGStore((state) => state.characters || []);
	const addPartyLootItem = useRPGStore((state) => state.addPartyLootItem);
	const removePartyLootItem = useRPGStore((state) => state.removePartyLootItem);
	const claimPartyLootItem = useRPGStore((state) => state.claimPartyLootItem);

	const [newItemName, setNewItemName] = useState("");
	const [newItemQuantity, setNewItemQuantity] = useState(1);
	const [newItemCategory, setNewItemCategory] = useState("Equipamento");
	const [newItemProps, setNewItemProps] = useState("");
	const [newItemDesc, setNewItemDesc] = useState("");
	const [selectedCharId, setSelectedCharId] = useState<string>("");

	const handleAddItem = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newItemName.trim()) return;

		addPartyLootItem({
			name: newItemName.trim(),
			quantity: newItemQuantity,
			category: newItemCategory,
			properties: newItemProps.trim(),
			description: newItemDesc.trim(),
		});

		setNewItemName("");
		setNewItemQuantity(1);
		setNewItemProps("");
		setNewItemDesc("");
		setIsAdding(false);
	};

	const unclaimedLoot = partyLoot.filter((item) => !item.isClaimed);
	const claimedLoot = partyLoot.filter((item) => item.isClaimed);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-2 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
				>
					<Package className="h-4 w-4" />
					Mochila do Grupo ({unclaimedLoot.length})
				</Button>
			</DialogTrigger>

			<DialogContent className="max-w-3xl! max-h-[85vh] flex flex-col overflow-hidden">
				<DialogHeader className="shrink-0">
					<DialogTitle className="font-display flex items-center gap-2 text-xl">
						<Package className="h-5 w-5 text-amber-400" />
						Mochila Coletiva do Grupo & Drops de Batalha
					</DialogTitle>
					<DialogDescription>
						Gerencie saques de combate, tesouros não atribuídos e distribua itens aos personagens.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-5 pr-1 my-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Itens Pendentes no Saque ({unclaimedLoot.length})
							</span>
						</div>
						<Button
							type="button"
							size="sm"
							variant={isAdding ? "ghost" : "default"}
							onClick={() => setIsAdding(!isAdding)}
							className="gap-1.5 text-xs h-8"
						>
							<Plus className="h-3.5 w-3.5" />
							{isAdding ? "Cancelar" : "Adicionar Saque / Drop"}
						</Button>
					</div>

					{isAdding && (
						<form
							onSubmit={handleAddItem}
							className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 animate-in fade-in duration-150"
						>
							<h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
								<Sparkles className="h-3.5 w-3.5" /> Registrar Novo Item Encontrado
							</h4>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div className="sm:col-span-2">
									<Field label="Nome do Item">
										<Input
											placeholder="Ex: Manoplas de Shar, 4 Objetos de Arte..."
											value={newItemName}
											onChange={(e) => setNewItemName(e.target.value)}
											required
										/>
									</Field>
								</div>
								<div>
									<Field label="Quantidade">
										<Input
											type="number"
											min={1}
											value={newItemQuantity}
											onChange={(e) => setNewItemQuantity(Number(e.target.value))}
										/>
									</Field>
								</div>
							</div>

							<Field label="Propriedades Especiais / Efeitos">
								<Input
									placeholder="Ex: +16 CA, 1d10 dano de gelo, congela se falhar no teste de CON"
									value={newItemProps}
									onChange={(e) => setNewItemProps(e.target.value)}
								/>
							</Field>

							<Field label="Descrição / Notas">
								<Textarea
									rows={2}
									placeholder="Detalhes adicionais ou local onde foi encontrado..."
									value={newItemDesc}
									onChange={(e) => setNewItemDesc(e.target.value)}
								/>
							</Field>

							<div className="flex justify-end gap-2 pt-1">
								<Button type="submit" size="sm">
									Salvar no Saque do Grupo
								</Button>
							</div>
						</form>
					)}

					{/* Lista de saques pendentes */}
					<div className="space-y-2.5">
						{unclaimedLoot.length === 0 ? (
							<div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
								Nenhum item pendente no saque coletivo do grupo.
							</div>
						) : (
							unclaimedLoot.map((item) => (
								<div
									key={item.id}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/30"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-bold text-sm text-foreground">
												{item.quantity > 1 ? `${item.quantity}x ` : ""}
												{item.name}
											</span>
										</div>
										{item.properties && (
											<p className="text-xs font-semibold text-amber-400/90 flex items-center gap-1">
												<Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
												{item.properties}
											</p>
										)}
										{item.description && (
											<p className="text-xs text-muted-foreground leading-relaxed">
												{item.description}
											</p>
										)}
									</div>

									<div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
										<select
											value={selectedCharId}
											onChange={(e) => setSelectedCharId(e.target.value)}
											className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary max-w-[160px]"
										>
											<option value="">Atribuir a...</option>
											{characters.map((c) => (
												<option key={c.id} value={c.id}>
													{c.characterName}
												</option>
											))}
										</select>
										<Button
											type="button"
											size="sm"
											disabled={!selectedCharId}
											onClick={() => {
												const char = characters.find((c) => c.id === selectedCharId);
												if (char) {
													claimPartyLootItem(item.id, char.id, char.characterName);
													setSelectedCharId("");
												}
											}}
											className="gap-1 text-xs"
										>
											<Gift className="h-3.5 w-3.5" />
											Entregar
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											onClick={() => removePartyLootItem(item.id)}
											className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
											title="Excluir item do saque"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))
						)}
					</div>

					{/* Histórico de Itens já Atribuídos */}
					{claimedLoot.length > 0 && (
						<div className="space-y-2 pt-3 border-t border-border/50">
							<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
								Itens Distribuídos Recentemente ({claimedLoot.length})
							</span>
							<div className="space-y-1.5">
								{claimedLoot.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background/30 text-xs text-muted-foreground"
									>
										<span>
											{item.quantity}x {item.name}
										</span>
										<span className="inline-flex items-center gap-1 font-semibold text-primary">
											<UserCheck className="h-3 w-3" /> Entregue a:{" "}
											{item.claimedByCharacterName || "Personagem"}
										</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
