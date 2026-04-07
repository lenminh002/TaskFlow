/**
 * @file TaskLabelEditor.tsx
 * @description Component for managing task-specific labels.
 * @details Allows users to select existing board-wide labels or create new ones for the current task.
 */

"use client";

import LabelChip from "@/components/Labels/LabelChip";
import modalStyles from "@/components/Modal/Modal.module.css";

import styles from "./TaskLabelEditor.module.css";

/**
 * Props for the TaskLabelEditor component.
 */
interface TaskLabelEditorProps {
    /** Labels that already exist on the board */
    availableLabels: string[];
    /** Labels currently assigned to the task */
    selectedLabels: string[];
    /** Input value for the "new label" field */
    inputValue: string;
    /** Callback to update the input field state */
    onInputChange: (value: string) => void;
    /** Callback to persist label assignments to the task model */
    onLabelsChange: (labels: string[]) => void;
}

function addLabel(labels: string[], label: string) {
    if (!label || labels.includes(label)) {
        return labels;
    }

    return [...labels, label];
}

/**
 * Renders an interactive label editor with a search/create bar and a list of togglable chips.
 */
export default function TaskLabelEditor({
    availableLabels,
    selectedLabels,
    inputValue,
    onInputChange,
    onLabelsChange,
}: TaskLabelEditorProps) {
    const mergedLabels = Array.from(new Set([...availableLabels, ...selectedLabels])).sort();

    function handleCreateLabel() {
        const trimmed = inputValue.trim();
        if (!trimmed) {
            return;
        }

        onLabelsChange(addLabel(selectedLabels, trimmed));
        onInputChange("");
    }

    return (
        <div className={modalStyles.modal_field}>
            <span className={modalStyles.modal_label}>Labels</span>

            <div className={styles.label_list}>
                {mergedLabels.map((label) => {
                    const isSelected = selectedLabels.includes(label);

                    return (
                        <LabelChip
                            key={label}
                            label={label}
                            selected={isSelected}
                            onClick={() => {
                                if (!isSelected) {
                                    onLabelsChange([...selectedLabels, label]);
                                }
                            }}
                            removable={isSelected}
                            onRemove={() => onLabelsChange(selectedLabels.filter((item) => item !== label))}
                            removeTitle={`Remove "${label}" from this card`}
                        />
                    );
                })}
            </div>

            <div className={styles.input_group}>
                <input
                    type="text"
                    className={modalStyles.modal_input}
                    placeholder="Create new label..."
                    value={inputValue}
                    onChange={(event) => onInputChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            handleCreateLabel();
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={handleCreateLabel}
                    className={styles.add_button}
                    disabled={!inputValue.trim()}
                >
                    Add
                </button>
            </div>
        </div>
    );
}
