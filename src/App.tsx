import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { NfAnalyzerLayout } from "@/components/NfAnalyzerLayout";
import { CentralBillingLayout } from "@/components/CentralBillingLayout";
import DashboardPage from "@/pages/DashboardPage";
import UploadNotasPage from "@/pages/UploadNotasPage";
import NotasListPage from "@/pages/NotasListPage";
import NotaDetailPage from "@/pages/NotaDetailPage";
import AdminNotesPage from "@/pages/AdminNotesPage";
import CentralBillingDashboardPage from "@/pages/CentralBillingDashboardPage";
import CentralBillingChargesPage from "@/pages/CentralBillingChargesPage";
import CentralBillingDispatchesPage from "@/pages/CentralBillingDispatchesPage";
import CentralBillingSchedulesPage from "@/pages/CentralBillingSchedulesPage";
import CentralBillingAlertsPage from "@/pages/CentralBillingAlertsPage";
import CentralBillingAdminPage from "@/pages/CentralBillingAdminPage";
import NotFound from "@/pages/NotFound";
import { NotasProvider } from "@/hooks/use-notas";
import { AssistantConfigProvider } from "@/hooks/use-assistant-config";
import { ThemeProvider } from "@/components/theme-provider";
import { BillingAuthProvider } from "@/hooks/use-billing-auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NotasProvider>
      <AssistantConfigProvider>
        <BillingAuthProvider>
          <ThemeProvider defaultTheme="light" storageKey="hub-ui-theme">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/nf-analyzer/dashboard" replace />} />

                    <Route path="/nf-analyzer" element={<NfAnalyzerLayout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="dashboard" element={<DashboardPage />} />
                      <Route path="upload" element={<UploadNotasPage />} />
                      <Route path="notas" element={<NotasListPage />} />
                      <Route path="notas/:id" element={<NotaDetailPage />} />
                      <Route path="admin" element={<AdminNotesPage />} />
                    </Route>

                    <Route path="/central-cobranca" element={<CentralBillingLayout />}>
                      <Route index element={<Navigate to="/central-cobranca/dashboard" replace />} />
                      <Route path="dashboard" element={<CentralBillingDashboardPage />} />
                      <Route path="cobrancas" element={<CentralBillingChargesPage />} />
                      <Route path="envios" element={<CentralBillingDispatchesPage />} />
                      <Route path="agendamentos" element={<CentralBillingSchedulesPage />} />
                      <Route path="alertas" element={<CentralBillingAlertsPage />} />
                      <Route path="admin" element={<CentralBillingAdminPage />} />
                    </Route>

                    <Route path="/upload" element={<Navigate to="/nf-analyzer/upload" replace />} />
                    <Route path="/notas" element={<Navigate to="/nf-analyzer/notas" replace />} />
                    <Route path="/admin" element={<Navigate to="/nf-analyzer/admin" replace />} />
                    <Route path="/cobrancas" element={<Navigate to="/central-cobranca/cobrancas" replace />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </BillingAuthProvider>
      </AssistantConfigProvider>
    </NotasProvider>
  </QueryClientProvider>
);

export default App;
