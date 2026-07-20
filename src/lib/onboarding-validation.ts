/** Shared validation helpers for Mundo → Campanha onboarding. */

export const ONBOARDING_MIN_NAME_LENGTH = 2;
export const ONBOARDING_MAX_NAME_LENGTH = 80;
export const ONBOARDING_MAX_DESC_LENGTH = 500;

export function normalizeOnboardingName(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

export function validateOnboardingName(
	value: string,
	label: string,
): string | null {
	const name = normalizeOnboardingName(value);
	if (!name) return `Informe o ${label}.`;
	if (name.length < ONBOARDING_MIN_NAME_LENGTH) {
		return `O ${label} precisa ter pelo menos ${ONBOARDING_MIN_NAME_LENGTH} caracteres.`;
	}
	if (name.length > ONBOARDING_MAX_NAME_LENGTH) {
		return `O ${label} pode ter no máximo ${ONBOARDING_MAX_NAME_LENGTH} caracteres.`;
	}
	return null;
}
