/**
 * @file LabelChip.tsx
 * @description Presentational component for displaying individual task labels.
 * @details Can be rendered as a static badge or an interactive, removable tag.
 */

"use client";

import styles from "./LabelChip.module.css";

/**
 * Props for the LabelChip component.
 */
interface LabelChipProps {
    /** The text content of the label */
    label: string;
    /** Whether the label is selected (affects visual styling) */
    selected?: boolean;
    /** Whether to show a removal ('X') button */
    removable?: boolean;
    /** Click handler for selecting/toggling the label */
    onClick?: () => void;
    /** Callback function to trigger when the removal button is clicked */
    onRemove?: () => void;
    /** Accessibility title for the removal button */
    removeTitle?: string;
}

/**
 * Renders a rounded chip used for task labels.
 */
export default function LabelChip({
    label,
    selected = false,
    removable = false,
    onClick,
    onRemove,
    removeTitle,
}: LabelChipProps) {
    const chipClasses = `${styles.chip} ${selected ? styles.chip_selected : ""}`;
    const buttonClasses = `${styles.label_button} ${onClick ? styles.label_button_clickable : ""} ${selected ? styles.label_button_selected : ""}`;
    const removeClasses = `${styles.remove_button} ${selected ? styles.remove_button_selected : ""}`;

    return (
        <div className={chipClasses}>
            <button
                type="button"
                onClick={onClick}
                className={buttonClasses}
            >
                {label}
            </button>

            {removable && onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    title={removeTitle}
                    className={removeClasses}
                >
                    ×
                </button>
            )}
        </div>
    );
}
