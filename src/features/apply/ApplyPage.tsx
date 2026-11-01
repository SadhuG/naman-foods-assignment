import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryError } from "../../components/ui/QueryError";
import { BriefcaseBusiness, MapPin, SearchX, Users } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Banner } from "../../components/ui/Banner";
import { Avatar, Card, Overline } from "../../components/ui/Brand";
import { buttonClass } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import { signUp, useAuth } from "../../lib/api/auth";
import {
  applyToDrive,
  candidateKeys,
  getMyLatestProfile,
  getPublicDrive,
} from "../../lib/api/candidate";
import { friendlyError } from "../../lib/api/errors";
import { formatPhone, ROUND_BLURBS } from "../../lib/copy";
import { supabase } from "../../lib/supabase";
import type { PublicDrive } from "../../lib/types";
import { CandidateShell, useDisplayName } from "../me/CandidateShell";
import { ApplyForm, type ApplySubmit } from "./ApplyForm";

type ApplyError = {
  title: string;
  body: ReactNode;
  tone: "warning" | "danger";
};

export default function ApplyPage() {
  const { slug = "" } = useParams();
  const auth = useAuth();
  const drive = useQuery({
    queryKey: candidateKeys.drive(slug),
    queryFn: () => getPublicDrive(slug),
  });
  // Signing up mid-submit sets auth back to loading. Once the page has shown, keep it
  // mounted so the form keeps what was typed and any error stays visible.
  const settled = useRef(false);
  if (drive.data && !auth.loading) settled.current = true;

  if (drive.isPending || (auth.loading && !settled.current))
    return (
      <CandidateShell>
        <DriveSkeleton />
      </CandidateShell>
    );
  if (drive.isError)
    return (
      <CandidateShell>
        <QueryError
          title="We couldn't load this drive."
          error={drive.error}
          onRetry={() => drive.refetch()}
        />
      </CandidateShell>
    );
  if (!drive.data)
    return (
      <CandidateShell>
        <Card>
          <EmptyState
            icon={SearchX}
            title="This drive doesn't exist"
            body="The link may be mistyped or the drive was removed. Ask the Naman Foods HR team for a fresh link."
            action={<LoginOrApplications />}
          />
        </Card>
      </CandidateShell>
    );
  if (drive.data.status === "closed") return <ClosedDrive drive={drive.data} />;
  return <OpenDrive slug={slug} drive={drive.data} />;
}

function LoginOrApplications() {
  const { session, role } = useAuth();
  if (session && role === "candidate")
    return (
      <Link to="/me" className={buttonClass("primary")}>
        See my applications
      </Link>
    );
  return (
    <Link to="/login" className={buttonClass("secondary")}>
      Log in
    </Link>
  );
}

function ClosedDrive({ drive }: { drive: PublicDrive }) {
  const { session } = useAuth();
  return (
    <CandidateShell>
      <Card>
        <EmptyState
          icon={BriefcaseBusiness}
          title="Applications for this drive are closed"
          body={`${drive.title} has stopped taking applications. Naman Foods runs drives through the year, so keep an eye on the careers page.`}
          action={
            <>
              <Link to="/me" className={buttonClass("primary") + " w-60"}>
                See my applications
              </Link>
              {!session && (
                <Link to="/login" className={buttonClass("ghost")}>
                  Log in
                </Link>
              )}
            </>
          }
        />
      </Card>
    </CandidateShell>
  );
}

