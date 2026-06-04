import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import OrdersPage from "./pages/Orders";
import WorkforcePage from "./pages/Workforce";
import ChatbotPage from "./pages/Chatbot";
import DataAnalysisPage from "./pages/DataAnalysis";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="workforce" element={<WorkforcePage />} />
          <Route path="data" element={<DataAnalysisPage />} />
          <Route path="chatbot" element={<ChatbotPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
