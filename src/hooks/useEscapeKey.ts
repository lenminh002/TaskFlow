import { useEffect } from "react";

/**
 * Custom hook to handle Escape key press
 * @param callback - Function to call when Escape is pressed
 * @param isActive - Whether the hook should be active (default: true)
 */
export function useEscapeKey(callback: () => void, isActive: boolean = true) {
    useEffect(() => {
        if (!isActive) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                callback();
            }
        };

        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
        };
    }, [callback, isActive]);
}
