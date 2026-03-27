import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "@/components/Toast";
import Home from "@/pages/Home";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0d1c11] text-[#d5ccac]">
      <div className="text-center">
        <h1 className="text-4xl font-bold" style={{fontFamily: "var(--font-playfair)"}}>404</h1>
        <p className="mt-4 opacity-70">Страница не найдена</p>
        <a href="/" className="mt-6 inline-block border border-[#a68838] text-[#c8a84a] px-6 py-2 uppercase text-sm tracking-widest hover:bg-[#a68838] hover:text-[#0d1c11] transition-colors duration-200">
          Вернуться в библиотеку
        </a>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
