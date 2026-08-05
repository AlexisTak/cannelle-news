import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";

interface RateState { count: number; resetAt: number }

function clientIp(routeCtx: SandboxedRouteContext): string {
	const meta = routeCtx.requestMeta;
	if (meta && typeof meta === "object" && "ip" in meta && typeof meta.ip === "string") return meta.ip;
	return "unknown";
}

async function digest(value: string): Promise<string> {
	const bytes = new TextEncoder().encode(value);
	const hash = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function consumeSubmissionQuota(
	routeCtx: SandboxedRouteContext,
	ctx: PluginContext,
	formId: string,
	now = Date.now(),
): Promise<{ allowed: boolean; retryAfter: number }> {
	const limit = (await ctx.kv.get<number>("settings:submissionRateLimit")) ?? 10;
	const windowSeconds = (await ctx.kv.get<number>("settings:submissionRateWindowSeconds")) ?? 600;
	const key = `rate:submit:${formId}:${await digest(clientIp(routeCtx))}`;
	const current = await ctx.kv.get<RateState>(key);
	const state = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowSeconds * 1000 } : current;
	if (state.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((state.resetAt - now) / 1000)) };
	await ctx.kv.set(key, { ...state, count: state.count + 1 });
	return { allowed: true, retryAfter: 0 };
}
