import { describe, it, expect } from "vitest";
import { parseGitHubUrl, GitHubRepoSnapshot } from "../src/services/github.service";
import { parseAiJsonResponse, generateHeuristicEvaluation } from "../src/services/ai-review.service";

describe("GitHub Integration & AI Review Service", () => {
  describe("GitHub URL Parsing", () => {
    it("should correctly extract owner and repo from standard GitHub URL", () => {
      const res = parseGitHubUrl("https://github.com/diya-patel/rate-limited-proxy");
      expect(res).not.toBeNull();
      expect(res?.owner).toBe("diya-patel");
      expect(res?.repo).toBe("rate-limited-proxy");
    });

    it("should handle trailing slash and .git extension", () => {
      const res = parseGitHubUrl("https://github.com/diya-patel/rate-limited-proxy.git/");
      expect(res).not.toBeNull();
      expect(res?.owner).toBe("diya-patel");
      expect(res?.repo).toBe("rate-limited-proxy");
    });

    it("should return null for non-github URLs", () => {
      expect(parseGitHubUrl("https://gitlab.com/user/repo")).toBeNull();
      expect(parseGitHubUrl("https://google.com")).toBeNull();
      expect(parseGitHubUrl("not-a-url")).toBeNull();
    });
  });

  describe("AI JSON Response Parsing", () => {
    it("should parse standard JSON string response", () => {
      const raw = JSON.stringify({
        marks: 88,
        comments: "Solid implementation with good test coverage.",
        strengths: ["Thread-safe rate limiter", "High code quality"],
        improvements: ["Add distributed Redis support"],
        aiGeneratedLikelihood: "low",
        reasoning: "Authentic multi-commit progression.",
        taskAlignment: "high",
      });

      const parsed = parseAiJsonResponse(raw);
      expect(parsed).not.toBeNull();
      expect(parsed?.marks).toBe(88);
      expect(parsed?.aiGeneratedLikelihood).toBe("low");
      expect(parsed?.strengths.length).toBe(2);
    });

    it("should strip markdown backticks and parse JSON successfully", () => {
      const rawWithFences = `\`\`\`json
{
  "marks": 92,
  "comments": "Exceptional system architecture and thorough benchmarks.",
  "strengths": ["Clean concurrent design"],
  "improvements": ["Add configuration reload"],
  "aiGeneratedLikelihood": "low",
  "reasoning": "Original code style.",
  "taskAlignment": "high"
}
\`\`\``;

      const parsed = parseAiJsonResponse(rawWithFences);
      expect(parsed).not.toBeNull();
      expect(parsed?.marks).toBe(92);
      expect(parsed?.strengths[0]).toBe("Clean concurrent design");
    });

    it("should return null for invalid or incomplete JSON", () => {
      expect(parseAiJsonResponse("Not a json at all")).toBeNull();
      expect(parseAiJsonResponse('{"partial": "json"')).toBeNull();
    });
  });

  describe("Heuristic Evaluator", () => {
    it("should generate balanced score for valid repository with commit history", () => {
      const mockSnapshot: GitHubRepoSnapshot = {
        owner: "aarav",
        repo: "http-proxy",
        isValidRepo: true,
        metadata: {
          stars: 1,
          forks: 0,
          defaultBranch: "main",
          description: "Reverse proxy",
          createdAt: "2026-10-01",
          updatedAt: "2026-10-12",
          isPrivate: false,
        },
        totalCommitsCount: 12,
        fileTreeSummary: ["main.go", "proxy.go", "limiter.go", "proxy_test.go", "README.md"],
        readmeContent: "# HTTP Proxy Project\nDetails...",
      };

      const result = generateHeuristicEvaluation(
        "Token-Bucket Proxy",
        "Implementation Milestone",
        "A thorough writeup detailing concurrency patterns and bench latency results exceeding 200 characters long for evaluation testing.",
        mockSnapshot
      );

      expect(result.marks).toBeGreaterThanOrEqual(75);
      expect(result.aiGeneratedLikelihood).toBe("low");
      expect(result.taskAlignment).toBe("high");
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it("should heavily penalize inaccessible or private repository", () => {
      const mockBrokenSnapshot: GitHubRepoSnapshot = {
        owner: "aarav",
        repo: "private-repo",
        isValidRepo: false,
        error: "Repository not found or is private",
      };

      const result = generateHeuristicEvaluation(
        "Token-Bucket Proxy",
        "Milestone",
        "Report writeup",
        mockBrokenSnapshot
      );

      expect(result.marks).toBeLessThanOrEqual(40);
      expect(result.aiGeneratedLikelihood).toBe("high");
      expect(result.taskAlignment).toBe("low");
    });
  });
});
