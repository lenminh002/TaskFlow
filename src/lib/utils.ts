/**
 * @file utils.ts
 * @description General reusable utility functions.
 */

/**
 * Beautifies standard database string labels.
 * Example: "in_progress" -> "in progress"
 */
export function formatStatusLabel(statusString: string | undefined | null): string {
    if (!statusString) return "—";
    return statusString.replace(/_/g, " ");
}
