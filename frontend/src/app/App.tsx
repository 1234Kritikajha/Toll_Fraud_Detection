import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "../components/layout/Shell";
import { appRoutes } from "../routes/routes";
import { AuthProvider } from "../auth/AuthContext";
import { AlertsQuickActionsProvider } from "../context/AlertsQuickActionsContext";
import { ToastProvider } from "../components/ui/Toast";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AlertsQuickActionsProvider>
            <Shell>
              <Routes>
                {appRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
              </Routes>
            </Shell>
          </AlertsQuickActionsProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

