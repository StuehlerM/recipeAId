import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import NavBar from "./components/NavBar";
import RecipeListPage from "./features/recipes/RecipeListPage";
import RecipeDetailPage from "./features/recipes/RecipeDetailPage";
import CookModePage from "./features/recipes/CookModePage";
import IngredientSearchPage from "./features/search/IngredientSearchPage";
import AddRecipePage from "./features/add-recipe/AddRecipePage";
import PlannerPage from "./features/planner/PlannerPage";
import SettingsPage from "./features/settings/SettingsPage";

export default function App() {
  const location = useLocation();
  const isCookMode = /^\/recipes\/\d+\/cook\/?$/.test(location.pathname);

  return (
    <>
      <Toaster position="top-center" richColors />
      <main className={isCookMode ? "" : "pb-20"}>
        <Routes>
          <Route path="/" element={<RecipeListPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/recipes/:id/cook" element={<CookModePage />} />
          <Route path="/search" element={<IngredientSearchPage />} />
          <Route path="/add" element={<AddRecipePage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isCookMode && <NavBar />}
    </>
  );
}
