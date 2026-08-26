import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SYSTEM_CONFIG } from "@/lib/systems";
import type { CharacterRegister } from "../types";

export function SystemFields({ register }: { register: CharacterRegister }) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field label="Sistema">
				<Select {...register("system")}>
					{Object.values(SYSTEM_CONFIG).map((system) => (
						<option key={system.value} value={system.value}>
							{system.label}
						</option>
					))}
				</Select>
			</Field>
			<Field label="Nome do jogador">
				<Input
					placeholder="Quem joga este personagem"
					{...register("playerName")}
				/>
			</Field>
		</div>
	);
}
