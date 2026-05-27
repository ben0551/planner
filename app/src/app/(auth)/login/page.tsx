// Server component — reads HOUSEHOLD_MODE at render time with no async fetch.
// Passes isMulti as a prop to the client form so it's known immediately,
// eliminating the race condition where the family picker flashed before
// the /api/config fetch completed.
//
// force-dynamic so the env var is read at request time (not baked in at
// Docker build time when HOUSEHOLD_MODE may not be set).
export const dynamic = "force-dynamic";

import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const isMulti = process.env.HOUSEHOLD_MODE === "multi";
  return <LoginForm isMulti={isMulti} />;
}
