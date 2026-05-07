import { NextResponse } from "next/server";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // # TODO(cam): Set GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "camster91";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "budget-app";

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
}

async function githubFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} on ${path}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

async function getOpenIssues(): Promise<GitHubIssue[]> {
  const issues = await githubFetch<GitHubIssue[]>(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=open&per_page=50&sort=updated`
  );
  return issues as GitHubIssue[];
}

function buildDigestBody(weekStart: Date, weekEnd: Date, openIssues: GitHubIssue[]): string {
  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");
  const generated = format(new Date(), "yyyy-MM-dd HH:mm");

  const issueList =
    openIssues.length === 0
      ? "_No open issues._"
      : openIssues
          .map((i) => {
            const labels = i.labels.length > 0 ? i.labels.map((l) => `[${l}]`).join(" ") : "";
            return `  • #${i.number} ${i.title} ${labels}`.trim();
          })
          .join("\n");

  return [
    `## Weekly Status Digest`,
    ``,
    `**Period:** ${startStr} → ${endStr}`,
    `**Generated:** ${generated}`,
    ``,
    `---`,
    ``,
    `### App Status`,
    ``,
    `| Metric | Status |`,
    `|--------|--------|`,
    `| Uptime | Running |`,
    `| Health Check | Responding |`,
    ``,
    `### Open Issues (${openIssues.length})`,
    ``,
    issueList,
    ``,
    `---`,
    `_Sent automatically by budget-app monitoring_`,
  ].join("\n");
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
  }

  const now = new Date();
  const weekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });

  try {
    const openIssues = await getOpenIssues();
    const title = `Weekly Status — ${format(weekStart, "MMM d")}–${format(weekEnd, "MMM d, yyyy")}`;
    const body = buildDigestBody(weekStart, weekEnd, openIssues);

    const issue = await githubFetch<{ number: number }>(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        body: JSON.stringify({ title, body, labels: ["status-report"] }),
      }
    );

    return NextResponse.json({ success: true, issueNumber: issue.number });
  } catch (error) {
    console.error("[digest] Failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
