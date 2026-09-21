import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/AppShell";
import Analytics from "./pages/Analytics";
import Categories from "./pages/Categories";
import Home from "./pages/Home";
import Library from "./pages/Library";
import PredictionDetail from "./pages/PredictionDetail";
import Settings from "./pages/Settings";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/library" component={Library} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/categories" component={Categories} />
        <Route path="/settings" component={Settings} />
        <Route path="/predictions/:id" component={PredictionDetail} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
