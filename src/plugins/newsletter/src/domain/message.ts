function escapeHtml(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function trackedHtml(text: string, origin: string, trackingToken: string, unsubscribeToken: string): string {
	const escaped = escapeHtml(text);
	const linked = escaped.replace(/https?:\/\/[^\s<]+/g, (url) => {
		const destination = url.replace(/&amp;/g, "&");
		return `<a href="${escapeHtml(`${origin}/_cannelle/click?token=${encodeURIComponent(trackingToken)}&url=${encodeURIComponent(destination)}`)}">${url}</a>`;
	});
	const unsubscribe = `${origin}/_emdash/api/plugins/cannelle-newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
	const pixel = `${origin}/_emdash/api/plugins/cannelle-newsletter/open?token=${encodeURIComponent(trackingToken)}`;
	return `<div>${linked.replaceAll("\n", "<br>")}</div><p><a href="${escapeHtml(unsubscribe)}">Se désinscrire</a></p><img src="${escapeHtml(pixel)}" alt="" width="1" height="1" style="display:none">`;
}
