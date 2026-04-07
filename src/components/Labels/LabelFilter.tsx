/**
 * @file LabelFilter.tsx
 * @description Component for board-wide task filtering by labels.
 * @details Allows users to toggle filters and globally delete labels from all tasks.
 */

"use client";

import LabelChip from "@/components/Labels/LabelChip";
import styles from "./LabelFilter.module.css";

interface LabelFilterProps {
  /** All unique labels available on the board */
  availableLabels: string[];
  /** Labels currently active in the filter */
  selectedLabels: string[];
  /** Callback to toggle a label in the filter set */
  onToggleLabel: (label: string) => void;
  /** Callback to clear all active filters */
  onClear: () => void;
  /** Optional callback to permanently delete a label from all tasks on the board */
  onDeleteGlobalLabel?: (label: string) => void;
}

/**
 * Renders a horizontal bar of labels that can be toggled to filter the board view.
 */
export default function LabelFilter({
  availableLabels,
  selectedLabels,
  onToggleLabel,
  onClear,
  onDeleteGlobalLabel,
}: LabelFilterProps) {
  if (availableLabels.length === 0) {
    return null;
  }

  return (
    <div className={styles.filter_bar}>
      <span className={styles.filter_label}>Filter:</span>
      {availableLabels.map((label) => {
        const isSelected = selectedLabels.includes(label);

        return (
          <LabelChip
            key={label}
            label={label}
            selected={isSelected}
            onClick={() => onToggleLabel(label)}
            removable
            onRemove={() => {
              if (
                onDeleteGlobalLabel &&
                window.confirm(
                  `Are you sure you want to completely remove the label "${label}" from all tasks?`
                )
              ) {
                onDeleteGlobalLabel(label);
              }
            }}
            removeTitle={`Delete "${label}" from all cards on this board`}
          />
        );
      })}
      {selectedLabels.length > 0 && (
        <button onClick={onClear} className={styles.clear_button}>
          Clear
        </button>
      )}
    </div>
  );
}
