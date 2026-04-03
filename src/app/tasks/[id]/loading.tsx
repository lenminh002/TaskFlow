import styles from "./loading.module.css";

// This loading screen is shown automatically by Next.js while page.tsx
// is fetching data from Supabase on the server side.
export default function Loading() {
    return (
        <div className={styles.container}>
            <div className={styles.spinner} />
            <p className={styles.text}>Loading board...</p>
        </div>
    );
}
