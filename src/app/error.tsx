"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section role="alert" className="rounded-2xl bg-panel p-6">
      <h1 className="font-serif text-2xl">This demo page couldn’t open</h1>
      <p className="mt-3 max-w-prose text-sm text-muted">
        Retry the page. If the saved browser data is incompatible, use Reset
        demo in the navigation to restore the fictional examples.
      </p>
      <button className="demo-button mt-5" onClick={reset}>
        Retry page
      </button>
    </section>
  );
}
