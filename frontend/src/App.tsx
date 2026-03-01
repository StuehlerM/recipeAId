import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import RecipeListPage from "./features/recipes/RecipeListPage";
import RecipeDetailPage from "./features/recipes/RecipeDetailPage";
import IngredientSearchPage from "./features/search/IngredientSearchPage";
import UploadPage from "./features/upload/UploadPage";
import AddRecipePage from "./features/add-recipe/AddRecipePage";
import PlannerPage from "./features/planner/PlannerPage";

export default function App() {
  return (
    <>
      <main className="pb-20">
        <Routes>
          <Route path="/" element={<RecipeListPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/search" element={<IngredientSearchPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/add" element={<AddRecipePage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <NavBar />
    </>
  );
}
