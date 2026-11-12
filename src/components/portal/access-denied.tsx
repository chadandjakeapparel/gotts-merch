export function AccessDenied({ area }: { area: string }) {
  return (
    <div className="portal-empty">
      <p className="portal-muted">
        Your role doesn&apos;t have access to {area}. Ask an admin to turn it on from Roles &amp; Permissions.
      </p>
    </div>
  );
}
