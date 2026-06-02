import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date() });
  });

  // API Route - AI Advice Engine
  app.post("/api/ai/advise", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY is missing",
          message: "Gemini API Key is missing. Please add 'GEMINI_API_KEY' in the Settings > Secrets menu in AI Studio UI to enable AI advisor functionality."
        });
      }

      const { expenses, budget, categories, message, chatHistory, savingsReserve } = req.body;

      // Initialize GoogleGenAI client
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Format current status of finances
      const totalSpending = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
      const spendingByCategory = expenses.reduce((acc: any, exp: any) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {});

      const expenseListStr = expenses.map((e: any) => 
        `- NT$ ${Number(e.amount).toLocaleString('zh-TW')} | ${e.category} | ${e.description || 'No description'} (${e.date})`
      ).slice(0, 50).join("\n"); // limit top 50 in prompt to save context limit

      const budgetsStr = Object.entries(budget || {}).map(([cat, limit]) => 
        `- Category ${cat}: Budget NT$ ${Number(limit).toLocaleString('zh-TW')} (Spent: NT$ ${Number(spendingByCategory[cat] || 0).toLocaleString('zh-TW')})`
      ).join("\n");

      // Set up the system instructions for personal financial manager
      const systemInstruction = `You are "Kadek", an intelligent, wise, friendly, and budget-conscious Personal Financial Advisor AI.
You communicate clearly, professionally, and supportively in English.
Your goal is to help users track and manage their monthly expenses, provide critical but constructive financial analysis, and suggest realistic money-saving tactics corresponding to their spending profile.

Use Markdown formatting for responses. Use bullet points, bold highlights, and relevant emojis for optimal visual comfort. Include simple mathematical breakdowns if appropriate.

Analysis Principles:
1. If spending for a category or the total budget exceeds 80%, issue a warm warning and outline concrete mitigation actions (e.g., "Reduce cafe dine-outs for the next week").
2. Highlight areas with the highest spending and suggest tactics to tighten budgets in those areas.
3. Keep their custom "Savings Reserve / Goal" in mind. If they are eating into their savings cushion, remind them to stop non-prioritized expenses to protect their saving goal!
4. Conclude your analysis or advice with an inspiring and smart financial quote or motivation.`;

      const limitTarget = (budget.total || 0) - (savingsReserve || 0);
      const remainingSafeSpend = limitTarget - totalSpending;

      let prompt = `Here is my current monthly financial data in NTD (Taiwan New Dollars NT$):
- Monthly Overall Budget Limit: NT$ ${Number(budget.total || 0).toLocaleString('zh-TW')}
- Custom Savings Reserve/Goal: NT$ ${Number(savingsReserve || 0).toLocaleString('zh-TW')}
- Actual Spendable Allowance target: NT$ ${Number(limitTarget).toLocaleString('zh-TW')} (Target Budget - Savings Reserve)
- Total Spent So Far: NT$ ${totalSpending.toLocaleString('zh-TW')}
- Safe Remaining spendable limit: NT$ ${remainingSafeSpend.toLocaleString('zh-TW')}
- Budget Allocation by Category:
${budgetsStr || '- Not configured yet'}

- List of My Recent Expenses:
${expenseListStr || '- No expenses recorded yet'}

User Specific Query/Request:
"${message || 'Please provide a concise analysis and smart, tactical financial advice based on my spending habits and safe remaining limits.'}"
`;

      // Construct conversational messages
      const contentsList: any[] = [];
      
      // If there is a chat history, push it in order
      if (chatHistory && Array.isArray(chatHistory)) {
        chatHistory.forEach((chat: any) => {
          contentsList.push({
            role: chat.role === 'user' ? 'user' : 'model',
            parts: [{ text: chat.message }]
          });
        });
      }

      // Add the latest prompt
      contentsList.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      // Helper for robust retry-with-fallback logic
      const generateContentWithRetry = async (
        aiClient: any,
        reqOptions: { model: string; contents: any[]; config: any },
        maxRetries = 3
      ): Promise<any> => {
        let attempt = 0;
        let modelToUse = reqOptions.model;
        
        while (attempt < maxRetries) {
          try {
            return await aiClient.models.generateContent({
              ...reqOptions,
              model: modelToUse
            });
          } catch (err: any) {
            attempt++;
            const errMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            const isTransient = 
              err.status === 503 || 
              err.status === 429 || 
              errMsg.includes("503") || 
              errMsg.includes("429") || 
              errMsg.includes("UNAVAILABLE") || 
              errMsg.includes("RESOURCE_EXHAUSTED") ||
              errMsg.includes("high demand") ||
              errMsg.includes("overloaded");
              
            if (isTransient && attempt < maxRetries) {
              // Calculate delay: 1s, 2s, 4s...
              const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
              console.warn(`[AI Advice Engine] Transient error encountered on model ${modelToUse} (Attempt ${attempt}/${maxRetries}): ${errMsg}. Retrying in ${Math.round(delay)}ms...`);
              
              // On fallback, let's switch to the high-availability lite model gemini-3.1-flash-lite
              if (modelToUse === "gemini-3.5-flash") {
                console.log("[AI Advice Engine] Falling back to robust model 'gemini-3.1-flash-lite' to guarantee uptime under high demand.");
                modelToUse = "gemini-3.1-flash-lite";
              }
              
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              throw err;
            }
          }
        }
      };

      // Call Gemini with high-resilience retry mechanism
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: contentsList,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.75,
        }
      });

      const reply = response.text || "Sorry, I am unable to generate financial advice at the moment. Please try again shortly.";
      res.json({ advice: reply });

    } catch (err: any) {
      console.error("AI Error:", err);
      
      // Check if it's an API key expiration or invalidation error
      const errString = typeof err === 'object' ? JSON.stringify(err) : String(err);
      const isApiKeyError = 
        errString.includes("API key expired") || 
        errString.includes("API_KEY_INVALID") || 
        errString.includes("expired") || 
        errString.includes("key expired") ||
        (err.message && (
          err.message.includes("API key expired") || 
          err.message.includes("API_KEY_INVALID") || 
          err.message.includes("expired")
        ));

      if (isApiKeyError) {
        return res.status(401).json({
          error: "GEMINI_API_KEY_EXPIRED",
          message: "Your Gemini API Key has expired or is invalid. If you are experiencing this inside AI Studio, please refresh the page or check the 'Secrets' panel in Settings. If you have deployed this app to Vercel/GitHub, please go to your Vercel Dashboard, select your project, go to 'Settings > Environment Variables', and update the 'GEMINI_API_KEY' with a fresh API Key from Google AI Studio (https://aistudio.google.com/)."
        });
      }

      res.status(500).json({ 
        error: "Internal AI Engine Error", 
        message: "An error occurred while communicating with the AI backend: " + (err.message || err)
      });
    }
  });

  // Serve static assets / Handle Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production builds serve 'dist/' content
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express and Vite development server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
