import { describe, expect, it } from "vitest";
import { parseSource } from "../src/cli.ts";

describe("parseSource", () => {
  it("parses colon-separated format", () => {
    expect(parseSource("owner/repo")).toEqual({
      source: "owner/repo",
      skills: [],
    });
    expect(parseSource("owner/repo:pdf")).toEqual({
      source: "owner/repo",
      skills: ["pdf"],
    });
    expect(parseSource("owner/repo:pdf:commit")).toEqual({
      source: "owner/repo",
      skills: ["pdf", "commit"],
    });
  });

  it("treats * as all skills", () => {
    expect(parseSource("owner/repo:*")).toEqual({
      source: "owner/repo",
      skills: [],
    });
    expect(parseSource("owner/repo:pdf:*")).toEqual({
      source: "owner/repo",
      skills: [],
    });
  });

  it("parses skills.sh URLs", () => {
    expect(parseSource("https://skills.sh/vercel-labs/skills")).toEqual({
      source: "vercel-labs/skills",
      skills: [],
    });
    expect(
      parseSource(
        "https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices"
      )
    ).toEqual({
      source: "vercel-labs/agent-skills",
      skills: ["vercel-react-best-practices"],
    });
    expect(parseSource("https://skills.sh/owner/repo/skill1/skill2")).toEqual({
      source: "owner/repo",
      skills: ["skill1", "skill2"],
    });
  });

  it("handles http:// URLs", () => {
    expect(parseSource("http://skills.sh/owner/repo/skill")).toEqual({
      source: "owner/repo",
      skills: ["skill"],
    });
  });

  it("handles URLs without protocol", () => {
    expect(parseSource("skills.sh/owner/repo/skill")).toEqual({
      source: "owner/repo",
      skills: ["skill"],
    });
    expect(parseSource("skills.sh/vercel-labs/skills")).toEqual({
      source: "vercel-labs/skills",
      skills: [],
    });
  });

  it("parses GitHub URLs", () => {
    expect(
      parseSource(
        "https://github.com/getsentry/sentry-for-ai/tree/main/skills/sentry-fix-issues"
      )
    ).toEqual({
      source: "getsentry/sentry-for-ai",
      skills: ["sentry-fix-issues"],
    });
    expect(
      parseSource("https://github.com/owner/repo/tree/main/skills/skill1")
    ).toEqual({
      source: "owner/repo",
      skills: ["skill1"],
    });
    expect(
      parseSource("https://github.com/owner/repo/tree/develop/skills/a/b")
    ).toEqual({
      source: "owner/repo",
      skills: ["a", "b"],
    });
  });

  it("returns raw input for invalid skills.sh URLs", () => {
    // Only namespace, no repo - returns as source with empty skills
    expect(parseSource("https://skills.sh/owner")).toEqual({
      source: "https://skills.sh/owner",
      skills: [],
    });
    expect(parseSource("skills.sh/owner")).toEqual({
      source: "skills.sh/owner",
      skills: [],
    });
  });
});
