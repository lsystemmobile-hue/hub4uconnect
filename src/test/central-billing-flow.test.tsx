import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { BillingAuthProvider } from "@/hooks/use-billing-auth";
import CentralBillingChargesPage from "@/pages/CentralBillingChargesPage";
import { CentralBillingLayout } from "@/components/CentralBillingLayout";

function renderBillingPage(initialEntry = "/central-cobranca/cobrancas") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BillingAuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/central-cobranca" element={<CentralBillingLayout />}>
              <Route path="cobrancas" element={<CentralBillingChargesPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </BillingAuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("central billing charges flow", () => {
  it("filters charges by customer name", async () => {
    renderBillingPage();

    expect(await screen.findByText("Academia Prime Fitness")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar cliente"), {
      target: { value: "Mercado Sousa" },
    });

    await waitFor(() => {
      expect(screen.getByText("Mercado Sousa")).toBeInTheDocument();
      expect(screen.queryByText("Academia Prime Fitness")).not.toBeInTheDocument();
    });
  });

  it("requires manual confirmation before send", async () => {
    renderBillingPage();

    fireEvent.click(await screen.findByLabelText("Selecionar Academia Prime Fitness"));
    fireEvent.click(await screen.findByRole("button", { name: /enviar via whatsapp/i }));

    expect(await screen.findByText("Revisar envio via WhatsApp")).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma mensagem sai automaticamente/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar envio/i })).toBeInTheDocument();
  });
});
