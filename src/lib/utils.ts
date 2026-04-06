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

/**
 * Parses a potentially invalid date into a safe YYYY-MM-DD format for HTML date inputs.
 * @param dateStr - Date string or Date object from database
 * @returns YYYY-MM-DD string valid for the HTML input picker, or empty string on failure
 */
export function parseSafeDate(dateStr?: Date | string): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.valueOf())) {
            console.warn(`Invalid date value: "${dateStr}"`);
            return "";
        }
        return d.toISOString().split('T')[0];
    } catch (error) {
        console.warn(`Failed to parse date: "${dateStr}"`, error);
        return "";
    }
}

/**
 * Formats a date for display in the UI
 * @param dateStr - Date string or Date object from database
 * @returns Formatted date string (e.g., "Jan 15, 2026") or empty string
 */
export function formatDate(dateStr?: Date | string): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.valueOf())) return "";
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return "";
    }
}