function OpenDrive({ slug, drive }: { slug: string; drive: PublicDrive }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const name = useDisplayName();
  // Decide once: after sign-up mid-submit the session appears, but the form must not swap.
  const [needsAccount] = useState(() => !auth.session);
  const [error, setError] = useState<ApplyError | null>(null);
  const isCandidate = !!auth.session && auth.role === "candidate";
  const profile = useQuery({
    queryKey: candidateKeys.profile,
    queryFn: getMyLatestProfile,
    enabled: isCandidate && !needsAccount,
  });

  async function submit(v: ApplySubmit) {
    setError(null);
    try {
      // A retry after a failed apply must not sign up twice.
      const { data } = await supabase.auth.getSession();
      if (needsAccount && !data.session) {
        await signUp({
          email: v.email!,
          password: v.password!,
          full_name: v.full_name,
        });
      }
      const id = await applyToDrive(slug, v);
      await queryClient.invalidateQueries({ queryKey: candidateKeys.mine });
      toast.success(
        "Application sent. Check your inbox for a confirmation (demo).",
      );
      navigate(`/me/applications/${id}`);
    } catch (e) {
      setError(errorFor(e, slug));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  let formCard: ReactNode;
  if (auth.session && auth.role === "hr") {
    formCard = (
      <Banner title="You're signed in as HR">
        Candidates apply here. To try it, open this link in a private window or
        log out first.{" "}
        <Link to="/" className="text-fg-link underline">
          Back to drives
        </Link>
      </Banner>
    );
  } else if (!needsAccount && profile.isPending) {
    formCard = <PageSpinner />;
  } else {
    const p = profile.data;
    const knownName = p?.full_name ?? name;
    formCard = (
      <Card className="p-5 lg:p-6">
        {needsAccount ? (
          <>
            <h2 className="text-heading">Create your account and apply</h2>
            <p className="mt-1 mb-5 text-small text-fg-secondary">
              Takes about 3 minutes. You'll track every round here.
            </p>
          </>
        ) : (
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <Avatar name={knownName} className="size-10" />
              <div className="min-w-0">
                <p className="text-title">{knownName}</p>
                <p className="truncate text-small text-fg-secondary">
                  {auth.session?.user.email}
                </p>
              </div>
            </div>
            <p className="mt-3 text-small text-fg-secondary">
              {p
                ? "We'll use your saved details. Check they're still right."
                : "Add a few details to apply."}
            </p>
          </div>
        )}
        <ApplyForm
          needsAccount={needsAccount}
          hideName={!needsAccount && !!knownName}
          defaults={
            needsAccount
              ? undefined
              : {
                  full_name: knownName,
                  phone: p?.phone && formatPhone(p.phone),
                  city: p?.city,
                  qualification: p?.qualification,
                  experience_years: p?.experience_years,
                }
          }
          submitLabel={
            needsAccount ? "Create account & apply" : "Submit application"
          }
          onSubmit={submit}
        />
        {needsAccount && (
          <p className="mt-4 text-small text-fg-secondary">
            Already have an account?{" "}
            <Link
              to={`/login?next=${encodeURIComponent(`/apply/${slug}`)}`}
              className="text-fg-link underline"
            >
              Log in
            </Link>
          </p>
        )}
      </Card>
    );
  }

  return (
    <CandidateShell wide>
      <div className="grid gap-6 lg:grid-cols-[1fr_480px] lg:gap-16">
        <div className="flex flex-col gap-6">
          <DriveHeader drive={drive} />
          <RoundsCard drive={drive} />
        </div>
        <div className="flex flex-col gap-4">
          {error && (
            <Banner tone={error.tone} title={error.title}>
              {error.body}
            </Banner>
          )}
          {formCard}
        </div>
      </div>
    </CandidateShell>
  );
}

function errorFor(e: unknown, slug: string): ApplyError {
  const message = (e as { message?: string })?.message;
  if (message === "already_applied")
    return {
      tone: "warning",
      title: "You've already applied to this drive",
      body: (
        <>
          We've kept your original application.{" "}
          <Link to="/me" className="text-fg-link underline">
            See where it stands
          </Link>
          .
        </>
      ),
    };
  if (message === "User already registered")
    return {
      tone: "warning",
      title: "An account with this email already exists",
      body: (
        <>
          <Link
            to={`/login?next=${encodeURIComponent(`/apply/${slug}`)}`}
            className="text-fg-link underline"
          >
            Log in
          </Link>{" "}
          to apply with it.
        </>
      ),
    };
  return { tone: "danger", title: friendlyError(e), body: null };
}

export function DriveHeader({ drive }: { drive: PublicDrive }) {
  return (
    <div>
      <Overline>Naman Foods · Hiring now</Overline>
      <h1 className="mt-3 text-heading lg:text-[32px] lg:leading-10 lg:font-semibold lg:tracking-[-0.02em]">
        {drive.title}
      </h1>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small text-fg-secondary">
        <li className="flex items-center gap-1.5">
          <MapPin aria-hidden className="size-4" />
          {drive.location}
        </li>
        <li className="flex items-center gap-1.5">
          <BriefcaseBusiness aria-hidden className="size-4" />
          {drive.openings} {drive.openings === 1 ? "opening" : "openings"}
        </li>
        <li className="flex items-center gap-1.5">
          <Users aria-hidden className="size-4" />
          {drive.rounds.length} rounds
        </li>
      </ul>
      <p className="mt-3 text-body text-fg-secondary lg:text-[15px] lg:leading-6">
        {drive.description}
      </p>
      <ol className="mt-4 flex flex-wrap gap-2 lg:hidden" aria-label="Rounds">
        {drive.rounds.map((r) => (
          <li
            key={r.position}
            className="rounded-full bg-surface-sunken px-2.5 py-1 text-small"
          >
            {r.position} {r.name}
          </li>
        ))}
      </ol>
    </div>
  );
}

function RoundsCard({ drive }: { drive: PublicDrive }) {
  return (
    <Card className="hidden p-6 lg:block">
      <h2 className="text-title">What happens after you apply</h2>
      <ol className="mt-4">
        {drive.rounds.map((r, i) => (
          <li key={r.position} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="grid size-6 place-items-center rounded-full bg-surface-sunken text-small">
                {r.position}
              </span>
              {i < drive.rounds.length - 1 && (
                <span className="my-1 w-px flex-1 bg-border-strong" />
              )}
            </div>
            <div className="flex flex-1 justify-between gap-4 pb-6">
              <div>
                <p className="text-body">{r.name}</p>
                {ROUND_BLURBS[r.name] && (
                  <p className="text-small text-fg-secondary">
                    {ROUND_BLURBS[r.name]}
                  </p>
                )}
              </div>
              <span className="font-mono text-small whitespace-nowrap text-fg-secondary">
                Round {r.position}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function DriveSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading drive" className="animate-pulse">
      <div className="h-3 w-40 rounded bg-surface-sunken" />
      <div className="mt-4 h-7 w-3/4 rounded bg-surface-sunken" />
      <div className="mt-3 h-4 w-1/2 rounded bg-surface-sunken" />
      <div className="mt-6 h-20 rounded bg-surface-sunken" />
      <div className="mt-6 h-96 rounded-lg bg-surface-sunken" />
    </div>
  );
}
