import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div>
        <h1>TaskFlow</h1>
      </div>
      <div>
        <p>TaskFlow is a task management application</p>
      </div>

    </main>

  );
}
