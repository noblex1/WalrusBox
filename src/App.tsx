import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/DashboardAnimated";
import FileView from "./pages/FileView";
import SharePage from "./pages/SharePage";
import NotFound from "./pages/NotFound";
import "@mysten/dapp-kit/dist/index.css";

// Create a client
const queryClient = new QueryClient();

// Sui network configuration
const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networks} defaultNetwork="testnet">
      <WalletProvider autoConnect>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/file/:id" element={<FileView />} />
              <Route path="/share/:token" element={<SharePage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);

export default App;
