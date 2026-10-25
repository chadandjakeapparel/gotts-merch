export function DocPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <div className="gm-section-heading">
          <p className="gm-eyebrow">Get to Know Us</p>
          <h1>{title}</h1>
          <p className="gm-doc__updated">Last updated {updated}</p>
        </div>
        <div className="gm-doc__body">{children}</div>
      </div>
    </section>
  );
}
