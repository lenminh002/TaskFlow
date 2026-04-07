/**
 * @file Card.tsx
 * @description Individual Kanban task card component.
 * @details Handles task display, drag-and-drop registration via dnd-kit, and opens the task detail modal.
 */

"use client";

import { useState } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { Task, ColumnStatus, TaskPriority } from "@/type/types";
import TaskLabelEditor from "@/components/Labels/TaskLabelEditor";
import styles from "./Card.module.css";
import Modal from "@/components/Modal/Modal";
import modalStyles from "@/components/Modal/Modal.module.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, getPriorityLabel } from "@/lib/constants";
import { parseSafeDate, formatDate, getLabelColor } from "@/lib/utils";
import CommentSection from "@/components/CommentSection/CommentSection";

/**
 * Props for the Card component.
 */
interface CardProps {
    /** The task data to display */
    task?: Task;
    /** List of all potential assignees for the task */
    teamMembers?: { id: string, username: string }[];
    /** List of existing labels across the board for selection */
    boardLabels?: string[];
    /** Optional click handler for analytics or parent state tracking */
    onClick?: () => void;
    /** Callback to persist task changes to the backend */
    onUpdateCard?: (id: string, updates: Partial<Task>) => void;
    /** Callback to delete the task */
    onRemoveCard?: (id: string) => void;
}


/**
 * Constructs a partial Task update payload from local component state.
 */
function getTaskUpdatePayload(task: Task, values: {
    localName: string;
    localDesc: string;
    localPriority: string;
    localStatus: ColumnStatus;
    localAssigneeId: string;
    localDueDate: string;
    localLabels: string[];
    teamMembers: { id: string; username: string }[];
}) {
    const selectedMember = values.teamMembers.find((member) => member.id === values.localAssigneeId);
    const priority = values.localPriority === "" ? undefined : values.localPriority as TaskPriority;
    const dueDate = values.localDueDate ? new Date(values.localDueDate) : undefined;

    return {
        name: values.localName.trim() || "Untitled Task",
        description: values.localDesc,
        priority,
        status: values.localStatus,
        assigneeId: values.localAssigneeId || "",
        assigneeName: selectedMember ? selectedMember.username : undefined,
        dueDate,
        labels: values.localLabels,
    } satisfies Partial<Task>;
}

/**
 * The Card component represents a single task in a column.
 * It integrates with `@dnd-kit/sortable` for reordering.
 */
