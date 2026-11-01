import { useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Avatar, Card, Overline, Wordmark } from "../../components/ui/Brand";
import { Button, type ButtonVariant } from "../../components/ui/Button";
import { Dialog, Drawer } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "../../components/ui/Field";
import { MaskedValue } from "../../components/ui/MaskedValue";
import { StatusChip } from "../../components/ui/StatusChip";
import { Tabs } from "../../components/ui/Tabs";
import { CANDIDATE_STATUSES } from "../../lib/types";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];

/** Dev-only gallery of every primitive, for side-by-side checks with Figma. */
export default function KitPage() {
  const [tab, setTab] = useState("r3");
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 p-8">
      <Wordmark />
      <section className="grid grid-cols-4 gap-4">
        {VARIANTS.map((v) => (
          <div key={v} className="contents">
            <Button variant={v}>Button</Button>
            <Button variant={v} className="brightness-90">
              Hover-ish
            </Button>
            <Button variant={v} disabled>
              Button
            </Button>
            <Button variant={v} loading>
              Saving…
            </Button>
          </div>
        ))}
      </section>
      <section className="grid grid-cols-3 gap-6">
        <Field label="Full name" hint="As it appears on your Aadhaar card">
          <Input defaultValue="Aarav Mehta" />
        </Field>
        <Field label="Full name" hint="As it appears on your Aadhaar card">
          <Select defaultValue="a">
            <option value="a">Aarav Mehta</option>
          </Select>
        </Field>
        <Field label="Full name" error="As it appears on your Aadhaar card">
          <Input defaultValue="Aarav Mehta" />
        </Field>
        <Field label="Address" hint="Hint">
          <Textarea defaultValue="Aarav Mehta" />
        </Field>
        <Checkbox label="Naman Foods can contact me by email and SMS about this drive." />
        <Checkbox label="Consent" error="Please agree so HR can contact you." />
      </section>
      <section className="flex flex-wrap gap-3">
        {CANDIDATE_STATUSES.map((s) => (
          <StatusChip key={s} status={s} />
        ))}
      </section>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "r1", label: "Screening", count: 14 },
          { key: "r3", label: "Technical Interview", count: 12 },
          { key: "sel", label: "Selected", count: 6 },
        ]}
      />
      <section className="flex items-center gap-8">
        <MaskedValue value="234567899012" label="Aadhaar" />
        <MaskedValue value="ABCDE1234F" label="PAN" />
        <Avatar name="HR team" dark />
        <Avatar name="Aarav Mehta" />
        <Overline>Naman Foods · Bhiwadi</Overline>
      </section>
      <section className="grid grid-cols-2 gap-4">
        {(["neutral", "success", "warning", "danger"] as const).map((t) => (
          <Banner key={t} tone={t} title="You've already applied to this drive">
            We've kept your original application. Check its progress in My
            applications.
          </Banner>
        ))}
      </section>
      <Card>
        <EmptyState
          title="No one in this round yet"
          body="Candidates appear here when you approve them from the previous round."
          action={<Button variant="secondary">Go to Screening</Button>}
        />
      </Card>
      <div className="flex gap-3">
        <Button onClick={() => setDialog(true)}>Open dialog</Button>
        <Button variant="secondary" onClick={() => setDrawer(true)}>
          Open drawer
        </Button>
      </div>
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Approve 3 candidates"
        description="They move to HR Interview and get an email + SMS."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button>Approve 3</Button>
          </>
        }
      >
        <div className="h-40 rounded-md border border-dashed border-border-strong bg-surface-canvas" />
      </Dialog>
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Rohit Sharma"
      >
        Drawer body
      </Drawer>
    </main>
  );
}
