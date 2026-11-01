import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, type ReactNode } from "react";
import { Link, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { buttonClass } from "./components/ui/Button";
import { EmptyState } from "./components/ui/EmptyState";
import { PageSpinner } from "./components/ui/Spinner";
import ApplyPage from "./features/apply/ApplyPage";
import { EditDrivePage, NewDrivePage } from "./features/drives/DriveForm";
import DrivesPage from "./features/drives/DrivesPage";
import LoginPage from "./features/auth/LoginPage";
import { RequireRole } from "./features/auth/RequireRole";
import ApplicationPage from "./features/me/ApplicationPage";
import { CandidateShell } from "./features/me/CandidateShell";
import InboxPage from "./features/me/InboxPage";
import MyApplicationsPage from "./features/me/MyApplicationsPage";
import OutboxPage from "./features/outbox/OutboxPage";
import PipelinePage from "./features/pipeline/PipelinePage";
import { queryClient } from "./lib/queryClient";

const KitPage = import.meta.env.DEV
  ? lazy(() => import("./features/dev/KitPage"))
  : null;

const hr = (el: ReactNode) => <RequireRole role="hr">{el}</RequireRole>;
const candidate = (el: ReactNode) => (
  <RequireRole role="candidate">{el}</RequireRole>
);

function NotFound() {
  return (
    <CandidateShell>
      <EmptyState
        title="Page not found"
        body="The link may be mistyped or out of date."
        action={
          <Link to="/" className={buttonClass("secondary")}>
            Go home
          </Link>
        }
      />
    </CandidateShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/apply/:slug" element={<ApplyPage />} />
          <Route path="/me" element={candidate(<MyApplicationsPage />)} />
          <Route
            path="/me/applications/:id"
            element={candidate(<ApplicationPage />)}
          />
          <Route path="/me/inbox" element={candidate(<InboxPage />)} />
          <Route path="/" element={hr(<DrivesPage />)} />
          <Route path="/drives/new" element={hr(<NewDrivePage />)} />
          <Route path="/drives/:id" element={hr(<PipelinePage />)} />
          <Route path="/drives/:id/edit" element={hr(<EditDrivePage />)} />
          <Route path="/drives/:id/outbox" element={hr(<OutboxPage />)} />
          {KitPage && <Route path="/_kit" element={<KitPage />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster
        position="bottom-center"
        toastOptions={{ className: "font-sans" }}
      />
    </QueryClientProvider>
  );
}
