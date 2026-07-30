import { FileUp, Upload } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { parseCrisCharacterJson } from "@/lib/ordem/cris-importer";
import { useRPGStore } from "@/lib/store";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";

interface CrisImportDialogProps {
	onImportSuccess?: (characterId: string) => void;
	trigger?: React.ReactNode;
}

export function CrisImportDialog({
	onImportSuccess,
	trigger,
}: CrisImportDialogProps) {
	const [open, setOpen] = useState(false);
	const [jsonText, setJsonText] = useState("");
	const [loading, setLoading] = useState(false);
	const toast = useToast();
	const addCharacter = useRPGStore((state) => state.addCharacter);
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);

	function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			if (text) {
				setJsonText(text);
				processImport(text);
			}
		};
		reader.readAsText(file);
	}

	function processImport(textToParse: string) {
		try {
			setLoading(true);
			const parsedData = JSON.parse(textToParse);
			const characterPayload = parseCrisCharacterJson(
				parsedData,
				activeCampaignId ?? "",
			);

			const created = addCharacter(characterPayload);
			if (created?.id) {
				toast.success({
					title: "Ficha do C.R.I.S. importada!",
					description: `O agente "${created.characterName}" foi adicionado com sucesso.`,
				});
				setOpen(false);
				setJsonText("");
				if (onImportSuccess) onImportSuccess(created.id);
			} else {
				toast.error({
					title: "Erro ao salvar agente",
					description: "Não foi possível registrar a ficha no banco.",
				});
			}
		} catch (error) {
			toast.error({
				title: "JSON inválido",
				description:
					"Não foi possível ler o arquivo do C.R.I.S. Verifique a formatação.",
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger ? (
					trigger
				) : (
					<Button variant="outline" size="sm" className="gap-2">
						<FileUp className="h-4 w-4 text-primary" />
						Importar Ficha do C.R.I.S. (.json)
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-lg border-border/80 bg-background/95 backdrop-blur-xl">
				<DialogHeader>
					<DialogTitle className="font-display text-lg flex items-center gap-2">
						<FileUp className="h-5 w-5 text-primary" />
						Importador C.R.I.S. (Ordem Paranormal)
					</DialogTitle>
					<DialogDescription>
						Selecione o arquivo `.json` exportado da plataforma C.R.I.S. ou cole
						o conteúdo abaixo para converter instantaneamente em uma ficha do
						RPG Notes.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-card-elevated/40 p-6 text-center hover:bg-card-elevated/60 transition-colors">
						<Upload className="h-8 w-8 text-primary mb-2" />
						<p className="text-xs font-semibold text-foreground">
							Selecione o arquivo .json do seu computador
						</p>
						<p className="text-[11px] text-muted-foreground mt-1 mb-4">
							Suporta Agentes de Combatente, Especialista e Ocultista
						</p>
						<label className="cursor-pointer">
							<Button variant="secondary" size="sm" type="button" asChild>
								<span>Carregar Arquivo</span>
							</Button>
							<input
								type="file"
								accept=".json,application/json"
								className="sr-only"
								onChange={handleFileUpload}
							/>
						</label>
					</div>

					<div className="relative flex items-center justify-center text-xs text-muted-foreground uppercase tracking-widest my-2">
						<span className="bg-background px-2 z-10">
							ou cole o código JSON
						</span>
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border/60" />
						</div>
					</div>

					<Textarea
						placeholder='{"nome": "Agatha", "nex": 20, "classe": "ocultista"...}'
						value={jsonText}
						onChange={(e) => setJsonText(e.target.value)}
						className="font-mono text-xs h-28 resize-none bg-card/60"
					/>

					<div className="flex justify-end gap-2 pt-2">
						<Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
							Cancelar
						</Button>
						<Button
							size="sm"
							disabled={!jsonText.trim() || loading}
							onClick={() => processImport(jsonText)}
						>
							{loading ? "Importando..." : "Converter e Importar"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
