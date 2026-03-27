import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "@/components/Toast";
import Home from "@/pages/Home";
import BookPage from "@/pages/BookPage";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--ivory)' }}>404</h1>
      <a href="/" style={{ border: '1px solid var(--gold2)', color: 'var(--gold)', padding: '10px 20px', fontFamily: "'Crimson Text', serif", fontSize: '.85rem', letterSpacing: '.14em', textTransform: 'uppercase', textDecoration: 'none' }}>
        В библиотеку
      </a>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/book/:id" component={BookPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default App;
