import { useEffect, useRef } from 'react';

/**
 * Automatically puts the user's cursor inside a text box as soon as it appears.
 * @param condition - When this is true (like when a popup opens), the cursor jumps to the input.
 * @param delayMs - A tiny wait time (defaults to 50ms) to ensure the popup finishes appearing first.
 * @returns A ref to attach to the <input> element.
 */
export function useAutoFocus<T extends HTMLElement>(condition: boolean, delayMs = 50) {
    const inputRef = useRef<T>(null);

    useEffect(() => {
        if (condition) {
            // A short delay is required here because React Portals (which we use for modals) 
            // take a fraction of a millisecond to physically mount the node into the DOM.
            // If we fire .focus() instantly, the input element won't exist yet!
            const timeoutId = setTimeout(() => inputRef.current?.focus(), delayMs);

            // Cleanup the timeout if the component unmounts before the delay finishes
            return () => clearTimeout(timeoutId);
        }
    }, [condition, delayMs]);

    return inputRef;
}
