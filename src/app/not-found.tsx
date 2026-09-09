import Link from "next/link";
export default function NotFound() {
  return (
    <section className="py-16">
      <h1 className="font-serif text-3xl">This page isn’t in the demo</h1>
      <p className="mt-3 text-muted">
        Return to the workspace to explore a lending area.
      </p>
      <Link className="demo-button mt-6 inline-flex" href="/">
        Open workspace
      </Link>
    </section>
  );
}
