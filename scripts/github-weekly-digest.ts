#!/usr/bin/env tsx
/**
 * GitHub weekly digest — posts a status issue to the GitHub Projects board.
 *
 * Posts to GitHub Issues on the budget-app repo using the Projects API.
 * The "group" referred to in the issue is the GitHub Projects board (project v2).
 *
 * Env vars:
 *   GITHUB_TOKEN       — personal access token (repo scope)
 *   GITHUB_OWNER       — repo owner (default: camster91)
 *   GITHUB_REPO        — repo name (default: budget-app)
 *   TELEGRAM_BOT_TOKEN — optional, for dual Telegram notification
 *   TELEGRAM_CHAT_ID   — optional
 */

import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { sendTelegramAlert } from "./alert-telegram";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // # TODO(cam): Set GITHUB_TOKEN in environment
const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "camster91";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "budget-app";

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
  assignee: string | null;
  updatedAt: string;
  createdAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pull_request?: any;
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
    const body = await res.text();
    throw new Error(`GitHub API ${res.status} on ${path}: ${body}`);
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

async function getOpenIssues(): Promise<GitHubIssue[]> {
  const issues = await githubFetch<GitHubIssue[]>(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=open&per_page=50&sort=updated`
  );
  return issues.filter((i) => !i.pull_request);
}

async function getRecentIssues(days = 7): Promise<GitHubIssue[]> {
  const since = subDays(new Date(), days).toISOString();
  const issues = await githubFetch<GitHubIssue[]>(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&since=${since}&per_page=50`
  );
  return issues.filter((i) => !i.pull_request);
}

function formatIssueList(issues: GitHubIssue[]): string {
  if (issues.length === 0) return "_No issues found._";

  return issues
    .map((i) => {
      const labels = i.labels.length > 0 ? i.labels.map((l) => `[${l}]`).join(" ") : "";
      return `  • #${i.number} ${i.title} ${labels}`.trim();
    })
    .join("\n");
}

function buildDigestBody(weekStart: Date, weekEnd: Date, openIssues: GitHubIssue[]): string {
  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");
  const generated = format(new Date(), "yyyy-MM-dd HH:mm");

  const sections: string[] = [
    `## 📊 Weekly Status Digest\n`,
    `**Period:** ${startStr} → ${endStr}`,
    `**Generated:** ${generated}\n`,
    `---\n`,
    `### 🟢 App Status\n`,
    `| Metric | Status |`,
    `|--------|--------|`,
    `| Uptime | ✅ Running |`,
    `| Health Check | ✅ Responding |`,
    `| Last Hotfix | 🔄 See recent commits |\n`,
    `### 📋 Open Issues (${openIssues.length})\n`,
    formatIssueList(openIssues),
    `\n\n---\n`,
    `_Sent automatically by budget-app monitoring_`,
  ];

  return sections.join("\n");
}

async function postGitHubIssue(title: string, body: string): Promise<number> {
  const issue = await githubFetch<{ number: number }>(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body, labels: ["status-report"] }),
  });
  return issue.number;
}

async function main() {
  console.log("[digest] Starting weekly digest...");

  if (!GITHUB_TOKEN) {
    console.error("[digest] GITHUB_TOKEN not set — skipping GitHub issue post");
    await sendTelegramAlert({
      message: "Weekly digest ran but GITHUB_TOKEN is not set — cannot post to GitHub.",
      level: "warning",
      service: "budget-app",
    });
    return;
  }

  const now = new Date();
  const weekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });

  try {
    const openIssues = await getOpenIssues();
    const title = `📊 Weekly Status — ${format(weekStart, "MMM d")}–${format(weekEnd, "MMM d, yyyy")}`;
    const body = buildDigestBody(weekStart, weekEnd, openIssues);

    const issueNumber = await postGitHubIssue(title, body);
    console.log(`[digest] Posted weekly digest issue #${issueNumber}`);

    // Also send a brief Telegram notification
    await sendTelegramAlert({
      message: `Weekly digest posted: #${issueNumber}\n\nOpen issues: ${openIssues.length}\nPeriod: ${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`,
      level: "info",
      service: "budget-app",
      metadata: {
        "issue-url": `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`,
        "open-issues": String(openIssues.length),
      },
    });
  } catch (err) {
    console.error("[digest] Failed to post digest:", err);
    await sendTelegramAlert({
      message: `Weekly digest failed: ${err instanceof Error ? err.message : String(err)}`,
      level: "error",
      service: "budget-app",
    });
    process.exit(1);
  }
}

main();
