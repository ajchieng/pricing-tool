import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
export default function NotFound() {
  return (
    <section className="py-16">
      <h1 className="font-serif text-3xl">This page isn’t in the demo</h1>
      <p className="mt-3 text-muted">
        Return to the workspace to explore a lending area.
      </p>
      <Link className={buttonClass("primary", "md", "mt-6")} href="/">
        Open workspace
      </Link>
    </section>
  );
}
