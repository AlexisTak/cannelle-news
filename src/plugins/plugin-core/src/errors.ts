export type CannelleErrorCode =
	| "validation_failed"
	| "permission_denied"
	| "not_found"
	| "conflict"
	| "rate_limited"
	| "internal_error";

export interface PublicError {
	code: CannelleErrorCode;
	message: string;
	details?: Record<string, unknown>;
}

export class CannelleError extends Error {
	constructor(
		readonly code: CannelleErrorCode,
		message: string,
		readonly status: number,
		readonly details?: Record<string, unknown>,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "CannelleError";
	}

	toPublic(): PublicError {
		return {
			code: this.code,
			message: this.message,
			...(this.details ? { details: this.details } : {}),
		};
	}
}

export function normalizeError(error: unknown): CannelleError {
	if (error instanceof CannelleError) return error;
	return new CannelleError("internal_error", "Une erreur interne est survenue.", 500, undefined, {
		cause: error,
	});
}
