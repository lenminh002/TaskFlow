/**
 * @file CommentSection.tsx
 * @description Real-time comment stream and activity log for individual tasks.
 * @details Fetches existing comments on mount and provides form logic for adding new ones.
 */

"use client";

import { useState, useEffect } from "react";
import { fetchComments, addComment, deleteComment } from "@/lib/actions";
import { getSessionUserId } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/type/types";
import styles from "./CommentSection.module.css";
import { formatDate } from "@/lib/utils";

/**
 * Props for the CommentSection component.
 */
interface CommentSectionProps {
    /** The UUID of the task to which these comments belong */
    taskId: string;
}

/**
 * Renders the task's discussion history and provides a text input for adding new messages.
 */
export default function CommentSection({ taskId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>("");

    useEffect(() => {
        // Initialize the view by fetching the latest user session 
        // to determine specific ownership for "Delete" button visibility.
        const supabase = createClient();
        getSessionUserId(supabase).then((userId) => setCurrentUserId(userId || ""));

        setIsLoading(true);
        fetchComments(taskId)
            .then((data) => setComments(data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [taskId]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newComment.trim();
        if (!content) return;

        setIsSubmitting(true);
        try {
            const added = await addComment(taskId, content);
            if (added) {
                setComments(prev => [...prev, added]);
                setNewComment("");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        // Optimistic delete
        const prev = comments;
        setComments(comments.filter(c => c.id !== commentId));
        try {
            await deleteComment(commentId);
        } catch {
            alert("Failed to delete comment");
            setComments(prev);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.list}>
                {isLoading ? (
                    <span className={styles.loading}>Loading comments...</span>
                ) : comments.length === 0 ? (
                    <span className={styles.loading}>No comments yet.</span>
                ) : (
                    comments.map(comment => {
                        const isSent = comment.userId === currentUserId;

                        if (comment.isSystemActivity) {
                            return (
                                <div key={comment.id} className={styles.system_activity} title={comment.id}>
                                    <strong style={{ color: '#000' }}>{comment.username === 'Unknown User' ? 'System' : comment.username}</strong>
                                    {" "}
                                    {comment.content.toLowerCase()}
                                    {" "}
                                    <span className={styles.system_time}>{formatDate(comment.createdAt)}</span>
                                </div>
                            );
                        }

                        return (
                            <div key={comment.id} className={isSent ? styles.sent_message : styles.received_message}>
                                <div className={isSent ? styles.meta_sent : styles.meta_received}>
                                    <span>
                                        {isSent ? "You" : comment.username}
                                        {" "}
                                        <span className={styles.meta_time}>- {formatDate(comment.createdAt)}</span>
                                    </span>
                                    {isSent && (
                                        <button
                                            className={styles.delete_button}
                                            onClick={() => handleDelete(comment.id)}
                                            title="Delete your comment"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                                <p className={styles.content}>{comment.content.toLowerCase()}</p>
                            </div>
                        );
                    })
                )}
            </div>

            <form onSubmit={handleAddComment} className={styles.form}>
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your message here..."
                    className={styles.input}
                    disabled={isSubmitting || isLoading}
                />
                <button
                    type="submit"
                    className={styles.submit}
                    disabled={isSubmitting || isLoading || !newComment.trim()}
                    aria-label="Send Message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </div>
    );
}
