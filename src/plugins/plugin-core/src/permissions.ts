export const CANNELLE_PERMISSIONS = [
	"cannelle.forms.view",
	"cannelle.forms.create",
	"cannelle.forms.update",
	"cannelle.forms.publish",
	"cannelle.forms.delete",
	"cannelle.forms.submissions.view",
	"cannelle.forms.submissions.export",
	"cannelle.forms.submissions.delete",
	"cannelle.forms.integrations.manage",
	"cannelle.forms.security.manage",
	"cannelle.analytics.dashboard.view",
	"cannelle.analytics.reports.view",
	"cannelle.analytics.data.export",
	"cannelle.analytics.goals.manage",
	"cannelle.analytics.funnels.manage",
	"cannelle.analytics.privacy.manage",
	"cannelle.newsletter.subscribers.view",
	"cannelle.newsletter.subscribers.manage",
	"cannelle.newsletter.subscribers.import",
	"cannelle.newsletter.subscribers.export",
	"cannelle.newsletter.campaigns.create",
	"cannelle.newsletter.campaigns.update",
	"cannelle.newsletter.campaigns.schedule",
	"cannelle.newsletter.campaigns.send",
	"cannelle.newsletter.automations.manage",
	"cannelle.newsletter.providers.manage",
	"cannelle.newsletter.consents.manage",
] as const;

export type CannellePermission = (typeof CANNELLE_PERMISSIONS)[number];
export type PermissionGrant = CannellePermission | "cannelle.*" | `cannelle.${string}.*`;

export function hasPermission(
	grants: ReadonlySet<PermissionGrant> | readonly PermissionGrant[],
	required: CannellePermission,
): boolean {
	const available = grants instanceof Set ? grants : new Set(grants);
	if (available.has(required) || available.has("cannelle.*")) return true;

	const segments = required.split(".");
	for (let index = segments.length - 1; index >= 2; index -= 1) {
		if (available.has(`${segments.slice(0, index).join(".")}.*` as PermissionGrant)) return true;
	}
	return false;
}

export function requirePermission(
	grants: ReadonlySet<PermissionGrant> | readonly PermissionGrant[],
	required: CannellePermission,
): void {
	if (!hasPermission(grants, required)) {
		throw new PermissionDeniedError(required);
	}
}

export class PermissionDeniedError extends Error {
	readonly code = "permission_denied";

	constructor(readonly permission: CannellePermission) {
		super(`Missing permission: ${permission}`);
		this.name = "PermissionDeniedError";
	}
}
