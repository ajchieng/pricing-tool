import { FeedbackForm } from "@/components/FeedbackForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Feedback",
  description: "Save feedback about this fictional pricing demonstration.",
};

export default function FeedbackPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Feedback"
        caption="Record issues, workflow friction or improvement ideas in this browser."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card title="Send feedback" titleAs="h2">
          <FeedbackForm />
        </Card>

        <aside
          aria-label="Feedback guidance"
          className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0.5"
        >
          <h2 className="text-sm font-semibold text-ink">What to include</h2>
          <ul className="mt-3 space-y-2 text-sm leading-5 text-muted">
            <li>The page or quote you were working on.</li>
            <li>What happened and what you expected instead.</li>
            <li>
              Whether the issue blocked the workflow or just slowed it down.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
