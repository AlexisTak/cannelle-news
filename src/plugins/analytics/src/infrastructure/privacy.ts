import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";

function requestIp(routeCtx: SandboxedRouteContext): string {
	const meta = routeCtx.requestMeta;
	return meta && typeof meta === "object" && "ip" in meta && typeof meta.ip === "string" ? meta.ip : "unknown";
}

export async function dailyVisitorId(routeCtx: SandboxedRouteContext, ctx: PluginContext, date: string, userAgent: string): Promise<string> {
	let secret = await ctx.kv.get<string>("state:visitorSecret");
	if (!secret) {
		secret = crypto.randomUUID();
		await ctx.kv.set("state:visitorSecret", secret);
	}
	const input = new TextEncoder().encode(`${secret}:${date}:${requestIp(routeCtx)}:${userAgent.slice(0, 500)}`);
	const digest = await crypto.subtle.digest("SHA-256", input);
	return [...new Uint8Array(digest)].slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function requestCountry(routeCtx: SandboxedRouteContext): string | undefined {
	const meta = routeCtx.requestMeta;
	if (!meta || typeof meta !== "object" || !("geo" in meta) || !meta.geo || typeof meta.geo !== "object") return undefined;
	return "country" in meta.geo && typeof meta.geo.country === "string" ? meta.geo.country.slice(0, 2).toUpperCase() : undefined;
}
