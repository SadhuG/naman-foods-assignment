// The three demo accounts. They share one password (DEMO_PASSWORD on the
// server, VITE_DEMO_PASSWORD in the browser's demo box).
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
