"use client";

import { useState } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { Task, ColumnStatus, TaskPriority } from "@/type/types";
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
    boardLabels?: string[];
    onClick?: () => void;
    onUpdateCard?: (id: string, updates: Partial<Task>) => void;
    onRemoveCard?: (id: string) => void;
}

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

    /**
     * Intercepts the Card click. 
     * Since the card is technically a draggable dnd-kit zone, we safely invoke the modal open 
     * programmatically to prevent colliding drag behaviors.
     */
    const handleOpen = () => {
        resetLocalState();
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
            const priority = localPriority === "" ? undefined : localPriority as TaskPriority;
            const dueDate = localDueDate ? new Date(localDueDate) : undefined;
            onUpdateCard(task.id, {
                name: localName.trim() || "Untitled Task",
                description: localDesc,
                priority,
                status: localStatus,
                assigneeId: localAssigneeId || "",
                assigneeName: selectedMember ? selectedMember.username : undefined,
                dueDate,
                labels: localLabels
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
                        <span className={modalStyles.modal_label}>Labels</span>

                        {/* 
                          Labels Wrapper: 
                          Dynamically merges global tags (`boardLabels`) with any newly typed tags (`localLabels`).
                          This ensures instantly created tags become clickable assignable pills immediately without requiring a full board refresh.
                        */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                            {Array.from(new Set([...boardLabels, ...localLabels])).sort().map((lbl) => {
                                const isActive = localLabels.includes(lbl);
                                return (
                                    <div key={lbl} style={{ display: 'flex', alignItems: 'center', background: isActive ? '#0070f3' : '#fff', border: `1px solid ${isActive ? '#0070f3' : '#ccc'}`, borderRadius: '999px', overflow: 'hidden' }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!isActive) setLocalLabels(prev => [...prev, lbl]);
                                            }}
                                            style={{
                                                padding: '0.25rem 0.6rem',
                                                border: 'none',
                                                background: 'transparent',
                                                color: isActive ? '#fff' : '#333',
                                                cursor: isActive ? 'default' : 'pointer',
                                                fontSize: '0.75rem',
                                            }}
                                        >
                                            {lbl}
                                        </button>
                                        {isActive && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setLocalLabels(prev => prev.filter(l => l !== lbl));
                                                }}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    border: 'none',
                                                    background: 'rgba(0,0,0,0.1)',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    lineHeight: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title={`Remove "${lbl}" from this card`}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                className={modalStyles.modal_input}
                                placeholder="Create new label..."
                                value={labelInput}
                                onChange={(e) => setLabelInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = labelInput.trim();
                                        if (val && !localLabels.includes(val)) {
                                            setLocalLabels(prev => [...prev, val]);
                                        }
                                        setLabelInput("");
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const val = labelInput.trim();
                                    if (val && !localLabels.includes(val)) {
                                        setLocalLabels(prev => [...prev, val]);
                                    }
                                    setLabelInput("");
                                }}
                                style={{ padding: '0 0.75rem', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}
                            >
                                Add
                            </button>
                        </div>
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
                    {task?.labels && task.labels.length > 0 && (
                        <div className={styles.card_labels}>
                            {task.labels.map((lbl, idx) => {
                                // A quick simple hash to consistently color the labels
                                const hash = lbl.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                                const hue = Math.abs(hash) % 360;
                                return (
                                    <span key={idx} className={styles.card_label_chip} style={{ backgroundColor: `hsl(${hue}, 70%, 90%)`, color: `hsl(${hue}, 80%, 25%)` }}>
                                        {lbl}
                                    </span>
                                );
                            })}
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

            {/* Renders the full-screen edit modal if `isOpen` is natively toggled true via handleOpen */}
            {modal}
        </>
    );
}
