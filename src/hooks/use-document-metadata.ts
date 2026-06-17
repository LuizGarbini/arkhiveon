import { useEffect } from "react";

export function useDocumentMetadata(
	title: string,
	description: string,
	indexable = true,
) {
	useEffect(() => {
		document.title = title;

		const metaDescription = document.querySelector('meta[name="description"]');
		if (metaDescription) {
			metaDescription.setAttribute("content", description);
		}

		let robotsMeta = document.querySelector('meta[name="robots"]');
		if (!robotsMeta) {
			robotsMeta = document.createElement("meta");
			robotsMeta.setAttribute("name", "robots");
			document.head.appendChild(robotsMeta);
		}
		robotsMeta.setAttribute(
			"content",
			indexable ? "index, follow" : "noindex, nofollow",
		);
	}, [title, description, indexable]);
}
