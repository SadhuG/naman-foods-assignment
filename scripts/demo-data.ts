// Deterministic demo dataset: two drives, 59 candidates, realistic Indian data.
// Pure: no I/O and no Math.random, so the seed is repeatable and testable.

export type CandidateStatus =
  | "active"
  | "on_hold"
  | "rejected"
  | "selected"
  | "details_submitted"
  | "onboarded";

export type JoiningDetails = {
  date_of_birth: string;
  aadhaar_number: string;
  pan_number: string;
  uan_number: string | null;
  bank_account_holder: string;
  bank_account_number: string;
  bank_ifsc: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  preferred_joining_date: string;
};

export type DemoCandidate = {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  qualification: string;
  experience_years: number;
  account?: string;
  target: { status: CandidateStatus; round: number };
  notes: string[];
  candidate_messages: (string | null)[];
  joining?: JoiningDetails;
  days_ago: number;
};

export type DemoDrive = {
  slug: string;
  title: string;
  role: string;
  location: string;
  openings: number;
  description: string;
  status: "open" | "closed";
  rounds: string[];
  candidates: DemoCandidate[];
};

export type DemoDataset = { drives: DemoDrive[] };

export type Step = {
  decision: "approved" | "on_hold" | "rejected";
  round: number;
};

/** The hr_decide calls that take a fresh applicant (round 1, active) to its target. */
export function stepsFor(
  c: Pick<DemoCandidate, "target">,
  totalRounds: number,
): Step[] {
  const { status, round } = c.target;
  const approvals = (upTo: number): Step[] =>
    Array.from({ length: upTo }, (_, i) => ({
      decision: "approved" as const,
      round: i + 1,
    }));
  switch (status) {
    case "active":
      return approvals(round - 1);
    case "on_hold":
      return [...approvals(round - 1), { decision: "on_hold", round }];
    case "rejected":
      return [...approvals(round - 1), { decision: "rejected", round }];
    default:
      return approvals(totalRounds);
  }
}

// mulberry32: small, fast, seeded.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Rohit",
  "Neha",
  "Imran",
  "Sunita",
  "Karan",
  "Lakshmi",
  "Deepak",
  "Ananya",
  "Vikram",
  "Pooja",
  "Arjun",
  "Kavya",
  "Sandeep",
  "Ritu",
  "Manoj",
  "Fatima",
  "Harpreet",
  "Nikhil",
  "Divya",
  "Suresh",
  "Anjali",
  "Rahul",
  "Shabnam",
  "Gaurav",
  "Meenakshi",
  "Ajay",
  "Swati",
  "Ravi",
  "Komal",
  "Naveen",
  "Farhan",
  "Preeti",
  "Sachin",
  "Jyoti",
  "Vivek",
  "Rekha",
  "Amit",
  "Sneha",
  "Tarun",
  "Bhavna",
  "Yusuf",
  "Shalini",
  "Pankaj",
  "Nisha",
  "Rajesh",
  "Geeta",
  "Mohit",
  "Asha",
  "Kunal",
  "Seema",
];
const LAST = [
  "Kumar",
  "Singh",
  "Yadav",
  "Choudhary",
  "Gupta",
  "Verma",
  "Rathore",
  "Qureshi",
  "Nair",
  "Kulkarni",
  "Joshi",
  "Bansal",
  "Reddy",
  "Pillai",
  "Ghosh",
  "Saini",
  "Meena",
  "Agarwal",
  "Khan",
  "Patel",
  "Jangid",
  "Shekhawat",
  "Malhotra",
  "Das",
  "Mishra",
  "Tiwari",
];
const CITIES_A = [
  "Bhiwadi",
  "Alwar",
  "Rewari",
  "Dharuhera",
  "Neemrana",
  "Gurugram",
  "Jaipur",
  "Behror",
  "Faridabad",
  "Delhi",
  "Kota",
  "Ajmer",
];
const QUALS_A = [
  "ITI — Fitter",
  "ITI — Electrician",
  "ITI — Machinist",
  "Diploma — Mechanical",
  "Diploma — Food Technology",
  "12th pass (Science)",
  "B.Sc Chemistry",
  "B.Sc Food Technology",
  "B.Com",
];
const QUALS_B = [
  "B.Sc Chemistry",
  "B.Sc Microbiology",
  "M.Sc Chemistry",
  "B.Tech Food Technology",
  "M.Sc Food Science",
];
const BANKS = ["HDFC", "SBIN", "ICIC", "UTIB", "PUNB", "KKBK"];
const RELATIONS = ["father", "mother", "brother", "sister", "spouse"];
const LOCALITIES = [
  "Shastri Nagar",
  "Gandhi Colony",
  "Sector 4",
  "Civil Lines",
  "Station Road",
  "Ram Nagar",
  "Vaishali Nagar",
  "Model Town",
];

