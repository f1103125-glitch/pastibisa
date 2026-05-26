import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

// API Route - Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", serverless: true, time: new Date() });
});

// API Route - AI Advice Engine
app.post("/api/ai/advise", async (req, res): Promise<any> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is missing",
        message: "Gemini API Key is missing. Please configuration GEMINI_API_KEY in your Vercel Environment Variables."
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
    ).slice(0, 50).join("\n");

    const budgetsStr = Object.entries(budget || {}).map(([cat, limit]) => 
      `- Category ${cat}: Budget NT$ ${Number(limit).toLocaleString('zh-TW')} (Spent: NT$ ${Number(spendingByCategory[cat] || 0).toLocaleString('zh-TW')})`
    ).join("\n");

    // Set up system instructions
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
    
    // Add chat history
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((chat: any) => {
        contentsList.push({
          role: chat.role === 'user' ? 'user' : 'model',
          parts: [{ text: chat.message }]
        });
      });
    }

    // Add latest prompt
    contentsList.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    // Call Gemini 3.5 Flash
    const response = await ai.models.generateContent({
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
    res.status(500).json({ 
      error: "Internal AI Engine Error", 
      message: "An error occurred while communicating with the AI backend: " + (err.message || err)
    });
  }
});

export default app;
