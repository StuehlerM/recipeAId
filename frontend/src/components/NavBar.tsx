import { NavLink } from "react-router-dom";
import styles from "./NavBar.module.css";

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>recipeAId</span>
      <div className={styles.links}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? styles.active : "")}>
          Recipes
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => (isActive ? styles.active : "")}>
          By Ingredients
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => (isActive ? styles.active : "")}>
          Add Recipe
        </NavLink>
      </div>
    </nav>
  );
}
