export function assertMethod(actual: string, expected: string): void {
	if (actual.toUpperCase() !== expected) {
		throw new Response(JSON.stringify({ error: { code: "method_not_allowed", message: "Méthode non autorisée." } }), {
			status: 405,
			headers: { "Content-Type": "application/json", Allow: expected },
		});
	}
}

export function jsonError(status: number, code: string, message: string, details?: unknown): Response {
	return new Response(JSON.stringify({ error: { code, message, ...(details ? { details } : {}) } }), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
