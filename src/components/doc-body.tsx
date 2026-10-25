type DocBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseDocBody(body: string): DocBlock[] {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((block) => {
    if (block.startsWith("## ")) return { type: "heading", text: block.slice(3).trim() };
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => l.startsWith("- "))) {
      return { type: "list", items: lines.map((l) => l.slice(2).trim()) };
    }
    return { type: "paragraph", text: lines.join(" ") };
  });
}

/** Turns "[text](url)" into a link within an otherwise plain line of text. */
function renderInline(text: string): React.ReactNode[] {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<a href={match[2]} key={i++}>{match[1]}</a>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * Renders a document's body text: a blank line starts a new paragraph,
 * "## " starts a heading, a block whose every line starts with "- "
 * becomes a bullet list, and "[text](url)" becomes a link. {{brandName}}
 * and {{inquiryEmail}} are replaced with the site's current values.
 */
export function DocBody({
  body,
  brandName,
  inquiryEmail,
}: {
  body: string;
  brandName: string;
  inquiryEmail: string;
}) {
  const filled = body.replaceAll("{{brandName}}", brandName).replaceAll("{{inquiryEmail}}", inquiryEmail);
  const blocks = parseDocBody(filled);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "heading") return <h2 key={i}>{renderInline(block.text)}</h2>;
        if (block.type === "list") {
          return (
            <ul key={i}>
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block.text)}</p>;
      })}
    </>
  );
}
