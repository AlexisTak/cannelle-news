import { definePlugin, type PluginDescriptor } from "emdash";

export const CANNELLE_ADMIN_HUB_ID = "cannelle-admin-hub";

export function cannelleAdminHubPlugin(): PluginDescriptor {
	return { id: CANNELLE_ADMIN_HUB_ID, version: "0.1.0", format: "native", entrypoint: "@cannelle/plugin-admin-hub", adminEntry: "@cannelle/plugin-admin-hub/admin", adminPages: [{ path: "/overview", label: "Centre Cannelle", icon: "grid" }] };
}

export function createPlugin() {
	return definePlugin({ id: CANNELLE_ADMIN_HUB_ID, version: "0.1.0", admin: { entry: "@cannelle/plugin-admin-hub/admin", pages: [{ path: "/overview", label: "Centre Cannelle", icon: "grid" }] } });
}
