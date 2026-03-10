import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const localPlan = {
  nodes: {
    name: "ROOT",
    cost: 120,
    rows: 1500,
    type: "Aggregate",
    children: [
      { name: "Scan users", cost: 85, rows: 12000, type: "Seq Scan", children: [] },
      { name: "Index orders_by_user", cost: 20, rows: 1500, type: "Index Scan", children: [] },
    ],
  },
  expensiveOperations: ["Seq Scan users"],
};

export const analyzeSlowQuery = async (logContent: string, dbType: string) => {
  if (!ai) {
    const queries = logContent.split("\n").filter((line) => /(select|update|delete|insert|find\(|aggregate\()/i.test(line)).slice(0, 4);
    return {
      analysis: `Local analysis mode for ${dbType}: detected ${queries.length} candidate slow queries.`,
      recommendations: queries.map((query) => ({
        query,
        issue: "Possible scan-heavy access pattern",
        suggestion: "Create a selective index on filter + sort fields and avoid wildcard projection.",
        impact: "Reduced latency and CPU pressure",
      })),
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: `Analyze these ${dbType} slow query logs. Focus on index suggestions and query rewrites.\n${logContent}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING },
                issue: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                impact: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  return JSON.parse(response.text);
};

export const analyzeIncident = async (metrics: any, dbType: string) => {
  if (!ai) {
    const latest = metrics?.[metrics.length - 1] || {};
    const issues = [];
    if (latest.cpu > 85) issues.push({ title: "High CPU", severity: "high", description: "CPU saturation detected.", runbook: "Inspect top queries and missing indexes." });
    if (latest.replicationLag > 4) issues.push({ title: "Replication lag", severity: "critical", description: "Replica delay is rising.", runbook: "Check WAL/oplog throughput and network." });
    return { status: issues.length ? "degraded" : "healthy", issues };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: `Act as a senior DBA for ${dbType}. Analyze metrics and provide incident findings and runbook.\n${JSON.stringify(metrics)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                severity: { type: Type.STRING },
                description: { type: Type.STRING },
                runbook: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  return JSON.parse(response.text);
};

export const chatWithAssistant = async (message: string, context: any) => {
  if (!ai) {
    return `Local assistant mode:\n- Question: ${message}\n- Latest CPU: ${context?.metrics?.[context.metrics.length - 1]?.cpu?.toFixed?.(1) ?? "n/a"}%\n- Recommendation: inspect slow queries, indexes, and replica lag trends.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: `You are a Database Operations Copilot for PostgreSQL and MongoDB.\nContext: ${JSON.stringify(context)}\nUser: ${message}`,
  });
  return response.text;
};

export const visualizeExplainPlan = async (plan: string, dbType: string) => {
  if (!ai) {
    return localPlan;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: `Convert this ${dbType} explain plan into tree JSON and list expensive operations.\n${plan}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              cost: { type: Type.NUMBER },
              rows: { type: Type.NUMBER },
              type: { type: Type.STRING },
              children: { type: Type.ARRAY, items: { type: Type.OBJECT } },
            },
          },
          expensiveOperations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  });

  return JSON.parse(response.text);
};
