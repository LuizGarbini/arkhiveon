import {
	Coins,
	Package,
	Pencil,
	Plus,
	Sparkles,
	Sword,
	Trash2,
	Weight,
} from "lucide-react";
import { useState } from "react";
import { PartyLootDialog } from "@/components/party-loot-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	DAMAGE_TYPE_LABELS,
	DAMAGE_TYPES,
	parseDamageFormula,
} from "@/core/rules";
import type {
	Character,
	DamageType,
	InventoryItem,
	InventoryWeaponExtraDamage,
	InventoryWeaponStats,
} from "@/lib/store/types";
import { cn } from "@/lib/utils";

interface CharacterInventoryModuleProps {
	character: Character;
	onUpdateCharacter: (patch: Partial<Character>) => void;
}

export function CharacterInventoryModule({
	character,
	onUpdateCharacter,
}: CharacterInventoryModuleProps) {
	const inventoryList = character.inventoryList || [];

	const [activeTab, setActiveTab] = useState<
		"all" | "equipped" | "backpack" | "mount_stash"
	>("all");
	const [isAdding, setIsAdding] = useState(false);

	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState(1);
	const [weightLbs, setWeightLbs] = useState(1);
	const [location, setLocation] = useState<
		"equipped" | "backpack" | "mount_stash"
	>("backpack");
	const [category, setCategory] = useState<
		"weapon" | "armor" | "potion" | "gear" | "treasure" | "custom"
	>("gear");
	const [description, setDescription] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);

	// D&D 5e: dados de arma (só aparecem quando a categoria é Arma)
	const isDnd5e = character.system === "dnd5e";
	const [damageDice, setDamageDice] = useState("");
	const [damageType, setDamageType] = useState<DamageType>("slashing");
	const [weaponAbility, setWeaponAbility] =
		useState<InventoryWeaponStats["ability"]>("strength");
	const [magicBonus, setMagicBonus] = useState(0);
	const [proficient, setProficient] = useState(true);
	const [extraDamage, setExtraDamage] = useState<InventoryWeaponExtraDamage[]>(
		[],
	);
	const showWeaponFields = isDnd5e && category === "weapon";
	const damageDiceTrimmed = damageDice.trim();
	const parsedBase = damageDiceTrimmed
		? parseDamageFormula(damageDiceTrimmed)
		: null;
	const damageDiceInvalid =
		damageDiceTrimmed !== "" && (!parsedBase || parsedBase.dice.length === 0);

	// Cálculo de Carga D&D 5e (baseado em FOR)
	const strScore = character.strength || 10;
	const maxCapacity = strScore * 15; // 15 lbs por ponto de FOR
	const encumberedThreshold = strScore * 5; // > 5 lbs por ponto = Carga Pesada (-10ft speed)
	const heavilyEncumberedThreshold = strScore * 10; // > 10 lbs por ponto = Sobrecarregado (-20ft speed, desvantagem)

	// Itens carregados no corpo/mochila pessoal (contam para o peso)
	const carriedItems = inventoryList.filter(
		(i) => i.location !== "mount_stash",
	);
	const totalCarriedWeight = carriedItems.reduce(
		(sum, item) => sum + (item.weightLbs || 0) * (item.quantity || 1),
		0,
	);

	// Itens na mochila de carga/montaria/baú (NÃO contam para o peso nas costas)
	const stashItems = inventoryList.filter((i) => i.location === "mount_stash");
	const totalStashWeight = stashItems.reduce(
		(sum, item) => sum + (item.weightLbs || 0) * (item.quantity || 1),
		0,
	);

	// Status de Carga
	const getCapacityStatus = () => {
		if (totalCarriedWeight > maxCapacity) {
			return {
				label: "Excede Capacidade Máxima!",
				color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
				penalty: "Impossível carregar sem arrastar/empurrar",
			};
		}
		if (totalCarriedWeight > heavilyEncumberedThreshold) {
			return {
				label: "Sobrecarregado (Heavily Encumbered)",
				color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
				penalty: "-20 pés de deslocamento & Desvantagem em testes físicos",
			};
		}
		if (totalCarriedWeight > encumberedThreshold) {
			return {
				label: "Carga Pesada (Encumbered)",
				color: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30",
				penalty: "-10 pés de deslocamento",
			};
		}
		return {
			label: "Carga Leve / Normal",
			color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
			penalty: "Sem penalidades de peso",
		};
	};

	const capacityStatus = getCapacityStatus();
	const capacityPercentage = Math.min(
		100,
		Math.round((totalCarriedWeight / (maxCapacity || 1)) * 100),
	);

	const resetForm = () => {
		setName("");
		setQuantity(1);
		setWeightLbs(1);
		setLocation("backpack");
		setCategory("gear");
		setDescription("");
		setDamageDice("");
		setDamageType("slashing");
		setWeaponAbility("strength");
		setMagicBonus(0);
		setProficient(true);
		setExtraDamage([]);
		setEditingId(null);
	};

	const buildWeaponStats = (
		existing?: InventoryWeaponStats,
	): InventoryWeaponStats | undefined => {
		if (!showWeaponFields) return existing;
		if (!damageDiceTrimmed || damageDiceInvalid) return undefined;
		return {
			damageDice: damageDiceTrimmed,
			damageType,
			ability: weaponAbility,
			magicBonus: Math.trunc(Number(magicBonus) || 0),
			proficient,
			extraDamage: extraDamage
				.map((x) => ({ ...x, label: x.label.trim(), amount: x.amount.trim() }))
				.filter((x) => x.label || x.amount),
		};
	};

	const handleAddItem = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || (showWeaponFields && damageDiceInvalid)) return;

		const existing = editingId
			? inventoryList.find((i) => i.id === editingId)
			: undefined;
		const weapon = buildWeaponStats(existing?.weapon);
		const item: InventoryItem = {
			...existing,
			id: existing?.id ?? crypto.randomUUID(),
			name: name.trim(),
			quantity,
			weightLbs,
			location,
			category,
			description: description.trim(),
		};
		if (weapon) item.weapon = weapon;
		else delete item.weapon;

		onUpdateCharacter({
			inventoryList: existing
				? inventoryList.map((i) => (i.id === existing.id ? item : i))
				: [...inventoryList, item],
		});

		resetForm();
		setIsAdding(false);
	};

	const handleEditItem = (item: InventoryItem) => {
		setEditingId(item.id);
		setName(item.name);
		setQuantity(item.quantity || 1);
		setWeightLbs(item.weightLbs || 0);
		setLocation(item.location);
		setCategory(item.category ?? "gear");
		setDescription(item.description ?? "");
		setDamageDice(item.weapon?.damageDice ?? "");
		setDamageType(item.weapon?.damageType ?? "slashing");
		setWeaponAbility(item.weapon?.ability ?? "strength");
		setMagicBonus(item.weapon?.magicBonus ?? 0);
		setProficient(item.weapon?.proficient !== false);
		setExtraDamage(item.weapon?.extraDamage ?? []);
		setIsAdding(true);
	};

	const updateExtra = (
		id: string,
		patch: Partial<InventoryWeaponExtraDamage>,
	) => {
		setExtraDamage((rows) =>
			rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
		);
	};

	const handleRemoveItem = (id: string) => {
		onUpdateCharacter({
			inventoryList: inventoryList.filter((i) => i.id !== id),
		});
	};

	const handleUpdateQuantity = (id: string, delta: number) => {
		onUpdateCharacter({
			inventoryList: inventoryList
				.map((i) =>
					i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i,
				)
				.filter((i) => i.quantity > 0),
		});
	};

	const handleSwitchLocation = (
		id: string,
		newLoc: "equipped" | "backpack" | "mount_stash",
	) => {
		onUpdateCharacter({
			inventoryList: inventoryList.map((i) =>
				i.id === id ? { ...i, location: newLoc } : i,
			),
		});
	};

	const filteredList = inventoryList.filter((item) => {
		if (activeTab === "all") return true;
		return item.location === activeTab;
	});

	return (
		<div className="space-y-6">
			{/* Painel de Cálculo de Carga & Peso */}
			<div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-4 shadow-sm backdrop-blur-sm">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
							<Weight className="h-4.5 w-4.5" />
						</div>
						<div>
							<h3 className="font-display text-sm font-bold text-foreground">
								Inventário & Capacidade de Carga (FOR {strScore})
							</h3>
							<p className="text-[11px] text-muted-foreground">
								Carga normal até {encumberedThreshold} lbs • Máximo{" "}
								{maxCapacity} lbs
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<PartyLootDialog />
						<Button
							type="button"
							size="sm"
							variant={isAdding ? "ghost" : "default"}
							onClick={() => {
								if (isAdding) resetForm();
								setIsAdding(!isAdding);
							}}
							className="gap-1.5 text-xs"
						>
							<Plus className="h-3.5 w-3.5" />
							{isAdding ? "Cancelar" : "Novo Item"}
						</Button>
					</div>
				</div>

				{/* Indicador de Status & Barra de Progresso */}
				<div className="rounded-xl border border-border/60 bg-background/50 p-3.5 space-y-2.5">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
						<div className="flex items-center gap-2">
							<span
								className={cn(
									"px-2.5 py-0.5 rounded-full border text-[11px] font-bold",
									capacityStatus.color,
								)}
							>
								{capacityStatus.label}
							</span>
							<span className="text-[11px] text-muted-foreground font-mono">
								{capacityStatus.penalty}
							</span>
						</div>

						<div className="flex items-center gap-4 text-xs font-mono">
							<div>
								<span className="text-muted-foreground">Nas costas: </span>
								<span className="font-bold text-foreground">
									{totalCarriedWeight.toFixed(1)} lbs
								</span>
								<span className="text-muted-foreground">
									{" "}
									/ {maxCapacity} lbs
								</span>
							</div>
							{totalStashWeight > 0 && (
								<div>
									<span className="text-muted-foreground">
										Montaria/Carga:{" "}
									</span>
									<span className="font-bold text-amber-300">
										{totalStashWeight.toFixed(1)} lbs
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Barra de Progresso */}
					<div className="relative w-full h-2 bg-muted/80 rounded-full overflow-hidden">
						<div
							className={cn(
								"h-full rounded-full transition-all duration-300",
								totalCarriedWeight > maxCapacity
									? "bg-rose-500 animate-pulse"
									: totalCarriedWeight > heavilyEncumberedThreshold
										? "bg-amber-500"
										: totalCarriedWeight > encumberedThreshold
											? "bg-yellow-400"
											: "bg-emerald-500",
							)}
							style={{ width: `${capacityPercentage}%` }}
						/>
					</div>
				</div>

				{/* Formulário para Adicionar Item */}
				{isAdding && (
					<form
						onSubmit={handleAddItem}
						className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 animate-in fade-in"
					>
						<h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
							<Sparkles className="h-3.5 w-3.5" />{" "}
							{editingId ? "Editar Item" : "Adicionar Novo Item ao Inventário"}
						</h4>

						<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
							<div className="sm:col-span-2">
								<Field>
									<FieldLabel>Nome do Item</FieldLabel>
									<Input
										placeholder="Ex: Espada Longa +1, Rações (5 dias), Poção de Cura..."
										value={name}
										onChange={(e) => setName(e.target.value)}
										required
									/>
								</Field>
							</div>

							<div>
								<Field>
									<FieldLabel>Quantidade</FieldLabel>
									<Input
										type="number"
										min={1}
										value={quantity}
										onChange={(e) => setQuantity(Number(e.target.value))}
									/>
								</Field>
							</div>

							<div>
								<Field>
									<FieldLabel>Peso Unitário (lbs)</FieldLabel>
									<Input
										type="number"
										step="0.1"
										min={0}
										value={weightLbs}
										onChange={(e) => setWeightLbs(Number(e.target.value))}
									/>
								</Field>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<Field>
								<FieldLabel>Localização do Item</FieldLabel>
								<Select
									value={location}
									onChange={(e) =>
										setLocation(
											e.target.value as "equipped" | "backpack" | "mount_stash",
										)
									}
								>
									<option value="equipped">
										⚔️ No Corpo / Equipado (Combate)
									</option>
									<option value="backpack">
										🎒 Mochila Pessoal (Nas Costas)
									</option>
									<option value="mount_stash">
										🐎 Mochila de Carga / Montaria / Bau (Não Pesa)
									</option>
								</Select>
							</Field>

							<Field>
								<FieldLabel>Categoria</FieldLabel>
								<Select
									value={category}
									onChange={(e) => setCategory(e.target.value as any)}
								>
									<option value="gear">Equipamento / Geral</option>
									<option value="weapon">Arma</option>
									<option value="armor">Armadura / Escudo</option>
									<option value="potion">Poção / Consumível</option>
									<option value="treasure">Tesouro / Gema</option>
									<option value="custom">Outro</option>
								</Select>
							</Field>
						</div>

						<Field>
							<FieldLabel>Descrição / Propriedades</FieldLabel>
							<Textarea
								rows={2}
								placeholder="Efeitos, sintonização ou notas..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</Field>

						{showWeaponFields && (
							<fieldset className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
								<legend className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
									Dano da arma (D&D 5e)
								</legend>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
									<Field>
										<FieldLabel>Dano base</FieldLabel>
										<Input
											placeholder="1d8"
											value={damageDice}
											onChange={(e) => setDamageDice(e.target.value)}
											aria-invalid={damageDiceInvalid || undefined}
										/>
									</Field>
									<Field>
										<FieldLabel>Tipo de dano</FieldLabel>
										<Select
											value={damageType}
											onChange={(e) =>
												setDamageType(e.target.value as DamageType)
											}
										>
											{DAMAGE_TYPES.map((t) => (
												<option key={t} value={t}>
													{DAMAGE_TYPE_LABELS[t]}
												</option>
											))}
										</Select>
									</Field>
									<Field>
										<FieldLabel>Atributo</FieldLabel>
										<Select
											value={weaponAbility}
											onChange={(e) =>
												setWeaponAbility(
													e.target.value as InventoryWeaponStats["ability"],
												)
											}
										>
											<option value="strength">Força</option>
											<option value="dexterity">Destreza</option>
											<option value="finesse">Acuidade (maior)</option>
										</Select>
									</Field>
									<Field>
										<FieldLabel>Bônus mágico</FieldLabel>
										<Input
											type="number"
											step={1}
											value={magicBonus}
											onChange={(e) => setMagicBonus(Number(e.target.value))}
										/>
									</Field>
								</div>
								{damageDiceInvalid && (
									<p className="text-[11px] text-rose-400">
										Use um dado, ex.: 1d8 ou 2d6.
									</p>
								)}
								<label className="flex min-h-11 items-center gap-2 text-xs text-foreground select-none sm:min-h-0">
									<input
										type="checkbox"
										checked={proficient}
										onChange={(e) => setProficient(e.target.checked)}
										className="h-4 w-4 accent-primary"
									/>
									Proficiente com esta arma
								</label>

								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
											Dano extra
										</span>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="gap-1 text-xs"
											onClick={() =>
												setExtraDamage((rows) => [
													...rows,
													{
														id: crypto.randomUUID(),
														label: "",
														amount: "",
														type: "fire",
													},
												])
											}
										>
											<Plus className="h-3.5 w-3.5" /> Adicionar
										</Button>
									</div>
									{extraDamage.map((row) => {
										const parsed = parseDamageFormula(row.amount);
										const isZero =
											!parsed ||
											(parsed.dice.length === 0 && parsed.flat === 0);
										return (
											<div key={row.id} className="space-y-1">
												<div
													className={cn(
														"grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_5rem_8rem_auto]",
														isZero && "opacity-60",
													)}
												>
													<Input
														className="col-span-3 sm:col-span-1"
														aria-label="Origem do dano extra"
														placeholder="Runa da tempestade"
														value={row.label}
														onChange={(e) =>
															updateExtra(row.id, { label: e.target.value })
														}
													/>
													<Input
														aria-label="Valor do dano extra"
														placeholder="+2 ou 1d6"
														value={row.amount}
														onChange={(e) =>
															updateExtra(row.id, { amount: e.target.value })
														}
													/>
													<Select
														aria-label="Tipo do dano extra"
														value={row.type}
														onChange={(e) =>
															updateExtra(row.id, {
																type: e.target.value as DamageType,
															})
														}
													>
														{DAMAGE_TYPES.map((t) => (
															<option key={t} value={t}>
																{DAMAGE_TYPE_LABELS[t]}
															</option>
														))}
													</Select>
													<Button
														type="button"
														variant="ghost"
														size="icon-sm"
														aria-label="Remover dano extra"
														onClick={() =>
															setExtraDamage((rows) =>
																rows.filter((r) => r.id !== row.id),
															)
														}
														className="text-muted-foreground hover:text-rose-300"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
												{isZero && row.amount.trim() !== "" && (
													<p className="text-[11px] text-muted-foreground">
														Valor 0 ou inválido: não entra no dano.
													</p>
												)}
											</div>
										);
									})}
								</div>
							</fieldset>
						)}

						<div className="flex justify-end gap-2 pt-1">
							{editingId && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => {
										resetForm();
										setIsAdding(false);
									}}
								>
									Cancelar
								</Button>
							)}
							<Button
								type="submit"
								size="sm"
								disabled={showWeaponFields && damageDiceInvalid}
							>
								{editingId ? "Salvar alterações" : "Salvar no Inventário"}
							</Button>
						</div>
					</form>
				)}

				{/* Navegação por Abas das Mochilas */}
				<div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-2">
					<button
						type="button"
						onClick={() => setActiveTab("all")}
						className={cn(
							"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
							activeTab === "all"
								? "bg-primary/20 text-primary border border-primary/30"
								: "text-muted-foreground hover:bg-muted/40",
						)}
					>
						Todos ({inventoryList.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("equipped")}
						className={cn(
							"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
							activeTab === "equipped"
								? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
								: "text-muted-foreground hover:bg-muted/40",
						)}
					>
						<Sword className="h-3.5 w-3.5" /> No Corpo (
						{inventoryList.filter((i) => i.location === "equipped").length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("backpack")}
						className={cn(
							"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
							activeTab === "backpack"
								? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
								: "text-muted-foreground hover:bg-muted/40",
						)}
					>
						<Package className="h-3.5 w-3.5" /> Mochila Pessoal (
						{inventoryList.filter((i) => i.location === "backpack").length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("mount_stash")}
						className={cn(
							"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
							activeTab === "mount_stash"
								? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
								: "text-muted-foreground hover:bg-muted/40",
						)}
					>
						🐎 Mochila de Carga / Montaria (
						{inventoryList.filter((i) => i.location === "mount_stash").length})
					</button>
				</div>

				{/* Lista de Itens do Inventário */}
				<div className="space-y-2">
					{filteredList.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
							Nenhum item nesta mochila ainda. Use o botão{" "}
							<strong>"Novo Item"</strong> acima para registrar equipamentos e
							controlar o peso!
						</div>
					) : (
						filteredList.map((item) => {
							const itemTotalWeight =
								(item.weightLbs || 0) * (item.quantity || 1);

							return (
								<div
									key={item.id}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-3 hover:border-border transition-colors"
								>
									<div className="space-y-1 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-bold text-xs text-foreground">
												{item.name}
											</span>
											<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
												x{item.quantity}
											</span>
											{item.location === "equipped" && (
												<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
													⚔️ No Corpo
												</span>
											)}
											{isDnd5e && item.category === "weapon" && item.weapon && (
												<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider tabular-nums">
													{item.weapon.damageDice}{" "}
													{DAMAGE_TYPE_LABELS[item.weapon.damageType]}
												</span>
											)}
											{item.location === "mount_stash" && (
												<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
													🐎 Carga / Montaria
												</span>
											)}
										</div>

										{item.description && (
											<p className="text-[11px] text-muted-foreground leading-relaxed">
												{item.description}
											</p>
										)}
									</div>

									<div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
										<span className="text-xs font-mono text-muted-foreground">
											{itemTotalWeight.toFixed(1)} lbs
										</span>

										{/* Alterar Quantidade */}
										<div className="flex items-center gap-1 border border-border/50 rounded-lg p-0.5 bg-background">
											<Button
												type="button"
												variant="ghost"
												size="xs"
												className="h-6 w-6 p-0"
												onClick={() => handleUpdateQuantity(item.id, -1)}
											>
												-
											</Button>
											<span className="text-xs font-mono font-bold px-1.5">
												{item.quantity}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="xs"
												className="h-6 w-6 p-0"
												onClick={() => handleUpdateQuantity(item.id, 1)}
											>
												+
											</Button>
										</div>

										{/* Mover entre Mochilas */}
										<Select
											value={item.location}
											onChange={(e) =>
												handleSwitchLocation(item.id, e.target.value as any)
											}
											className="h-7 text-[11px] py-0 px-2 rounded-lg"
										>
											<option value="equipped">No Corpo</option>
											<option value="backpack">Mochila Pessoal</option>
											<option value="mount_stash">Carga / Montaria</option>
										</Select>

										{/* Editar Item */}
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											aria-label={`Editar ${item.name}`}
											onClick={() => handleEditItem(item)}
											className="text-muted-foreground hover:text-foreground"
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>

										{/* Excluir Item */}
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											onClick={() => handleRemoveItem(item.id)}
											className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>

			{/* Anotações Legado (Equipamento & Moedas) */}
			{(character.equipment?.trim() || character.currency?.trim()) && (
				<div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
					<h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
						<Coins className="h-3.5 w-3.5 text-amber-400" /> Registros de Moedas
						& Equipamento em Texto
					</h4>
					{character.currency?.trim() && (
						<div className="text-xs text-foreground bg-background/50 p-2.5 rounded-xl border border-border/40">
							<strong className="text-amber-400">Moedas / Tesouros: </strong>{" "}
							{character.currency}
						</div>
					)}
					{character.equipment?.trim() && (
						<div className="text-xs text-muted-foreground whitespace-pre-wrap bg-background/50 p-2.5 rounded-xl border border-border/40">
							<strong className="text-foreground">
								Anotações do Inventário:{" "}
							</strong>{" "}
							{character.equipment}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
