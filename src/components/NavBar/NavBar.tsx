import styles from "./NavBar.module.css";

export default function NavBar() {
    return (
        <nav className={styles.nav}>
            <ul>
                <div className={styles.header}>
                    <h1>TaskFlow</h1>
                    <p>Manage your tasks</p>
                    <br />
                    <search className={styles.search}>
                        <input type="text" placeholder="Search tasks" />
                        <button>    🔍</button>
                    </search>
                    <br />
                    <hr />
                </div>
                <div className={styles.nav_items}>
                    <div className={styles.nav_item}>Task 1</div>
                    <div className={styles.nav_item}>Task 2</div>
                    <div className={styles.nav_item}>Task 3</div>
                    <div className={styles.nav_item}>Task 4</div>
                </div>
            </ul>
        </nav>
    );
}

