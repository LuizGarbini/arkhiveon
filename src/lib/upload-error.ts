/**
 * Turns an image upload failure into a message for the person uploading.
 * Shared by the image storage layer; pure so it can be tested.
 */

export const UPLOAD_NETWORK_MESSAGE =
	"Falha de rede ao enviar a imagem. Confira sua conexão e tente de novo.";

export function describeUploadFailure(
	status: number | undefined,
	serverMessage: string | undefined,
): string {
	const message = serverMessage ?? "";
	if (status === 413 || /exceeds maximum|too large/i.test(message)) {
		return "A imagem ficou grande demais para enviar (máx. 5 MB depois de otimizada). Use um arquivo menor.";
	}
	if (status === 429 || /rate limit/i.test(message)) {
		return "Aguarde alguns segundos antes de enviar outra imagem.";
	}
	if (/quota/i.test(message)) {
		return "O armazenamento da campanha está cheio. Libere espaço na Biblioteca de imagens.";
	}
	if (status === 401 || /unauthorized/i.test(message)) {
		return "Sessão expirada. Entre de novo para enviar imagens.";
	}
	if (status === 403) {
		return "Você não tem permissão para enviar imagens nesta campanha.";
	}
	return "Não foi possível enviar a imagem. Tente de novo.";
}

/** True for the error a cancelled upload ends with. */
export function isUploadAbort(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}

export function uploadAbortError(): Error {
	const error = new Error("Envio cancelado.");
	error.name = "AbortError";
	return error;
}
