import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Menu from "./pages/Menu";
import ProjectTypeSelection from "./pages/ProjectTypeSelection";
import DifficultySelection from "./pages/DifficultySelection";
import Upload from "./pages/Upload";
import Review from "./pages/Review";
import Finalize from "./pages/Finalize";
import ImageRefresh from "./pages/ImageRefresh";
import Subscribe from "./pages/Subscribe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/project-type" element={<ProjectTypeSelection />} />
          <Route path="/difficulty/:type" element={<DifficultySelection />} />
          <Route path="/upload/:bookId" element={<Upload />} />
          <Route path="/review/:bookId" element={<Review />} />
          <Route path="/finalize/:bookId" element={<Finalize />} />
          <Route path="/image-refresh" element={<ImageRefresh />} />
          <Route path="/subscribe" element={<Subscribe />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
