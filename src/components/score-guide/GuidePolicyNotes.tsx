export interface GuidePolicyNote {
  title: string;
  detail: string;
}

export function GuidePolicyNotes({
  title = "Current quote rules",
  description,
  notes,
}: {
  title?: string;
  description: string;
  notes: GuidePolicyNote[];
}) {
  return (
    <section className="border-y border-border py-5">
      <div className="max-w-4xl">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
      <dl className="mt-4 grid gap-x-6 md:grid-cols-2">
        {notes.map((note) => (
          <div key={note.title} className="border-t border-border py-4">
            <dt className="text-sm font-semibold text-ink">{note.title}</dt>
            <dd className="mt-1 text-sm leading-6 text-muted">{note.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
