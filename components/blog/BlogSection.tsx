type BlogSectionProps = {
  title: string;
  children: React.ReactNode;
};

type BlogCalloutProps = {
  title?: string;
  children: React.ReactNode;
};

export function BlogSection({ title, children }: BlogSectionProps) {
  return (
    <section className="rounded-3xl bg-white lp-card px-6 py-8 shadow-[0_12px_30px_rgba(11,18,32,0.08)]">
      <h2 className="text-2xl font-semibold text-[#0B1220]">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-[#5B6475]">
        {children}
      </div>
    </section>
  );
}

export function BlogCallout({ title, children }: BlogCalloutProps) {
  return (
    <div className="rounded-2xl bg-[#F9FBFC] lp-card-soft px-4 py-3">
      {title ? (
        <p className="text-sm font-semibold text-[#0B1220]">{title}</p>
      ) : null}
      <div className="mt-2 text-sm text-[#5B6475]">{children}</div>
    </div>
  );
}
