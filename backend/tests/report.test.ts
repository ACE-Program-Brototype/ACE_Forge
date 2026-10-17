import { describe, it, expect } from "vitest";
import { reportSubmissionSchema } from "../src/validators/report";

describe("Report Submission Rules & AI Declaration", () => {
  it("should accept valid report submission with accepted AI declaration and valid GitHub URL", () => {
    const valid = reportSubmissionSchema.safeParse({
      studentTaskId: "st-12345",
      title: "Raft Leader Election in Go",
      description: "Implemented non-blocking RPC election timers with heartbeat ticks and unit tests for network partition edge cases.",
      githubRepoUrl: "https://github.com/diya-patel/raft-consensus",
      aiDeclarationAccepted: true,
    });

    expect(valid.success).toBe(true);
  });

  it("should accept GitHub repository URLs with .git extension, subpaths, and query strings", () => {
    const urls = [
      "https://github.com/diya-patel/raft-consensus.git",
      "https://github.com/diya-patel/raft-consensus/tree/main",
      "https://github.com/diya-patel/raft-consensus?tab=readme-ov-file",
      "https://github.com/diya-patel/raft-consensus/",
    ];

    for (const url of urls) {
      const parsed = reportSubmissionSchema.safeParse({
        studentTaskId: "st-12345",
        title: "Raft Leader Election in Go",
        description: "Implemented non-blocking RPC election timers with heartbeat ticks and unit tests for network partition edge cases.",
        githubRepoUrl: url,
        aiDeclarationAccepted: true,
      });
      expect(parsed.success, `Expected URL "${url}" to be valid`).toBe(true);
    }
  });

  it("should strictly reject report if AI declaration is false or omitted", () => {
    const invalid = reportSubmissionSchema.safeParse({
      studentTaskId: "st-12345",
      title: "Raft Leader Election in Go",
      description: "Implemented non-blocking RPC election timers with heartbeat ticks and unit tests for network partition edge cases.",
      githubRepoUrl: "https://github.com/diya-patel/raft-consensus",
      aiDeclarationAccepted: false,
    });

    expect(invalid.success).toBe(false);
  });

  it("should reject non-GitHub URLs", () => {
    const invalid = reportSubmissionSchema.safeParse({
      studentTaskId: "st-12345",
      title: "Raft Leader Election in Go",
      description: "Implemented non-blocking RPC election timers with heartbeat ticks and unit tests for network partition edge cases.",
      githubRepoUrl: "https://gitlab.com/diya-patel/raft-consensus",
      aiDeclarationAccepted: true,
    });

    expect(invalid.success).toBe(false);
  });

  it("should reject invalid GitHub repo URL structure", () => {
    const invalid = reportSubmissionSchema.safeParse({
      studentTaskId: "st-12345",
      title: "Raft Leader Election in Go",
      description: "Implemented non-blocking RPC election timers with heartbeat ticks and unit tests for network partition edge cases.",
      githubRepoUrl: "https://github.com/diya-patel", // missing repository name
      aiDeclarationAccepted: true,
    });

    expect(invalid.success).toBe(false);
  });

  it("should reject description shorter than 20 characters", () => {
    const invalid = reportSubmissionSchema.safeParse({
      studentTaskId: "st-12345",
      title: "Raft Leader Election in Go",
      description: "Too short",
      githubRepoUrl: "https://github.com/diya-patel/raft-consensus",
      aiDeclarationAccepted: true,
    });

    expect(invalid.success).toBe(false);
  });
});
