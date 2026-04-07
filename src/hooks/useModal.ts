/**
 * @file useModal.ts
 * @description Custom React hook for managing Boolean-based toggle states, optimized for Modal components.
 */

import { useState, useCallback } from "react";

/**
 * Custom hook for managing modal state
 * @param initialState - Initial open/closed state (default: false)
 */
export function useModal(initialState: boolean = false) {
    const [isOpen, setIsOpen] = useState(initialState);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    return {
        isOpen,
        open,
        close,
        toggle,
        setIsOpen,
    };
}