const NOTES: Record<Step["decision"], string[]> = {
  approved: [
    "Clear communicator; meets the role basics.",
    "Good on GMP and hygiene questions.",
    "Strong practical answers; move ahead.",
    "Scored above the batch average.",
    "Knows CIP cleaning; good fit for the ghee line.",
    "Comfortable with rotational shifts.",
  ],
  on_hold: [
    "Waiting on night-shift availability.",
    "Good profile; hold until we fill the first batch.",
  ],
  rejected: [
    "Below cut-off on the aptitude paper.",
    "Not open to rotational shifts.",
    "Missed the interview slot twice.",
    "Better suited to a stores role later.",
  ],
};
const MESSAGES: (string | null)[] = [
  null,
  null,
  "Please bring a printed copy of your resume.",
  null,
  "Report to Bhiwadi plant gate 2 by 10:00 am.",
  null,
];

type Spec = [CandidateStatus, number, number]; // status, round, count
type Used = { names: Set<string>; emails: Set<string>; phones: Set<string> };
const FINAL: CandidateStatus[] = ["selected", "details_submitted", "onboarded"];

function buildDrive(
  rand: () => number,
  used: Used,
  base: Omit<DemoDrive, "candidates">,
  specs: Spec[],
  specials: Partial<DemoCandidate>[],
  cities: string[],
  quals: string[],
): DemoDrive {
  const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const digits = (n: number) =>
    Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");

  const phone = (): string => {
    for (;;) {
      const p = pick(["9", "8", "7", "6"]) + digits(9);
      if (!used.phones.has(p)) {
        used.phones.add(p);
        return p;
      }
    }
  };
  const name = (): string => {
    for (;;) {
      const n = `${pick(FIRST)} ${pick(LAST)}`;
      if (!used.names.has(n)) {
        used.names.add(n);
        return n;
      }
    }
  };
  const emailFor = (full: string): string => {
    const local = full
      .toLowerCase()
      .replace(/[^a-z ]/g, "")
      .trim()
      .split(/\s+/)
      .join(".");
    let e = `${local}@example.com`;
    for (let i = 2; used.emails.has(e); i++) e = `${local}${i}@example.com`;
    used.emails.add(e);
    return e;
  };

  const joining = (full: string, city: string): JoiningDetails => {
    const latin = full.replace(/[^A-Za-z ]/g, "").trim() || "Anil Kumar";
    const surname = latin.split(/\s+/).at(-1)!;
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const L = () => letters[Math.floor(rand() * letters.length)];
    const year = 1990 + Math.floor(rand() * 14);
    const month = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    return {
      date_of_birth: `${year}-${month}-${day}`,
      aadhaar_number: String(2 + Math.floor(rand() * 8)) + digits(11),
      pan_number: `${L()}${L()}${L()}P${surname[0].toUpperCase()}${digits(4)}${L()}`,
      uan_number: rand() < 0.5 ? "10" + digits(10) : null,
      bank_account_holder: latin,
      bank_account_number:
        String(1 + Math.floor(rand() * 9)) +
        digits(10 + Math.floor(rand() * 4)),
      bank_ifsc: `${pick(BANKS)}0${digits(6)}`,
      address: `House ${1 + Math.floor(rand() * 240)}, ${pick(LOCALITIES)}, ${city}`,
      emergency_contact_name: `${pick(FIRST)} ${surname} (${pick(RELATIONS)})`,
      emergency_contact_phone: phone(),
      preferred_joining_date: pick(["2026-11-10", "2026-11-17", "2026-11-24"]),
    };
  };

  const pending = [...specials];
  const candidates: DemoCandidate[] = [];
  for (const [status, round, count] of specs) {
    for (let i = 0; i < count; i++) {
      const at = pending.findIndex(
        (s) => s.target!.status === status && s.target!.round === round,
      );
      const special: Partial<DemoCandidate> =
        at >= 0 ? pending.splice(at, 1)[0] : {};
      const full = special.full_name ?? name();
      used.names.add(full);
      if (special.email) used.emails.add(special.email);
      if (special.phone) used.phones.add(special.phone);
      const city = special.city ?? pick(cities);
      const c: DemoCandidate = {
        full_name: full,
        email: special.email ?? emailFor(full),
        phone: special.phone ?? phone(),
        city,
        qualification: special.qualification ?? pick(quals),
        experience_years:
          special.experience_years ?? Math.round(rand() * 16) / 2,
        ...(special.account ? { account: special.account } : {}),
        target: { status, round },
        notes: [],
        candidate_messages: [],
        // further along = applied earlier; everyone within the last two weeks
        days_ago: Math.min(
          14,
          1 +
            (round - 1) * 3 +
            Math.floor(rand() * 3) +
            (FINAL.includes(status) ? 2 : 0),
        ),
      };
      for (const step of stepsFor(c, base.rounds.length)) {
        c.notes.push(pick(NOTES[step.decision]));
        c.candidate_messages.push(
          step.decision === "approved" ? pick(MESSAGES) : null,
        );
      }
      if (special.notes) c.notes = special.notes;
      if (status === "details_submitted" || status === "onboarded")
        c.joining = joining(full, city);
      candidates.push(c);
    }
  }
  if (pending.length)
    throw new Error(`unplaced special candidates: ${pending.length}`);
  return { ...base, candidates };
}

