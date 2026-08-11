export interface PaywallGate {
	blocked: boolean;
	message: string;
	checkoutUrl: string;
}

/**
 * Server-side hard-paywall check for a public content page.
 *
 * Without this, a page's full HTML is always streamed and the paywall
 * plugin's client-side overlay (tracker.ts) only *hides* it visually — a
 * fetch of the page still returns the protected content. This calls the
 * paywall's own public API route (the documented integration surface, the
 * same one its client tracker already calls) rather than reaching into the
 * plugin's private KV/storage.
 *
 * Only "hard" mode withholds content server-side; soft/metered stay
 * client-side nudges, matching the plugin's own shouldBlock() rules.
 */
export async function getPaywallGate(
	origin: string,
	path: string,
	customerId: string,
): Promise<PaywallGate> {
	try {
		const accessUrl = new URL("/_emdash/api/plugins/cannelle-paywall/access", origin);
		accessUrl.searchParams.set("path", path);
		accessUrl.searchParams.set("visitorId", "ssr");
		if (customerId) accessUrl.searchParams.set("customerId", customerId);
		const response = await fetch(accessUrl);
		if (!response.ok) return { blocked: false, message: "", checkoutUrl: "" };
		const data = await response.json();
		return {
			blocked: data?.protected === true && data?.mode === "hard" && Boolean(data?.blocked),
			message: typeof data?.message === "string" ? data.message : "",
			checkoutUrl: typeof data?.checkoutUrl === "string" ? data.checkoutUrl : "",
		};
	} catch {
		// Route unreachable: fail open — we can't confirm the plugin is even
		// enabled, and this must never be the reason a normal page 500s.
		return { blocked: false, message: "", checkoutUrl: "" };
	}
}
