// Link to one of the dataset's GitHub issue forms, opened in a new tab (SPEC-CONTRIB-001 REQ-007).
export function IssueLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="issue-link" href={href} target="_blank" rel="noopener">
      {children}
    </a>
  );
}
