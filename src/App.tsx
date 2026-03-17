import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import RequireAuth from "@/auth/RequireAuth";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Repositories from "./pages/Repositories";
import Classroom from "./pages/Classroom";
import Editor from "./pages/Editor";
import Settings from "./pages/Settings";
import PullRequests from "./pages/PullRequests";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workspaces" element={<Workspaces />} />
              <Route path="/repositories" element={<Repositories />} />
              <Route path="/classroom" element={<Classroom />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pull-requests" element={<PullRequests />} />
            </Route>

            <Route
              path="/editor"
              element={
                <RequireAuth>
                  <Editor />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
