// The three demo accounts. They share one password. It is public on purpose
// (README, login page), so it ships in the app; DEMO_PASSWORD (seed) and
// VITE_DEMO_PASSWORD (browser) override it.
export const DEFAULT_DEMO_PASSWORD = "Shortlist#2026";

export type DemoAccount = {
  role: "hr" | "candidate";
  email: string;
  name: string;
  label: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "hr",
    email: "demo.hr@example.com",
    name: "HR team",
    label: "Sees both drives and all 59 candidates",
  },
  {
    role: "candidate",
    email: "demo.aarav@example.com",
    name: "Aarav Mehta",
    label: "Candidate in round 3, the Technical Interview",
  },
  {
    role: "candidate",
    email: "demo.meera@example.com",
    name: "Meera Iyer",
    label: "Selected, joining details not sent yet",
  },
];
