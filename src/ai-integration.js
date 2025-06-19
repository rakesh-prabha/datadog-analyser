// ===============================================
// AI INTEGRATION MODULE
// ===============================================
// Handles Google Gemini AI integration for log analysis

import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { CONFIG } from './log-analyzer.js';

dotenv.config();

// ===============================================
// CONFIGURATION
// ===============================================

const AI_CONFIG = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
    USE_VERTEX_AI: process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true'
};

// ===============================================
// AI CLIENTS
// ===============================================

export class GeminiClient {
    constructor() {
        this.validateConfiguration();
    }

    validateConfiguration() {
        if (AI_CONFIG.USE_VERTEX_AI) {
            if (!AI_CONFIG.GOOGLE_CLOUD_PROJECT || !AI_CONFIG.GOOGLE_CLOUD_LOCATION) {
                throw new Error('Vertex AI requires GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION in .env');
            }
        } else {
            if (!AI_CONFIG.GEMINI_API_KEY) {
                throw new Error('ML Dev API requires GEMINI_API_KEY in .env');
            }
        }
    }

    async generateAnalysis(analysisPrompt) {
        if (AI_CONFIG.USE_VERTEX_AI) {
            console.log('🤖 Using Vertex AI for analysis...');
            try {
                return await this.generateWithVertexAI(analysisPrompt);
            } catch (error) {
                console.warn('⚠️ Vertex AI failed, falling back to ML Dev API...');
                console.warn(`Vertex AI Error: ${error.message}`);
                return await this.generateWithMLDev(analysisPrompt);
            }
        } else {
            console.log('🤖 Using ML Dev API for analysis...');
            return await this.generateWithMLDev(analysisPrompt);
        }
    }

    async generateWithMLDev(promptContent) {
        if (!AI_CONFIG.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not found in environment variables');
        }

        const ai = new GoogleGenAI({ 
            vertexai: false, 
            apiKey: AI_CONFIG.GEMINI_API_KEY 
        });
        
        const response = await ai.models.generateContent({
            model: CONFIG.MODEL_NAME,
            contents: promptContent,
        });
        
        return response.text;
    }

    async generateWithVertexAI(promptContent) {
        const ai = new GoogleGenAI({
            vertexai: true,
            project: AI_CONFIG.GOOGLE_CLOUD_PROJECT,
            location: AI_CONFIG.GOOGLE_CLOUD_LOCATION,
        });
        
        const response = await ai.models.generateContent({
            model: CONFIG.MODEL_NAME,
            contents: promptContent,
        });
        
        return response.text;
    }
}

// ===============================================
// PROMPT GENERATOR
// ===============================================

export class PromptGenerator {
    constructor(data) {
        this.data = data;
    }

    generateAnalysisPrompt(analysisSummary) {
        const prompt = `You are an expert operations engineer specialized in analyzing application logs and identifying service health issues. I have provided a summary of ${CONFIG.ERROR_CODE_TO_LOOK_FOR} "Service Unavailable" errors found in a recent Datadog log export.

Your task is to analyze this summary and provide a concise, actionable report covering the following:

1.  **Overall Status:** Did ${CONFIG.ERROR_CODE_TO_LOOK_FOR} errors occur? If so, what is the total count?
2.  **Per-Store/Service Analysis:** List any stores or services that experienced ${CONFIG.ERROR_CODE_TO_LOOK_FOR} errors.
3.  **Order-Level Analysis:** Identify specific orders that failed and analyze patterns. This helps pinpoint which restaurant/location had issues.
4.  **Store-Level Impact:** Analyze which specific store locations (by Store ID and Store Name) were affected and their error patterns.
5.  **User-Level Impact:** Identify individual users affected and any patterns in user impact.
6.  **Identify High-Impact Areas:** Specifically highlight any store(s), service(s), users, or orders that experienced *multiple* (more than 1) ${CONFIG.ERROR_CODE_TO_LOOK_FOR} errors. Quantify the errors for these specific high-impact areas.
7.  **Recommended Next Steps:** Based on the presence and distribution of these errors, suggest immediate next steps for investigation and troubleshooting. Be specific (e.g., "Check logs for Store ID X", "Contact User Y", "Monitor Z metric for Service W", "Investigate Store Location for Order ID"). If no errors were found, state that and suggest ongoing monitoring.

--- Log Analysis Summary ---
${analysisSummary}
--- End of Summary ---

Please structure your answer clearly with headings for each point (Overall Status, Per-Store/Service Analysis, Order-Level Analysis, Store-Level Impact, User-Level Impact, High-Impact Areas, Recommended Next Steps). Keep it professional and focused on operational insights.`;

        return prompt;
    }

    generateBusinessImpactPrompt(analysisSummary) {
        const estimatedRevenue = this.data.uniqueOrders * 12; // $12 avg order
        
        return `As a business operations analyst, analyze this log data focusing on customer and revenue impact:

BUSINESS CONTEXT:
- Each failed order represents a lost customer transaction
- Average order value: $12
- Total revenue at risk: $${estimatedRevenue}
- Customer satisfaction impact: ${this.data.uniqueOrders} customers affected

KEY METRICS:
- Total 503 Errors: ${this.data.total503Errors}
- Unique Orders Affected: ${this.data.uniqueOrders}
- Unique Customers Affected: ${this.data.uniqueUsers}
- Store Locations Affected: ${this.data.uniqueStores}

Please provide:
1. **Executive Summary** - High-level business impact
2. **Customer Impact Analysis** - Which customers were most affected
3. **Store Performance Analysis** - Which locations need attention
4. **Revenue Impact Assessment** - Financial implications
5. **Operational Recommendations** - Immediate action items

--- Detailed Analysis ---
${analysisSummary}
--- End Analysis ---

Focus on business outcomes and actionable recommendations for management.`;
    }
}

export default { GeminiClient, PromptGenerator, AI_CONFIG };
