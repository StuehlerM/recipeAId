import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import RecipeListPage from "./pages/RecipeListPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import IngredientSearchPage from "./pages/IngredientSearchPage";
import UploadPage from "./pages/UploadPage";
import AddRecipePage from "./pages/AddRecipePage";
import PlannerPage from "./pages/PlannerPage";

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
