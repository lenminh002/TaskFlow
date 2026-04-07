/**
 * @file utils.ts
 * @description General reusable utility functions.
 */



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

/**
 * Generates a stable HSL color based on the label text string.
 * @param label - The label text to hash.
 * @returns An object with backgroundColor and color (text) in HSL format.
 */
export function getLabelColor(label: string) {
    const hash = label.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const hue = Math.abs(hash) % 360;

    return {
        backgroundColor: `hsl(${hue}, 70%, 90%)`,
        color: `hsl(${hue}, 80%, 25%)`,
    };
}

