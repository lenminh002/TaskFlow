"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { Task, ColumnStatus } from "@/type/types";
import styles from "./Card.module.css";
import Modal from "@/components/Modal/Modal";
import modalStyles from "@/components/Modal/Modal.module.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, getPriorityLabel } from "@/lib/constants";
import { parseSafeDate, formatDate } from "@/lib/utils";
import CommentSection from "@/components/CommentSection/CommentSection";

/**
 * @file Card.tsx
 * @description Draggable task card with an editable detail modal.
 * @details Wraps the generic card markup with @dnd-kit's useSortable hook, enabling physical dragging semantics, CSS transforms, and sorting listeners.
 */

/**
 * Interface configuring the Card component rendering and interactions.
 * @param task - The full Task object supplying rendering data (title, status, due date, etc).
 * @param onClick - Interceptor callback fired when the card is clicked (prior to the default modal open).
 * @param onUpdateCard - Callback fired when the user modifies data inside the modal.
 * @param onRemoveCard - Callback fired when the user clicks the delete (X) badge.
 */
interface CardProps {
    task?: Task;
    teamMembers?: { id: string, username: string }[];
    onClick?: () => void;
    onUpdateCard?: (id: string, updates: Partial<Task>) => void;
    onRemoveCard?: (id: string) => void;
}

export default function Card({ task, teamMembers = [], onClick, onUpdateCard, onRemoveCard }: CardProps) {
    const { isOpen, open, close } = useModal();
    const title = task?.name ?? "Task";
    const [localName, setLocalName] = useState(task?.name || "Task");
    const [localDesc, setLocalDesc] = useState(task?.description || "");
    const [localPriority, setLocalPriority] = useState(task?.priority || "");
    const [localStatus, setLocalStatus] = useState<ColumnStatus>(task?.status || "todo");
    const [localAssigneeId, setLocalAssigneeId] = useState(task?.assigneeId || "");
    const [localDueDate, setLocalDueDate] = useState(parseSafeDate(task?.dueDate));

    // Connects the component to the dnd-kit Sortable ecosystem.
    // 'attributes' and 'listeners' govern keyboard accessibility and pointer interactions.
    // 'transform' maps the physical layout shift coordinates while 'isDragging' gives conditional opacity styling.
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

    /**
     * Modal Lifecycle Hook: Whenever the user opens the modal or the parent `task` prop changes,
     * this hook forcefully overrides the temporary modal inputs with the most up-to-date accurate database data.
     * This solves "stale state" issues if you open the modal quickly after another computer updated the same card.
     */
    useEffect(() => {
        if (isOpen) {
            setLocalName(task?.name || "Task");
            setLocalDesc(task?.description || "");
            setLocalPriority(task?.priority || "");
            setLocalStatus(task?.status || "todo");
            setLocalAssigneeId(task?.assigneeId || ""); // Tracks UUID delegates structurally against `board_members`
            setLocalDueDate(parseSafeDate(task?.dueDate));
        }
    }, [isOpen, task]);

    useEscapeKey(close, isOpen);

    /**
     * Intercepts the Card click. 
     * Since the card is technically a draggable dnd-kit zone, we safely invoke the modal open 
     * programmatically to prevent colliding drag behaviors.
     */
    const handleOpen = () => {
        onClick?.();
        open();
    };

    /**
     * Triggered inside the Modal when the user hits "Save Changes".
     * Validates the ID exists, constructs a subset Partial<Task> payload mapping to the inputs,
     * fires it up the tree to `onUpdateCard`, and visually slides the modal closed immediately.
     */
    const handleSave = () => {
        if (task?.id && onUpdateCard) {
            const selectedMember = teamMembers.find(m => m.id === localAssigneeId);
            onUpdateCard(task.id, {
                name: localName.trim() || "Untitled Task",
                description: localDesc,
                priority: (localPriority || "") as any,
                status: localStatus,
                assigneeId: localAssigneeId || "",
                assigneeName: selectedMember ? selectedMember.username : undefined,
                dueDate: localDueDate ? new Date(localDueDate) : "" as any
            });
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
                    {/* Delegation Input Box: mapped natively via props combining active names with their database UUID relationships */}
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
            {/* 
              Physical Card Node: 
              - `ref` attaches the node to dnd-kit for collision measurements.
              - `style` applies the X/Y drag matrix transforms dynamically.
              - `attributes/listeners` bind the mouse/touch drag events to this exact div.
            */}
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={styles.card}
                onClick={handleOpen}
            >
                {/* Visual Header & Delete Action */}
                <div className={styles.card_header}>
                    <h3>{title}</h3>
                    {/* The pointer down stopPropagation prevents a drag sequence triggering when aggressively clicking delete */}
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

                {/* Content Area & Metadata Bubbles */}
                <div className={styles.card_content}>
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

            {/* Renders the full-screen edit modal if `isOpen` is natively toggled true via handleOpen */}
            {modal}
        </>
    );
}
