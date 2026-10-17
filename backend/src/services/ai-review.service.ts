import { prisma } from "../lib/prisma.js";
import { fetchGitHubRepoSnapshot, GitHubRepoSnapshot } from "./github.service.js";
import { env } from "../config/env.js";
import { FeedbackType, ReportStatus, Prisma } from "@prisma/client";

export interface AiEvaluationResult {
  marks: number;
  comments: string;
  strengths: string[];
  improvements: string[];
  aiGeneratedLikelihood: "low" | "medium" | "high";
  reasoning: string;
  taskAlignment: "high" | "medium" | "low";
}

/**
 * Robust JSON parser that handles markdown code block wrapping (```json ... ```)
 */
export function parseAiJsonResponse(text: string): AiEvaluationResult | null {
  try {
    let clean = text.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(clean);

    if (
      typeof parsed.marks === "number" &&
      typeof parsed.comments === "string" &&
      Array.isArray(parsed.strengths) &&
      Array.isArray(parsed.improvements)
    ) {
      return {
        marks: Math.max(0, Math.min(100, Math.round(parsed.marks))),
        comments: parsed.comments,
        strengths: parsed.strengths.map(String),
        improvements: parsed.improvements.map(String),
        aiGeneratedLikelihood: ["low", "medium", "high"].includes(parsed.aiGeneratedLikelihood)
          ? parsed.aiGeneratedLikelihood
          : "medium",
        reasoning: parsed.reasoning || "Evaluation based on commit frequency and code heuristics.",
        taskAlignment: ["high", "medium", "low"].includes(parsed.taskAlignment)
          ? parsed.taskAlignment
          : "medium",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fallback heuristic evaluator used when AI keys are not configured or in offline environments.
 */
export function generateHeuristicEvaluation(
  taskTitle: string,
  reportTitle: string,
  reportDescription: string,
  snapshot: GitHubRepoSnapshot
): AiEvaluationResult {
  let score = 70;
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (!snapshot.isValidRepo) {
    return {
      marks: 30,
      comments: `Unable to access GitHub repository (${snapshot.error || "inaccessible"}). Ensure repository is public and accessible.`,
      strengths: ["Submitted written milestone description"],
      improvements: [
        "Repository must be publicly accessible on GitHub",
        "Verify GitHub repository URL accuracy",
      ],
      aiGeneratedLikelihood: "high",
      reasoning: "Inaccessible repository prevents verification of authentic source code and commit history.",
      taskAlignment: "low",
    };
  }

  // Commit history depth
  const commitCount = snapshot.totalCommitsCount || 0;
  if (commitCount >= 8) {
    score += 12;
    strengths.push("Good incremental commit cadence demonstrating authentic iterative development");
  } else if (commitCount <= 2) {
    score -= 10;
    improvements.push("Avoid single-commit dumps; maintain incremental commit history with clear messages");
  }

  // File tree depth
  const fileCount = snapshot.fileTreeSummary?.length || 0;
  if (fileCount >= 5) {
    score += 8;
    strengths.push("Structured project layout with modular component organization");
  }

  // Description depth
  if (reportDescription.length > 200) {
    score += 5;
    strengths.push("Comprehensive written engineering synthesis detailing lessons learned");
  } else {
    improvements.push("Provide deeper technical analysis in milestone writeup");
  }

  if (snapshot.readmeContent && snapshot.readmeContent.length > 100) {
    strengths.push("Repository contains architectural README documentation");
  } else {
    improvements.push("Include a comprehensive README.md explaining architecture and build instructions");
  }

  score = Math.max(40, Math.min(95, score));

  return {
    marks: score,
    comments: `Automated assessment of repository "${snapshot.repo}" for task "${taskTitle}". ${
      commitCount >= 5
        ? "Demonstrates disciplined engineering practices with authentic commit history."
        : "Implementation meets baseline specifications but requires deeper commit progression and documentation."
    }`,
    strengths: strengths.length > 0 ? strengths : ["Functional repository submitted"],
    improvements:
      improvements.length > 0 ? improvements : ["Add unit tests and automated CI pipeline"],
    aiGeneratedLikelihood: commitCount <= 1 ? "medium" : "low",
    reasoning:
      commitCount <= 1
        ? "Low commit granularity; multiple commits recommended to reflect organic authoring."
        : "Organic multi-step commit cadence aligns with authentic student authoring.",
    taskAlignment: "high",
  };
}

/**
 * Call Google Gemini API (generateContent endpoint)
 */
export async function callGeminiApi(
  prompt: string,
  modelName: string,
  apiKey: string
): Promise<AiEvaluationResult | null> {
  const systemInstruction = `You are a senior principal engineer and computer science educator evaluating an engineering student's weekly task report and GitHub repository.
Evaluate whether the repository satisfies the task requirements, verify commit history authenticity (multiple authentic commits vs single dump), check code quality, and determine whether the report text appears AI-generated or copied.

You MUST respond strictly with valid JSON conforming to this TypeScript schema:
{
  "marks": number (0-100),
  "comments": string (concise, direct executive summary of assessment),
  "strengths": string[] (2-4 concrete strengths observed in repo/report),
  "improvements": string[] (2-4 actionable technical recommendations),
  "aiGeneratedLikelihood": "low" | "medium" | "high",
  "reasoning": string (justification for the AI likelihood score based on commits, coding patterns, and writeup authenticity),
  "taskAlignment": "high" | "medium" | "low"
}
Do not include any conversational preamble or markdown backticks outside the JSON.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const requestPayload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    };

    let res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    // If 503 (high demand) or 429 (rate limit), retry once after a short backoff
    if (!res.ok && (res.status === 503 || res.status === 429)) {
      console.warn(`[GEMINI API] HTTP ${res.status} spike detected. Retrying in 1.5s...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Google Gemini API call failed (HTTP ${res.status}):`, errorText);
      return null;
    }

    const data = (await res.json()) as any;
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      console.error("Gemini response missing text candidate part:", JSON.stringify(data));
      return null;
    }

    return parseAiJsonResponse(candidateText);
  } catch (err) {
    console.error("Network error connecting to Google Gemini API:", err);
    return null;
  }
}

/**
 * Call Anthropic Messages API (optional fallback)
 */
export async function callAnthropicApi(
  prompt: string,
  modelName: string,
  apiKey: string
): Promise<AiEvaluationResult | null> {
  const systemPrompt = `You are a senior principal engineer and computer science educator evaluating an engineering student's weekly task report and GitHub repository.
Evaluate whether the repository satisfies the task requirements, verify commit history authenticity (multiple authentic commits vs single dump), check code quality, and determine whether the report text appears AI-generated or copied.

You MUST respond strictly with valid JSON conforming to this TypeScript schema:
{
  "marks": number (0-100),
  "comments": string (concise, direct executive summary of assessment),
  "strengths": string[] (2-4 concrete strengths observed in repo/report),
  "improvements": string[] (2-4 actionable technical recommendations),
  "aiGeneratedLikelihood": "low" | "medium" | "high",
  "reasoning": string (justification for the AI likelihood score based on commits, coding patterns, and writeup authenticity),
  "taskAlignment": "high" | "medium" | "low"
}
Do not include any conversational preamble or markdown backticks outside the JSON.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 2048,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Anthropic API call failed (HTTP ${res.status}):`, errorText);
    return null;
  }

  const data = (await res.json()) as any;
  const textContent = data.content?.[0]?.text;
  if (!textContent) return null;

  return parseAiJsonResponse(textContent);
}

/**
 * Execute AI review pipeline for a submitted report:
 * 1. Fetch GitHub repo snapshot
 * 2. Send structured prompt to Google Gemini API (or fallback)
 * 3. Store Feedback row (type=AI) with enriched repoSnapshot and aiModel
 * 4. Update Report.status to AI_REVIEWED
 */
export async function triggerAsyncAiReview(reportId: string): Promise<void> {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        task: {
          select: { title: true, description: true, referenceLink: true },
        },
      },
    });

    if (!report) {
      console.error(`[AI REVIEW] Report ${reportId} not found.`);
      return;
    }

    console.log(`🔍 [AI REVIEW] Inspecting GitHub repo: ${report.githubRepoUrl}...`);
    const snapshot = await fetchGitHubRepoSnapshot(report.githubRepoUrl);

    const geminiKey = env.GEMINI_API_KEY.trim();
    const geminiModel = env.GEMINI_MODEL || "gemini-flash-latest";

    const anthropicKey = env.ANTHROPIC_API_KEY.trim();
    const anthropicModel = env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

    let evaluation: AiEvaluationResult | null = null;
    let activeAiModel = geminiModel;

    const prompt = `Evaluate the following engineering submission:
TASK:
Title: ${report.task.title}
Requirements: ${report.task.description}

STUDENT REPORT:
Title: ${report.title}
Student Writeup: ${report.description}

GITHUB REPOSITORY SNAPSHOT:
Owner/Repo: ${snapshot.owner}/${snapshot.repo}
Accessible: ${snapshot.isValidRepo}
Languages: ${JSON.stringify(snapshot.languages || {})}
Recent Commits (${snapshot.totalCommitsCount || 0}):
${(snapshot.recentCommits || []).slice(0, 10).map((c) => `- [${c.date}] ${c.message} (${c.author})`).join("\n")}

File Tree Sample:
${(snapshot.fileTreeSummary || []).slice(0, 30).join("\n")}

Key Code Snippets:
${(snapshot.keyFileSamples || []).map((f) => `--- File: ${f.path} ---\n${f.content.substring(0, 1500)}`).join("\n\n")}

Evaluate if the code satisfies the task, check code quality and architecture, verify commit authenticity, and identify if the work appears AI-generated or copied. Return strict JSON.`;

    if (geminiKey) {
      console.log(`🤖 [AI REVIEW] Evaluating with Google Gemini (${geminiModel})...`);
      activeAiModel = geminiModel;
      evaluation = await callGeminiApi(prompt, geminiModel, geminiKey);
    } else if (anthropicKey) {
      console.log(`🤖 [AI REVIEW] Evaluating with Anthropic Claude (${anthropicModel})...`);
      activeAiModel = anthropicModel;
      evaluation = await callAnthropicApi(prompt, anthropicModel, anthropicKey);
    }

    // If API unavailable or unconfigured, use heuristic analysis
    if (!evaluation) {
      console.log(`ℹ️ [AI REVIEW] Using structured heuristic evaluation engine.`);
      activeAiModel = `${geminiModel} (heuristic)`;
      evaluation = generateHeuristicEvaluation(
        report.task.title,
        report.title,
        report.description,
        snapshot
      );
    }

    // Persist Feedback row with enriched evaluation metadata in repoSnapshot
    const enrichedSnapshot = {
      ...snapshot,
      aiGeneratedLikelihood: evaluation.aiGeneratedLikelihood,
      reasoning: evaluation.reasoning,
      taskAlignment: evaluation.taskAlignment,
    };

    await prisma.feedback.upsert({
      where: {
        reportId_type: {
          reportId: report.id,
          type: FeedbackType.AI,
        },
      },
      update: {
        marks: evaluation.marks,
        comments: evaluation.comments,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        aiModel: activeAiModel,
        repoSnapshot: enrichedSnapshot as unknown as Prisma.InputJsonValue,
      },
      create: {
        reportId: report.id,
        taskId: report.taskId,
        studentId: report.studentId,
        type: FeedbackType.AI,
        marks: evaluation.marks,
        comments: evaluation.comments,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        aiModel: activeAiModel,
        repoSnapshot: enrichedSnapshot as unknown as Prisma.InputJsonValue,
      },
    });

    // Update Report status to AI_REVIEWED
    await prisma.report.update({
      where: { id: report.id },
      data: { status: ReportStatus.AI_REVIEWED },
    });

    console.log(`✅ [AI REVIEW COMPLETE] Report ${report.id} evaluated. Marks: ${evaluation.marks}/100.`);
  } catch (err) {
    console.error(`❌ [AI REVIEW FAILED] Report ${reportId}:`, err);
  }
}
