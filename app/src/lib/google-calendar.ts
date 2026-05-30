const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface GCalEvent {
  id?: string;
  summary?: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  status?: string;
  recurrence?: string[];
  recurringEventId?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  timeZone?: string;
}

export interface GoogleCreds {
  clientId: string;
  clientSecret: string;
}

export function getRedirectUri(): string {
  return `${process.env.APP_URL ?? "http://localhost:3000"}/api/google-calendar/callback`;
}

export function getAuthUrl(householdId: string, creds: GoogleCreds): string {
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    state: householdId,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCode(
  code: string,
  creds: GoogleCreds,
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function getAccessToken(refreshToken: string, creds: GoogleCreds): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Failed to refresh Google access token: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

export async function getCalendarTimezone(accessToken: string, calendarId: string): Promise<string | undefined> {
  const res = await fetch(`${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  return data.timeZone as string | undefined;
}

export async function listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const res = await fetch(`${GOOGLE_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403 && body.includes("disabled")) throw new Error("Google Calendar API is not enabled. Go to console.cloud.google.com → APIs & Services and enable 'Google Calendar API'.");
    if (res.status === 401) throw new Error("Google access token rejected. Try disconnecting and reconnecting Google Calendar in Settings.");
    if (res.status === 403) throw new Error("Permission denied. Make sure your Google account has calendar access and the OAuth app is published or your account is in the test users list.");
    throw new Error(`Failed to list Google calendars (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.items ?? []) as GoogleCalendar[];
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  syncToken?: string,
): Promise<{ items: GCalEvent[]; nextSyncToken?: string }> {
  const url = new URL(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
  );
  if (syncToken) {
    url.searchParams.set("syncToken", syncToken);
  } else {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    url.searchParams.set("timeMin", since.toISOString());
  }
  url.searchParams.set("maxResults", "2500");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 410) return listEvents(accessToken, calendarId); // sync token expired

  if (!res.ok) throw new Error("Failed to list Google Calendar events");
  const data = await res.json();
  return { items: data.items ?? [], nextSyncToken: data.nextSyncToken };
}

export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: GCalEvent,
): Promise<GCalEvent> {
  const res = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    },
  );
  if (!res.ok) throw new Error("Failed to create Google Calendar event");
  return res.json();
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: GCalEvent,
): Promise<GCalEvent> {
  const res = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    },
  );
  if (!res.ok) throw new Error("Failed to update Google Calendar event");
  return res.json();
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error("Failed to delete Google Calendar event");
  }
}

// Planner "YYYY-MM-DD HH:MM:SS" or all-day "YYYY-MM-DD 00:00:00" → Google event
export function toGoogleEvent(ev: {
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  notes?: string;
  timeZone?: string;
}): GCalEvent {
  if (ev.all_day) {
    const startDate = ev.start.substring(0, 10);
    const endDate = ev.end.substring(0, 10);
    const endObj = new Date(endDate + "T00:00:00Z");
    endObj.setUTCDate(endObj.getUTCDate() + 1); // Google all-day end is exclusive
    return {
      summary: ev.title,
      description: ev.notes || undefined,
      start: { date: startDate },
      end: { date: endObj.toISOString().substring(0, 10) },
    };
  }
  if (ev.timeZone) {
    // Send wall-clock time + IANA timezone — Google interprets it as local time
    const toIso = (s: string) => s.replace(" ", "T").substring(0, 19);
    return {
      summary: ev.title,
      description: ev.notes || undefined,
      start: { dateTime: toIso(ev.start), timeZone: ev.timeZone },
      end: { dateTime: toIso(ev.end), timeZone: ev.timeZone },
    };
  }
  // No timezone stored yet — fall back to UTC (Z). Time will be offset but at least the request is valid.
  const toIso = (s: string) => s.replace(" ", "T") + (s.length === 19 ? "Z" : "");
  return {
    summary: ev.title,
    description: ev.notes || undefined,
    start: { dateTime: toIso(ev.start) },
    end: { dateTime: toIso(ev.end) },
  };
}

function parseRRule(rules: string[]): { recurrence?: string; recurrence_until?: string } {
  const rrule = rules.find((r) => r.startsWith("RRULE:"));
  if (!rrule) return {};
  const params: Record<string, string> = {};
  rrule.slice(6).split(";").forEach((part) => {
    const [k, v] = part.split("=");
    if (k) params[k] = v ?? "";
  });
  const interval = parseInt(params.INTERVAL ?? "1");
  let recurrence: string | undefined;
  if (params.FREQ === "DAILY") recurrence = "daily";
  else if (params.FREQ === "WEEKLY" && interval === 2) recurrence = "fortnightly";
  else if (params.FREQ === "WEEKLY") recurrence = "weekly";
  else if (params.FREQ === "MONTHLY") recurrence = "monthly";
  else if (params.FREQ === "YEARLY") recurrence = "yearly";
  let recurrence_until: string | undefined;
  if (params.UNTIL) {
    const r = params.UNTIL;
    recurrence_until = `${r.slice(0, 4)}-${r.slice(4, 6)}-${r.slice(6, 8)}`;
  }
  return { recurrence, recurrence_until };
}

// Google event → Planner record fields
export function fromGoogleEvent(
  ev: GCalEvent,
  householdId: string,
): {
  household: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  external_id: string;
  source: string;
  notes?: string;
  recurrence?: string;
  recurrence_until?: string;
} {
  const allDay = !!ev.start.date;
  let start: string;
  let end: string;

  if (allDay) {
    start = `${ev.start.date} 00:00:00`;
    const endObj = new Date(ev.end.date! + "T00:00:00Z");
    endObj.setUTCDate(endObj.getUTCDate() - 1); // reverse the exclusive offset
    end = `${endObj.toISOString().substring(0, 10)} 23:59:59`;
  } else {
    const fmt = (iso: string, tz?: string): string => {
      const d = new Date(iso);
      if (tz) {
        try {
          const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz, hourCycle: "h23",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          }).formatToParts(d);
          const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
          return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
        } catch {}
      }
      return iso.replace("T", " ").substring(0, 19);
    };
    start = fmt(ev.start.dateTime!, ev.start.timeZone);
    end = fmt(ev.end?.dateTime ?? ev.start.dateTime!, ev.end?.timeZone ?? ev.start.timeZone);
  }

  const { recurrence, recurrence_until } = ev.recurrence ? parseRRule(ev.recurrence) : {};

  return {
    household: householdId,
    title: ev.summary ?? "(No title)",
    start,
    end,
    all_day: allDay,
    external_id: ev.id!,
    source: "google",
    notes: ev.description || undefined,
    ...(recurrence ? { recurrence } : {}),
    ...(recurrence_until ? { recurrence_until } : {}),
  };
}
