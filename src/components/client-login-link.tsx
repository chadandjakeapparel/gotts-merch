import Link from "next/link";

// Quiet entry point to the client inventory portal — kept subtle since it's
// for existing clients, not a call to action for new site visitors.
export function ClientLoginLink() {
  return (
    <Link className="gm-client-login" href="/portal/login">
      <svg aria-hidden="true" fill="none" height="13" viewBox="0 0 24 24" width="13">
        <rect
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
          width="16"
          x="4"
          y="11"
        />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" />
      </svg>
      Client Login
    </Link>
  );
}