export function buildDemoDataset(): DemoDataset {
  const rand = rng(20261101);
  const used: Used = { names: new Set(), emails: new Set(), phones: new Set() };

  const driveA = buildDrive(
    rand,
    used,
    {
      slug: "demo-production-associates",
      title: "Walk-in drive: Production Associates",
      role: "Production Associate",
      location: "Bhiwadi, Rajasthan",
      openings: 12,
      description:
        "Join the ghee and edible-oils line at our Bhiwadi plant. Rotational shifts, PF + ESI, canteen, and transport from Alwar bypass. Freshers with ITI or a diploma are welcome.",
      status: "open",
      rounds: [
        "Screening",
        "Aptitude Test",
        "Technical Interview",
        "HR Interview",
      ],
    },
    [
      ["active", 1, 14],
      ["rejected", 1, 3],
      ["active", 2, 7],
      ["on_hold", 2, 2],
      ["rejected", 2, 2],
      ["active", 3, 6],
      ["rejected", 3, 2],
      ["active", 4, 4],
      ["rejected", 4, 1],
      ["selected", 4, 3],
      ["details_submitted", 4, 2],
      ["onboarded", 4, 1],
    ],
    [
      {
        full_name: "Aarav Mehta",
        email: "demo.aarav@example.com",
        account: "demo.aarav@example.com",
        phone: "9811022345",
        city: "Jaipur",
        qualification: "B.Sc Food Technology",
        experience_years: 2,
        target: { status: "active", round: 3 },
      },
      {
        full_name: "Meera Iyer",
        email: "demo.meera@example.com",
        account: "demo.meera@example.com",
        phone: "9414055678",
        city: "Jaipur",
        qualification: "B.Sc Chemistry",
        experience_years: 1,
        target: { status: "selected", round: 4 },
      },
      {
        full_name: "Sharma, Priya",
        email: "priya.sharma@example.com",
        city: "Pune",
        target: { status: "active", round: 2 },
      },
      {
        full_name: "अनिल कुमार",
        email: "anil.kumar@example.com",
        city: "Alwar",
        target: { status: "active", round: 1 },
      },
      {
        full_name: "Sunita Yadav",
        target: { status: "rejected", round: 2 },
        notes: [
          "Clear communicator; meets the role basics.",
          "=Below cut-off (41%); recheck in March",
        ],
      },
    ],
    CITIES_A,
    QUALS_A,
  );

  const driveB = buildDrive(
    rand,
    used,
    {
      slug: "demo-qc-executive",
      title: "Quality Control Executive",
      role: "QC Executive",
      location: "Bhiwadi, Rajasthan",
      openings: 4,
      description:
        "Lab and line quality checks for ghee and edible oils: FFA, moisture and peroxide tests, batch release and FSSAI records. B.Sc or M.Sc in Chemistry, Microbiology or Food Science.",
      status: "closed",
      rounds: ["Screening", "Lab Practical", "Panel Interview"],
    },
    [
      ["rejected", 1, 4],
      ["rejected", 2, 3],
      ["rejected", 3, 1],
      ["details_submitted", 3, 1],
      ["onboarded", 3, 3],
    ],
    [],
    ["Jaipur", "Delhi", "Gurugram", "Alwar", "Kota", "Lucknow", "Chandigarh"],
    QUALS_B,
  );

  return { drives: [driveA, driveB] };
}
