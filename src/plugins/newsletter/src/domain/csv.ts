import { normalizeEmail } from "./security";

export function parseSubscriberCsv(csv: string): string[] {
	const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const start = lines[0]?.toLowerCase() === "email" ? 1 : 0;
	return [...new Set(lines.slice(start).map((line) => normalizeEmail(line.replace(/^"|"$/g, ""))).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))].slice(0, 500);
}

export function subscriberEmailsToCsv(emails: readonly string[]): string {
	return ["email", ...emails.map((email) => `"${email.replaceAll('"', '""')}"`)].join("\r\n");
}
