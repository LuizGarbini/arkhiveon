import { Link } from "@tanstack/react-router";
import { Home, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";

export function NotFound() {
	return (
		<div className="flex h-[80vh] w-full flex-col items-center justify-center text-center px-4">
			<div className="relative">
				<h1 className="bg-linear-to-b from-foreground to-foreground/20 bg-clip-text text-[120px] font-black leading-none text-transparent sm:text-[180px]">
					404
				</h1>
				{/* Shadow/Reflection effect */}
				<h1 className="absolute inset-0 top-2 -z-10 scale-y-[-1] bg-linear-to-b from-foreground/0 to-foreground/10 bg-clip-text text-[120px] font-black leading-none text-transparent opacity-50 blur-[2px] sm:text-[180px]">
					404
				</h1>
				<div className="absolute inset-0 -z-20 blur-3xl opacity-20 bg-primary" />
			</div>

			<p className="mt-4 max-w-[300px] text-[14px] font-medium text-muted-foreground sm:max-w-md sm:text-[16px]">
				A página que você procura pode ter sido movida ou não existe mais no
				reino.
			</p>

			<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
				<Link to="/">
					<Button className="h-10 gap-2 px-5 font-bold">
						<Home className="h-4 w-4" />
						Voltar ao Início
					</Button>
				</Link>
				<Link to="/dashboard">
					<Button variant="outline" className="h-10 gap-2 px-5 font-bold">
						<LayoutDashboard className="h-4 w-4" />
						Ver Dashboard
					</Button>
				</Link>
			</div>
		</div>
	);
}
