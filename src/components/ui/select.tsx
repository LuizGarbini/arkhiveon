import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `<select>` nativo estilizado. Resolve dois problemas comuns no dark
 * mode: as opções serem renderizadas pelo SO (claras demais) e o cursor
 * de chevron sumir.
 *
 * Nota: a cor das `<option>` em alguns navegadores é controlada pelo
 * próprio SO. Forçamos `color-scheme: dark` no select pra que o popup
 * nativo respeite o tema.
 */
function Select({
	className,
	children,
	...props
}: React.ComponentProps<"select">) {
	return (
		<select
			data-slot="select"
			className={cn(
				"h-10 w-full appearance-none rounded-lg border border-border dark:bg-input/10 bg-background px-3 py-1.5 pr-8 text-[16px] md:text-sm text-foreground shadow-xs transition-colors outline-none [color-scheme:dark] focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
				"bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%23a1a1aa%22><path d=%22M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z%22/></svg>')] bg-[length:14px_14px] bg-[right_0.6rem_center] bg-no-repeat",
				className,
			)}
			{...props}
		>
			{/* Forçamos cores nas options — em alguns navegadores o estilo do
			   <option> é ignorado, mas onde funciona melhora a legibilidade. */}
			{React.Children.map(children, (child) => {
				if (
					!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(
						child,
					)
				)
					return child;
				if (child.type !== "option") return child;
				return React.cloneElement(child, {
					...child.props,
					className: cn(
						"bg-[oklch(0.18_0.015_285)] text-foreground",
						child.props.className,
					),
				});
			})}
		</select>
	);
}

export { Select };
