export interface CommitSummary {
  sha: string;
  author: string;
  date: string;
  message: string;
}

export interface FileContentSample {
  path: string;
  size: number;
  content: string; // truncated if large
}

export interface GitHubRepoSnapshot {
  owner: string;
  repo: string;
  isValidRepo: boolean;
  error?: string;
  metadata?: {
    stars: number;
    forks: number;
    defaultBranch: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    isPrivate: boolean;
  };
  languages?: Record<string, number>;
  totalCommitsCount?: number;
  recentCommits?: CommitSummary[];
  readmeContent?: string | null;
  fileTreeSummary?: string[];
  keyFileSamples?: FileContentSample[];
}

/**
 * Extract owner and repo from standard GitHub URL.
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
      return null;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, ""),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch GitHub repository details, commits, languages, file tree, and code samples.
 */
export async function fetchGitHubRepoSnapshot(repoUrl: string): Promise<GitHubRepoSnapshot> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return {
      owner: "",
      repo: "",
      isValidRepo: false,
      error: "Malformed GitHub repository URL",
    };
  }

  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ACE-Forge-Reviewer-Bot/1.0",
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    // 1. Repo Metadata
    const repoRes = await fetch(baseUrl, { headers });
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return {
          owner,
          repo,
          isValidRepo: false,
          error: "Repository not found or is private and inaccessible.",
        };
      }
      if (repoRes.status === 403) {
        return {
          owner,
          repo,
          isValidRepo: false,
          error: "GitHub API rate limit exceeded or access forbidden.",
        };
      }
      return {
        owner,
        repo,
        isValidRepo: false,
        error: `GitHub API error: HTTP ${repoRes.status}`,
      };
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || "main";

    // 2. Languages
    let languages: Record<string, number> = {};
    try {
      const langRes = await fetch(`${baseUrl}/languages`, { headers });
      if (langRes.ok) languages = await langRes.json();
    } catch {
      // Non-critical failure
    }

    // 3. Commits (Recent 30)
    const recentCommits: CommitSummary[] = [];
    try {
      const commitRes = await fetch(`${baseUrl}/commits?per_page=30`, { headers });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        if (Array.isArray(commitData)) {
          for (const c of commitData) {
            recentCommits.push({
              sha: c.sha?.substring(0, 7) || "",
              author: c.commit?.author?.name || c.author?.login || "Unknown",
              date: c.commit?.author?.date || "",
              message: (c.commit?.message || "").split("\n")[0].substring(0, 100),
            });
          }
        }
      }
    } catch {
      // Non-critical failure
    }

    // 4. README
    let readmeContent: string | null = null;
    try {
      const readmeRes = await fetch(`${baseUrl}/readme`, { headers });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        if (readmeData.content) {
          readmeContent = Buffer.from(readmeData.content, "base64").toString("utf-8").substring(0, 5000);
        }
      }
    } catch {
      // Non-critical
    }

    // 5. File Tree
    let fileTreeSummary: string[] = [];
    const keyFileSamples: FileContentSample[] = [];

    try {
      const treeRes = await fetch(`${baseUrl}/git/trees/${defaultBranch}?recursive=1`, { headers });
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        if (Array.isArray(treeData.tree)) {
          const files = treeData.tree
            .filter((item: { type: string; path: string }) => item.type === "blob")
            .map((item: { path: string }) => item.path)
            .filter(
              (p: string) =>
                !p.startsWith(".git/") &&
                !p.includes("node_modules/") &&
                !p.includes("vendor/") &&
                !p.endsWith(".png") &&
                !p.endsWith(".jpg") &&
                !p.endsWith(".lock") &&
                !p.endsWith(".sum")
            );

          fileTreeSummary = files.slice(0, 100);

          // Select up to 4 key source code files
          const targetCodeFiles = files
            .filter((p: string) =>
              /\.(go|rs|py|ts|tsx|js|jsx|java|cpp|c|sql)$/i.test(p)
            )
            .slice(0, 4);

          for (const filePath of targetCodeFiles) {
            try {
              const fileRes = await fetch(`${baseUrl}/contents/${filePath}?ref=${defaultBranch}`, {
                headers,
              });
              if (fileRes.ok) {
                const fileData = await fileRes.json();
                if (fileData.content && fileData.size < 60000) {
                  const text = Buffer.from(fileData.content, "base64").toString("utf-8");
                  keyFileSamples.push({
                    path: filePath,
                    size: fileData.size,
                    content: text.substring(0, 4000), // Max 4KB sample per key file
                  });
                }
              }
            } catch {
              // Ignore single file fetch error
            }
          }
        }
      }
    } catch {
      // Non-critical
    }

    return {
      owner,
      repo,
      isValidRepo: true,
      metadata: {
        stars: repoData.stargazers_count ?? 0,
        forks: repoData.forks_count ?? 0,
        defaultBranch,
        description: repoData.description ?? null,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        isPrivate: repoData.private ?? false,
      },
      languages,
      totalCommitsCount: recentCommits.length,
      recentCommits,
      readmeContent,
      fileTreeSummary,
      keyFileSamples,
    };
  } catch (err) {
    return {
      owner,
      repo,
      isValidRepo: false,
      error: `Network error connecting to GitHub API: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
