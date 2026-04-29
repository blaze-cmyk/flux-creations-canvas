import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Generator from "./pages/Generator.tsx";
import Video from "./pages/Video.tsx";
import SpacesProjects from "./pages/SpacesProjects.tsx";
import MarketingStudio from "./pages/MarketingStudio.tsx";
import MarketingStudioProject from "./pages/MarketingStudioProject.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Generator />} />
          <Route path="/generator" element={<Generator />} />
          <Route path="/video" element={<Video />} />
          <Route path="/spaces-projects" element={<SpacesProjects />} />
          <Route path="/spaces" element={<Index />} />
          <Route path="/marketingstudio" element={<MarketingStudio />} />
          <Route path="/marketingstudio/:slug" element={<MarketingStudioProject />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
