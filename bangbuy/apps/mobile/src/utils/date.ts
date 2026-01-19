/**
 * Date Utilities for iOS Compatibility
 * 
 * iOS JavaScript engine (JavaScriptCore) is stricter with date parsing than Chrome (V8).
 * It often fails with "Invalid Date" for format like "YYYY-MM-DD HH:mm:ss".
 * This utility ensures safe parsing by converting to ISO 8601 format.
 */

/**
 * Safely parses a date string into a Date object.
 * Handles common non-ISO formats that cause crashes on iOS.
 * Dependency-free implementation to ensure stability.
 */
export function safeParseDate(dateString?: string | number | Date | null): Date | null {
    if (!dateString) return null;

    if (dateString instanceof Date) {
        return isNaN(dateString.getTime()) ? null : dateString;
    }

    // Handle timestamp
    if (typeof dateString === 'number') {
        return new Date(dateString);
    }

    // Handle string
    let cleanString = dateString.trim();

    // Fix "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss" for iOS
    // Regex looks for "YYYY-MM-DD HH:mm:ss" pattern
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(cleanString)) {
        cleanString = cleanString.replace(' ', 'T');
    } else if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(cleanString)) {
        // Handle "YYYY-MM-DD HH:mm"
        cleanString = cleanString.replace(' ', 'T');
    }

    // Handle "YYYY/MM/DD" -> "YYYY-MM-DD"
    if (cleanString.includes('/')) {
        cleanString = cleanString.replace(/\//g, '-');
    }

    const date = new Date(cleanString);

    if (isNaN(date.getTime())) {
        console.warn('[safeParseDate] Failed to parse date:', dateString);
        return null;
    }

    return date;
}

/**
 * Formats a date range safely.
 * @param startDate Start date string/obj
 * @param endDate End date string/obj
 * @returns Formatted string "MM/DD - MM/DD" or "MM/DD"
 */
export function formatDateRange(startDate?: string | Date | null, endDate?: string | Date | null): string {
    const start = safeParseDate(startDate);
    const end = safeParseDate(endDate);

    if (!start) return '';

    const startStr = `${start.getMonth() + 1}/${start.getDate()}`;

    if (!end) return startStr;

    const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
    return `${startStr} - ${endStr}`;
}
