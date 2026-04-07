/**
 * @file useEscapeKey.ts
 * @description Custom React hook to capture and respond to the "Escape" key press globally.
 * @details Primarily used for closing modals or canceling active inline edits.
 */

import { useEffect, useRef } from "react";

/**
 * Custom hook to handle Escape key press.
 * Uses a ref to avoid stale closures — the listener always calls the latest callback
 * without needing to re-register the event on every render.
 * 
 * @param callback - Function to call when Escape is pressed.
 * @param isActive - Whether the hook should be active (default: true).
 */
export function useEscapeKey(callback: () => void, isActive: boolean = true) {
    // Store the latest callback in a ref so the event listener never goes stale.
    const callbackRef = useRef(callback);
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        // SSR guard: `document` does not exist on the server.
        if (typeof document === "undefined") return;
        if (!isActive) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                callbackRef.current();
            }
        };

        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
        };
    }, [isActive]); // Only re-run when isActive changes, not on every callback change.
}
