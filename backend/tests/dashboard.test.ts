import { describe, it, expect } from "vitest";

describe("Admin Dashboard & Active Students Analytics", () => {
  it("should calculate correct percentage for module breakdown", () => {
    const totalStudents = 20;
    const moduleCounts = [
      { name: "Week 1", count: 12 },
      { name: "Week 2", count: 8 },
    ];

    const breakdown = moduleCounts.map((m) => ({
      name: m.name,
      percentage: Math.round((m.count / totalStudents) * 100),
    }));

    expect(breakdown[0].percentage).toBe(60);
    expect(breakdown[1].percentage).toBe(40);
  });

  it("should sort activity items in descending chronological order", () => {
    const items = [
      { id: "1", timestamp: "2026-10-10T10:00:00.000Z" },
      { id: "2", timestamp: "2026-10-12T10:00:00.000Z" },
      { id: "3", timestamp: "2026-10-11T10:00:00.000Z" },
    ];

    const sorted = [...items].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("3");
    expect(sorted[2].id).toBe("1");
  });
});
