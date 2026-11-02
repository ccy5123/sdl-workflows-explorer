// Link to one of the dataset's GitHub issue forms, opened in a new tab (SPEC-CONTRIB-001 REQ-007).
export function IssueLink({ href, children, className }: { href: string; children: string; className?: string }) {
  return (
    <a className={className ? `issue-link ${className}` : "issue-link"} href={href} target="_blank" rel="noopener">
      {children}
    </a>
  );
}
