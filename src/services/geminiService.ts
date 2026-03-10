import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeSlowQuery = async (logContent: string, dbType: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze the following ${dbType} slow query logs and provide optimization suggestions, including index improvements and query rewrites.
    Supported types: PostgreSQL, MongoDB, MySQL, Redis, SQL Server.
    
    Logs:
    ${logContent}`,
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
                impact: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text);
};

export const analyzeIncident = async (metrics: any, dbType: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Act as a senior DBA. Analyze these ${dbType} metrics and detect any anomalies or performance issues. Provide a troubleshooting runbook.
    
    Metrics:
    ${JSON.stringify(metrics)}`,
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
                runbook: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text);
};

export const chatWithAssistant = async (message: string, context: any) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a Database Operations Copilot. Answer the user's question about database performance, optimization, or troubleshooting.
    
    Context:
    ${JSON.stringify(context)}
    
    User: ${message}`,
  });
  return response.text;
};

export const visualizeExplainPlan = async (plan: string, dbType: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Convert this ${dbType} explain plan into a structured JSON format suitable for a tree visualization. Identify the most expensive operations.
    
    Plan:
    ${plan}`,
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
              children: { type: Type.ARRAY, items: { type: Type.OBJECT } }
            }
          },
          expensiveOperations: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  return JSON.parse(response.text);
};
