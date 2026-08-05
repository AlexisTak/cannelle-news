export function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
export async function hashValue(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function createToken(): string { return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", ""); }
