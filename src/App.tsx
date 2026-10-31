import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

function Placeholder({ title }: { title: string }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </main>
  );
}

const routes: Array<[path: string, title: string]> = [
  ["/login", "Log in"],
  ["/apply/:slug", "Apply"],
  ["/me", "My applications"],
  ["/me/applications/:id", "Application"],
  ["/me/inbox", "Inbox"],
  ["/", "Drives"],
  ["/drives/new", "New drive"],
  ["/drives/:id", "Pipeline"],
  ["/drives/:id/edit", "Edit drive"],
  ["/drives/:id/outbox", "Outbox"],
  ["*", "Page not found"],
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {routes.map(([path, title]) => (
          <Route
            key={path}
            path={path}
            element={<Placeholder title={title} />}
          />
        ))}
      </Routes>
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
