/** Como as abas da ficha da mesa rolam: tudo vai para o chat da mesa. */
export interface SheetRolls {
	/** Há uma rolagem esperando o servidor: os botões ficam desabilitados. */
	rolling: boolean;
	/**
	 * Teste de d20 com modificador ("Atletismo", "Ataque"). `chatLabel` é o nome
	 * no cartão do chat quando difere do que aparece no dado (FOR → Força).
	 */
	check: (label: string, modifier: number, chatLabel?: string) => void;
	/** Fórmula de dados ("1d6+6"), por exemplo o dano de uma arma. */
	formula: (label: string, formula: string) => void;
}
