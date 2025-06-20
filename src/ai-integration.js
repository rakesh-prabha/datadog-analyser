// ===============================================
// AI INTEGRATION MODULE
// ===============================================
// Handles Google Gemini AI integration with template system

import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { CONFIG } from './log-analyzer.js';
import PromptTemplateRegistry, { TEMPLATE_TYPES } from './templates/prompt-templates.js';
import { TEMPLATE_CONFIG } from './templates/template-config.js';

dotenv.config();

// ===============================================
// CONFIGURATION
// ===============================================

export const AI_CONFIG = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
    USE_VERTEX_AI: process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true',
    
    // Template System Configuration
    defaultTemplates: TEMPLATE_CONFIG.defaults,
    templateValidation: TEMPLATE_CONFIG.validation,
    
    // AI Model Configuration
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxOutputTokens: 2048,
    
    // API Configuration
    apiTimeout: 30000,
    retryAttempts: 2,
    retryDelay: 1000
};

// ===============================================
// AI CLIENTS
// ===============================================

export class GeminiClient {
    constructor() {
        this.validateConfiguration();
        this.templateRegistry = new PromptTemplateRegistry();
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

    /**
     * Generate analysis using specified template
     * @param {String} templateType - Type of template to use
     * @param {Object} variables - Variables for template interpolation
     * @returns {String} AI analysis response
     */
    async generateAnalysisWithTemplate(templateType, variables) {
        const templateId = AI_CONFIG.defaultTemplates[templateType];
        const prompt = this.templateRegistry.renderTemplate(templateId, variables);
        
        if (!prompt) {
            throw new Error(`Failed to render template: ${templateId}`);
        }
        
        return await this.generateAnalysis(prompt);
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
// ENHANCED PROMPT GENERATOR WITH TEMPLATE SYSTEM
// ===============================================

export class PromptGenerator {
    constructor(data) {
        this.data = data;
        this.templateRegistry = new PromptTemplateRegistry();
    }

    /**
     * Generate operational analysis prompt using template
     * @param {String} analysisSummary - Analysis summary data
     * @returns {String} Rendered prompt
     */
    generateAnalysisPrompt(analysisSummary) {
        const variables = {
            errorCode: CONFIG.ERROR_CODE_TO_LOOK_FOR,
            analysisSummary: analysisSummary
        };
        
        return this.templateRegistry.renderTemplate(
            AI_CONFIG.defaultTemplates.operational,
            variables
        );
    }

    /**
     * Generate business impact prompt using template
     * @param {String} analysisSummary - Analysis summary data
     * @returns {String} Rendered prompt
     */
    generateBusinessImpactPrompt(analysisSummary) {
        const revenueData = this.data.totalRevenueAtRisk;
        
        // Calculate detailed revenue breakdown
        let estimatedRevenue, averageOrderValue, actualRevenue = 0, estimatedMissingRevenue = 0;
        let revenueBreakdown = '';
        let individualOrdersInfo = '';
        
        if (revenueData.ordersWithValues > 0) {
            // Use actual order values when available
            actualRevenue = revenueData.totalRevenue;
            averageOrderValue = revenueData.averageOrderValue;
            
            // Get individual order values for context
            const ordersWithValues = [];
            for (const [orderId, value] of this.data.orderValues.entries()) {
                if (value && value > 0) {
                    ordersWithValues.push({ orderId: orderId.substring(0, 8), value });
                }
            }
            
            // Sort by value descending
            ordersWithValues.sort((a, b) => b.value - a.value);
            
            // Create summary of individual orders (top 5)
            const topOrders = ordersWithValues.slice(0, 5);
            if (topOrders.length > 0) {
                individualOrdersInfo = `Top order values: ${topOrders.map(o => `$${o.value.toFixed(2)}`).join(', ')}`;
                if (ordersWithValues.length > 5) {
                    individualOrdersInfo += ` (showing 5 of ${ordersWithValues.length} orders with known values)`;
                }
                
                // Add price range
                const minValue = Math.min(...ordersWithValues.map(o => o.value));
                const maxValue = Math.max(...ordersWithValues.map(o => o.value));
                individualOrdersInfo += `. Price range: $${minValue.toFixed(2)} - $${maxValue.toFixed(2)}`;
            }
            
            // Calculate missing revenue if any
            if (revenueData.ordersWithValues < this.data.uniqueOrders) {
                const missingOrders = this.data.uniqueOrders - revenueData.ordersWithValues;
                estimatedMissingRevenue = missingOrders * revenueData.averageOrderValue;
                estimatedRevenue = actualRevenue + estimatedMissingRevenue;
                
                revenueBreakdown = `Known Values: $${actualRevenue.toFixed(2)} from ${revenueData.ordersWithValues} orders, Estimated: $${estimatedMissingRevenue.toFixed(2)} from ${missingOrders} orders`;
            } else {
                estimatedRevenue = actualRevenue;
                revenueBreakdown = `All ${revenueData.ordersWithValues} orders have known values`;
            }
        } else {
            // Fallback to estimated average
            averageOrderValue = 12;
            estimatedRevenue = this.data.uniqueOrders * averageOrderValue;
            revenueBreakdown = `All revenue estimated using $${averageOrderValue} average (no actual values extracted)`;
            individualOrdersInfo = 'No individual order values could be extracted from the logs';
        }
        
        const variables = {
            estimatedRevenue: estimatedRevenue.toFixed(2),
            actualRevenue: actualRevenue.toFixed(2),
            estimatedMissingRevenue: estimatedMissingRevenue.toFixed(2),
            averageOrderValue: averageOrderValue.toFixed(2),
            actualOrdersWithValues: revenueData.ordersWithValues,
            revenueBreakdown: revenueBreakdown,
            individualOrdersInfo: individualOrdersInfo,
            uniqueOrders: this.data.uniqueOrders,
            uniqueCustomers: this.data.uniqueUsers,
            uniqueStores: this.data.uniqueStores,
            errorCount: this.data.total503Errors,
            analysisSummary: analysisSummary
        };
        
        return this.templateRegistry.renderTemplate(
            AI_CONFIG.defaultTemplates.business,
            variables
        );
    }

    /**
     * Generate executive summary prompt using template
     * @param {String} analysisSummary - Analysis summary data
     * @param {String} confidenceLevel - Data confidence level
     * @returns {String} Rendered prompt
     */
    generateExecutiveSummaryPrompt(analysisSummary, confidenceLevel = 'HIGH') {
        const estimatedRevenue = this.data.uniqueOrders * 12;
        
        const variables = {
            errorCount: this.data.total503Errors,
            estimatedRevenue: estimatedRevenue,
            uniqueCustomers: this.data.uniqueUsers,
            confidenceLevel: confidenceLevel,
            analysisSummary: analysisSummary
        };
        
        return this.templateRegistry.renderTemplate(
            AI_CONFIG.defaultTemplates.executive,
            variables
        );
    }

    /**
     * Generate technical deep-dive prompt using template
     * @param {String} analysisSummary - Analysis summary data
     * @param {String} systemName - Name of the system being analyzed
     * @param {String} timeRange - Time range of analysis
     * @returns {String} Rendered prompt
     */
    generateTechnicalPrompt(analysisSummary, systemName = 'Order Processing Service', timeRange = 'Recent analysis period') {
        const variables = {
            errorCode: CONFIG.ERROR_CODE_TO_LOOK_FOR,
            systemName: systemName,
            timeRange: timeRange,
            analysisSummary: analysisSummary
        };
        
        return this.templateRegistry.renderTemplate(
            AI_CONFIG.defaultTemplates.technical,
            variables
        );
    }

    /**
     * Generate prompt using custom template
     * @param {String} templateId - Template identifier
     * @param {Object} customVariables - Custom variables for template
     * @param {String} analysisSummary - Analysis summary data
     * @returns {String} Rendered prompt
     */
    generateCustomPrompt(templateId, customVariables = {}, analysisSummary) {
        const defaultVariables = {
            errorCode: CONFIG.ERROR_CODE_TO_LOOK_FOR,
            errorCount: this.data.total503Errors,
            uniqueOrders: this.data.uniqueOrders,
            uniqueCustomers: this.data.uniqueUsers,
            uniqueStores: this.data.uniqueStores,
            estimatedRevenue: this.data.uniqueOrders * 12,
            analysisSummary: analysisSummary
        };
        
        const variables = { ...defaultVariables, ...customVariables };
        
        return this.templateRegistry.renderTemplate(templateId, variables);
    }

    /**
     * List available templates
     * @returns {Array} Array of template metadata
     */
    getAvailableTemplates() {
        return this.templateRegistry.listTemplates();
    }

    /**
     * Get templates by type
     * @param {String} type - Template type
     * @returns {Array} Array of templates
     */
    getTemplatesByType(type) {
        return this.templateRegistry.getTemplatesByType(type);
    }
}

export default { GeminiClient, PromptGenerator, AI_CONFIG };