export default function Card({ task, teamMembers = [], boardLabels = [], onClick, onUpdateCard, onRemoveCard }: CardProps) {
    const { isOpen, open, close } = useModal();
    const title = task?.name ?? "Task";
    const [localName, setLocalName] = useState(task?.name || "Task");
    const [localDesc, setLocalDesc] = useState(task?.description || "");
    const [localPriority, setLocalPriority] = useState(task?.priority || "");
    const [localStatus, setLocalStatus] = useState<ColumnStatus>(task?.status || "todo");
    const [localAssigneeId, setLocalAssigneeId] = useState(task?.assigneeId || "");
    const [localDueDate, setLocalDueDate] = useState(parseSafeDate(task?.dueDate));
    const [localLabels, setLocalLabels] = useState<string[]>(task?.labels || []);
    const [labelInput, setLabelInput] = useState("");

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task?.id || "",
        data: {
            type: "Task",
            task,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    useEscapeKey(close, isOpen);

    function resetLocalState() {
        setLocalName(task?.name || "Task");
        setLocalDesc(task?.description || "");
        setLocalPriority(task?.priority || "");
        setLocalStatus(task?.status || "todo");
        setLocalAssigneeId(task?.assigneeId || "");
        setLocalDueDate(parseSafeDate(task?.dueDate));
        setLocalLabels(task?.labels || []);
        setLabelInput("");
    }

    const handleOpen = () => {
        resetLocalState();
        onClick?.();
        open();
    };

    const handleSave = () => {
        if (task?.id && onUpdateCard) {
            onUpdateCard(task.id, getTaskUpdatePayload(task, {
                localName,
                localDesc,
                localPriority,
                localStatus,
                localAssigneeId,
                localDueDate,
                localLabels,
                teamMembers,
            }));
        }

        close();
    };

    const modal = (
        <Modal isOpen={isOpen} onClose={close} title={title}>
            <div className={modalStyles.modal_split_layout}>
                {/* Left Column: Edit form mapped directly to the active task's local state hook. */}
                <div className={modalStyles.modal_body}>
                    <div className={modalStyles.modal_field}>
                        <span className={modalStyles.modal_label}>Title</span>
                        <input type="text" className={modalStyles.modal_input} value={localName} onChange={(e) => setLocalName(e.target.value)} />
                    </div>
                    <div className={modalStyles.modal_field}>
                        <span className={modalStyles.modal_label}>Description</span>
                        <textarea className={modalStyles.modal_textarea} value={localDesc} placeholder="Add a more detailed description..." onChange={(e) => setLocalDesc(e.target.value)} />
                    </div>
                    <TaskLabelEditor
                        availableLabels={boardLabels}
                        selectedLabels={localLabels}
                        inputValue={labelInput}
                        onInputChange={setLabelInput}
                        onLabelsChange={setLocalLabels}
                    />
                    <div className={modalStyles.modal_field}>
                        <span className={modalStyles.modal_label}>Priority</span>
                        <select className={modalStyles.modal_select} value={localPriority} onChange={(e) => setLocalPriority(e.target.value)}>
                            {PRIORITY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className={modalStyles.modal_field}>
                        <span className={modalStyles.modal_label}>Status</span>
                        <select className={modalStyles.modal_select} value={localStatus} onChange={(e) => setLocalStatus(e.target.value as ColumnStatus)}>
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className={modalStyles.modal_field}>
                        <span className={modalStyles.modal_label}>Assign To</span>
                        <select className={modalStyles.modal_select} value={localAssigneeId} onChange={(e) => setLocalAssigneeId(e.target.value)}>
                            <option value="">Unassigned</option>
                            {teamMembers.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.username} ({member.id})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={modalStyles.modal_field}>
                        <span className={modalStyles.modal_label}>Due Date</span>
                        <input type="date" className={modalStyles.modal_input} value={localDueDate} onChange={(e) => setLocalDueDate(e.target.value)} />
                    </div>
                    <div className={modalStyles.modal_field}>
                        <span className={modalStyles.modal_label}>Created</span>
                        <p>{formatDate(task?.createdAt) || "—"}</p>
                    </div>
                    <hr className={modalStyles.modal_hr} />
                    <button className={modalStyles.modal_submit} onClick={handleSave}>Save Changes</button>
                </div>

                {/* Right Column: Comments Section */}
                {task?.id && (
                    <CommentSection taskId={task.id} />
                )}
            </div>
        </Modal>
    );

    if (!task?.id) {
        return (
            <div className={styles.card}>
                <div className={styles.card_header}><h3>{title}</h3></div>
            </div>
        );
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={styles.card}
                onClick={handleOpen}
            >
                <div className={styles.card_header}>
                    <h3>{title}</h3>
                    <button
                        className={styles.card_close}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (task?.id && onRemoveCard) onRemoveCard(task.id);
                        }}
                    >
                        ×
                    </button>
                </div>
                <br />
                <hr />

                <div className={styles.card_content}>
                    {task?.labels && task.labels.length > 0 && (
                        <div className={styles.card_labels}>
                            {task.labels.map((label) => (
                                <span key={label} className={styles.card_label_chip} style={getLabelColor(label)}>
                                    {label}
                                </span>
                            ))}
                        </div>
                    )}
                    {task?.description
                        ? <p className={styles.card_description}>{task.description}</p>
                        : <p className={styles.card_description}>No description</p>
                    }
                    <div className={styles.card_meta}>
                        {task?.assigneeName && <span className={styles.card_tag}>👤 {task.assigneeName}</span>}
                        {task?.assigneeId && !task.assigneeName && <span className={styles.card_tag}>👤 Assigned</span>}
                        {task?.priority && <span className={styles.card_tag}>{getPriorityLabel(task.priority)}</span>}
                        {task?.dueDate && <span className={styles.card_tag}>📅 Due: {formatDate(task.dueDate)}</span>}
                    </div>
                </div>
            </div>

            {modal}
        </>
    );
}
