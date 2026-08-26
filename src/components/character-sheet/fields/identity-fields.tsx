import { Check, Wand2 } from "lucide-react";
import type { FieldErrors, Path } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Field, FormSection } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { generateThematicName } from "@/lib/name-generator";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";
import {
	CHARACTER_NAME_REQUIRED_MESSAGE,
	type CharacterControl,
	type CharacterFormValues,
	type CharacterRegister,
	type CharacterSetValue,
} from "../types";

export const AVATAR_PRESETS = [
	{
		id: "guerreiro",
		label: "Guerreiro",
		url: "/presets/warrior.png",
	},
	{
		id: "mago",
		label: "Mago",
		url: "/presets/mage.png",
	},
	{
		id: "ladino",
		label: "Ladino",
		url: "/presets/rogue.png",
	},
	{
		id: "clerigo",
		label: "Clérigo",
		url: "/presets/cleric.png",
	},
	{
		id: "detective",
		label: "Investigador",
		url: "/presets/detective.png",
	},
	{
		id: "vampiro",
		label: "Vampiro",
		url: "/presets/vampire.png",
	},
];

export function IdentityFields({
	register,
	control,
	setValue,
	errors,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	errors?: FieldErrors<CharacterFormValues>;
}) {
	const imageUrl = useWatch({ control, name: "imageUrl" });
	const characterName = useWatch({ control, name: "characterName" });

	const system = useWatch({ control, name: "system" }) || "dnd5e";
	const race = useWatch({ control, name: "race" });
	const className = useWatch({ control, name: "class" });

	const strength = useWatch({ control, name: "strength" }) || 10;
	const dexterity = useWatch({ control, name: "dexterity" }) || 10;
	const constitution = useWatch({ control, name: "constitution" }) || 10;
	const intelligence = useWatch({ control, name: "intelligence" }) || 10;
	const wisdom = useWatch({ control, name: "wisdom" }) || 10;
	const charisma = useWatch({ control, name: "charisma" }) || 10;

	const toast = useToast();

	const handleGenerateName = () => {
		const generated = generateThematicName({
			system,
			race,
			class: className,
			attributes: {
				strength,
				dexterity,
				constitution,
				intelligence,
				wisdom,
				charisma,
			},
		});
		setValue("characterName", generated, {
			shouldValidate: true,
			shouldDirty: true,
		});

		if (!race && !className) {
			toast.info({
				title: "Nome Genérico Gerado",
				description:
					"Dica: preencha a Raça e a Classe para gerar um nome temático e personalizado!",
			});
		} else {
			const sysName = SYSTEM_CONFIG[system]?.label || system;
			const contextDesc = [race, className].filter(Boolean).join(" ");
			toast.success({
				title: "Nome Temático Gerado",
				description: `Nome criado baseado no contexto: ${contextDesc} (${sysName}).`,
			});
		}
	};

	return (
		<>
			<FormSection title="Identidade Básica">
				{system === "ordem" ? (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field
								label="Nome do agente"
								required
								error={errors?.characterName?.message}
							>
								<div className="relative flex items-center">
									<Input
										placeholder="Ex: Agatha, Giovanni Opspor..."
										className="pr-10"
										{...register("characterName", {
											required: CHARACTER_NAME_REQUIRED_MESSAGE,
											validate: (value) =>
												value.trim().length > 0 ||
												CHARACTER_NAME_REQUIRED_MESSAGE,
										})}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={handleGenerateName}
										className="absolute right-1 text-muted-foreground/80 hover:text-primary hover:bg-primary/10 rounded-md h-8 w-8"
										title="Gerar nome temático"
									>
										<Wand2 className="h-4 w-4" />
									</Button>
								</div>
							</Field>
							<Field label="Prestígio / Limite de Crédito">
								<Input
									placeholder="Ex: Baixo, Médio, Alto, Ilimitado"
									{...register("alignment")}
								/>
							</Field>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<Field label="Origem">
								<Select {...register("race")}>
									<option value="">Selecione uma Origem...</option>
									<option value="Acadêmico">Acadêmico</option>
									<option value="Agente de Saúde">Agente de Saúde</option>
									<option value="Amnésico">Amnésico</option>
									<option value="Artista">Artista</option>
									<option value="Atleta">Atleta</option>
									<option value="Chef">Chef</option>
									<option value="Criminoso">Criminoso</option>
									<option value="Cultista Arrependido">
										Cultista Arrependido
									</option>
									<option value="Desgarrado">Desgarrado</option>
									<option value="Engenheiro">Engenheiro</option>
									<option value="Executivo">Executivo</option>
									<option value="Experimento">Experimento</option>
									<option value="Investigador">Investigador</option>
									<option value="Lutador">Lutador</option>
									<option value="Magnata">Magnata</option>
									<option value="Mercenário">Mercenário</option>
									<option value="Médico">Médico</option>
									<option value="Policial">Policial</option>
									<option value="Religioso">Religioso</option>
									<option value="Servidor Público">Servidor Público</option>
									<option value="T.I.">T.I.</option>
									<option value="Trabalhador de Equipe">
										Trabalhador de Equipe
									</option>
									<option value="Vítima">Vítima</option>
									<option value="Outra">Outra / Personalizada</option>
								</Select>
							</Field>
							<Field label="Classe da Ordem">
								<Select {...register("class")}>
									<option value="combatente">Combatente</option>
									<option value="especialista">Especialista</option>
									<option value="ocultista">Ocultista</option>
								</Select>
							</Field>
							<Field label="Trilha">
								{className === "combatente" ? (
									<Select {...register("subclass")}>
										<option value="">Selecione a Trilha...</option>
										<option value="Aniquilador">Aniquilador</option>
										<option value="Comandante de Campo">
											Comandante de Campo
										</option>
										<option value="Guerreiro">Guerreiro</option>
										<option value="Operador de Armas">Operador de Armas</option>
										<option value="Tropa de Choque">Tropa de Choque</option>
									</Select>
								) : className === "especialista" ? (
									<Select {...register("subclass")}>
										<option value="">Selecione a Trilha...</option>
										<option value="Atirador de Elite">Atirador de Elite</option>
										<option value="Infiltrador">Infiltrador</option>
										<option value="Médico de Campo">Médico de Campo</option>
										<option value="Especialista em Elementos">
											Especialista em Elementos
										</option>
										<option value="Técnico">Técnico</option>
									</Select>
								) : className === "ocultista" ? (
									<Select {...register("subclass")}>
										<option value="">Selecione a Trilha...</option>
										<option value="Conduíte">Conduíte</option>
										<option value="Graduado">Graduado</option>
										<option value="Intuitivo">Intuitivo</option>
										<option value="Lâmina Paranormal">Lâmina Paranormal</option>
										<option value="Flagelador">Flagelador</option>
									</Select>
								) : (
									<Input
										placeholder="Ex: Aniquilador, Conduíte, Médico de Campo..."
										{...register("subclass")}
									/>
								)}
							</Field>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field label="Patente da Ordem">
								<Select
									{...register(
										"systemFields.patente" as Path<CharacterFormValues>,
									)}
								>
									<option value="recruta">Recruta</option>
									<option value="operador">Operador</option>
									<option value="agente_especial">Agente Especial</option>
									<option value="oficial_operacoes">
										Oficial de Operações
									</option>
									<option value="agente_elite">Agente de Elite</option>
								</Select>
							</Field>
							<Field label="NEX% (Exposição Paranormal)">
								<Select
									{...register("level", {
										valueAsNumber: true,
										onChange: (e) => {
											const nexVal = Number.parseInt(e.target.value, 10);
											if (setValue) {
												setValue("level", Math.max(1, Math.floor(nexVal / 5)), {
													shouldDirty: true,
												});
												setValue(
													"systemFields.nex" as Path<CharacterFormValues>,
													String(nexVal),
													{ shouldDirty: true },
												);
											}
										},
									})}
								>
									{Array.from({ length: 20 }, (_, i) => (i + 1) * 5).map(
										(val) => (
											<option key={val} value={val}>
												NEX {val}%
											</option>
										),
									)}
								</Select>
							</Field>
						</div>
					</>
				) : (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field
								label="Nome do personagem"
								required
								error={errors?.characterName?.message}
							>
								<div className="relative flex items-center">
									<Input
										placeholder="Ex: Aragorn, Lyra Cinzal..."
										className="pr-10"
										{...register("characterName", {
											required: CHARACTER_NAME_REQUIRED_MESSAGE,
											validate: (value) =>
												value.trim().length > 0 ||
												CHARACTER_NAME_REQUIRED_MESSAGE,
										})}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={handleGenerateName}
										className="absolute right-1 text-muted-foreground/80 hover:text-primary hover:bg-primary/10 rounded-md h-8 w-8"
										title="Gerar nome temático"
									>
										<Wand2 className="h-4 w-4" />
									</Button>
								</div>
							</Field>
							<Field label="Tendência / Alinhamento">
								<Input
									placeholder="Ex: Caótico Bom"
									{...register("alignment")}
								/>
							</Field>
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field
								label="Título / Título Lendário"
								hint="Ex: O Matador de Dragões, Herói de Phandalin"
							>
								<Input
									placeholder="Ex: O Matador de Dragões, Lorde de Neverwinter"
									{...register("title")}
								/>
							</Field>
							<Field
								label="Alcunha / Apelido"
								hint="Ex: Mão-de-Ferro, Olho de Águia, Sombra"
							>
								<Input
									placeholder="Ex: Mão-de-Ferro, Sombra"
									{...register("nickname")}
								/>
							</Field>
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<Field label="Raça">
								<Input placeholder="Elfo, Humano..." {...register("race")} />
							</Field>
							<Field label="Classe">
								<Input
									placeholder="Guerreiro, Mago..."
									{...register("class")}
								/>
							</Field>
							<Field label="Subclasse / Caminho">
								<Input
									placeholder="Domínio da Vida..."
									{...register("subclass")}
								/>
							</Field>
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<Field label="Antecedente / Background">
								<Input
									placeholder="Charlatão, Sábio..."
									{...register("background")}
								/>
							</Field>
							<Field label="Nível">
								<Input
									type="number"
									min={1}
									max={30}
									placeholder="1"
									{...register("level", { valueAsNumber: true })}
								/>
							</Field>
							<Field label="Experiência (XP)">
								<Input
									type="number"
									min={0}
									placeholder="0"
									{...register("xp", { valueAsNumber: true })}
								/>
							</Field>
						</div>
					</>
				)}
			</FormSection>

			<FormSection title="Aparência">
				<ImageUploader
					value={imageUrl ?? ""}
					onChange={(url) => {
						setValue("imageUrl", url, { shouldDirty: true });
						setValue("imageAssetId", "", { shouldDirty: true });
					}}
					label="Avatar do personagem"
					folder="characters"
					libraryName={characterName}
					size="lg"
				/>

				<div className="mt-4 mb-6">
					<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] block mb-2.5">
						Ou escolha um avatar predefinido:
					</span>
					<div className="flex flex-wrap gap-2.5">
						{AVATAR_PRESETS.map((preset) => {
							const selected = imageUrl === preset.url;
							return (
								<button
									key={preset.id}
									type="button"
									onClick={() => {
										setValue("imageUrl", preset.url, { shouldDirty: true });
										setValue("imageAssetId", "", { shouldDirty: true });
									}}
									className={cn(
										"h-12 w-12 rounded-xl overflow-hidden border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer relative",
										selected
											? "border-primary ring-2 ring-primary/20 scale-105"
											: "border-border/60 hover:border-primary/40",
									)}
									title={preset.label}
								>
									<img
										src={preset.url}
										alt={preset.label}
										className="h-full w-full object-cover"
									/>
									{selected && (
										<div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
											<Check className="h-4.5 w-4.5 text-white drop-shadow-md" />
										</div>
									)}
								</button>
							);
						})}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
					<Field label="Idade">
						<Input placeholder="Ex: 137" {...register("age")} />
					</Field>
					<Field label="Altura">
						<Input placeholder="Ex: 1,78m" {...register("height")} />
					</Field>
					<Field label="Peso">
						<Input placeholder="Ex: 72kg" {...register("weight")} />
					</Field>
					<Field label="Olhos">
						<Input placeholder="Ex: Verdes" {...register("eyes")} />
					</Field>
					<Field label="Cabelo">
						<Input placeholder="Ex: Negros, longos" {...register("hair")} />
					</Field>
					<Field label="Pele">
						<Input placeholder="Ex: Pálida" {...register("skin")} />
					</Field>
				</div>
				<Field label="Descrição visual">
					<Textarea
						rows={3}
						placeholder="Cicatrizes, vestimentas, postura..."
						{...register("appearance")}
					/>
				</Field>
			</FormSection>
		</>
	);
}
