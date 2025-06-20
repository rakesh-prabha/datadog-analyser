// ===============================================
// AI PROMPT TEMPLATES SYSTEM
// ===============================================
// Centralized, reusable templates for different analysis types
// Supports variable interpolation and template inheritance

// ===============================================
// TEMPLATE CONFIGURATION
// ===============================================

export const TEMPLATE_TYPES = {
    OPERATIONAL: 'operational',
    BUSINESS: 'business',
    EXECUTIVE: 'executive',
    TECHNICAL: 'technical'
};

export const TEMPLATE_VARIABLES = {
    // Error-specific variables
    ERROR_CODE: 'errorCode',
    ERROR_COUNT: 'errorCount',
    ANALYSIS_SUMMARY: 'analysisSummary',
    
    // Business metrics
    ESTIMATED_REVENUE: 'estimatedRevenue',
    AVERAGE_ORDER_VALUE: 'averageOrderValue',
    ACTUAL_ORDERS_WITH_VALUES: 'actualOrdersWithValues',
    UNIQUE_ORDERS: 'uniqueOrders',
    UNIQUE_CUSTOMERS: 'uniqueCustomers',
    UNIQUE_STORES: 'uniqueStores',
    
    // Context variables
    SYSTEM_NAME: 'systemName',
    TIME_RANGE: 'timeRange',
    CONFIDENCE_LEVEL: 'confidenceLevel'
};

// ===============================================
// BASE TEMPLATE CLASS
// ===============================================

class PromptTemplate {
    constructor(templateConfig) {
        this.id = templateConfig.id;
        this.name = templateConfig.name;
        this.description = templateConfig.description;
        this.template = templateConfig.template;
        this.variables = templateConfig.variables || [];
        this.type = templateConfig.type;
        this.version = templateConfig.version || '1.0';
    }

    /**
     * Render the template with provided variables
     * @param {Object} variables - Key-value pairs for template interpolation
     * @returns {String} Rendered prompt
     */
    render(variables = {}) {
        let renderedTemplate = this.template;
        
        // Replace template variables
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            renderedTemplate = renderedTemplate.replace(new RegExp(placeholder, 'g'), value);
        });
        
        // Validate that all required variables are provided
        this.validateRendering(renderedTemplate);
        
        return renderedTemplate;
    }

    /**
     * Validate that template rendering is complete
     * @param {String} rendered - Rendered template string
     */
    validateRendering(rendered) {
        const missingVariables = rendered.match(/\{\{[^}]+\}\}/g);
        if (missingVariables) {
            console.warn(`⚠️ Template ${this.id}: Missing variables:`, missingVariables);
        }
    }

    /**
     * Get template metadata
     * @returns {Object} Template information
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            type: this.type,
            version: this.version,
            variables: this.variables
        };
    }
}

// ===============================================
// OPERATIONAL ANALYSIS TEMPLATE
// ===============================================

const OPERATIONAL_TEMPLATE = new PromptTemplate({
    id: 'operational-analysis-v3',
    name: 'Operational Analysis Prompt',
    description: 'Technical operations prompt for service health analysis',
    type: TEMPLATE_TYPES.OPERATIONAL,
    version: '3.0',
    variables: [
        TEMPLATE_VARIABLES.ERROR_CODE,
        TEMPLATE_VARIABLES.ANALYSIS_SUMMARY
    ],
    template: `You are an expert operations engineer specialized in analyzing application logs and identifying service health issues. I have provided a summary of {{errorCode}} "Service Unavailable" errors found in a recent Datadog log export.

Your task is to analyze this summary and provide a concise, actionable report covering the following:

1.  **Overall Status:** Did {{errorCode}} errors occur? If so, what is the total count?
2.  **Per-Store/Service Analysis:** List any stores or services that experienced {{errorCode}} errors.
3.  **Order-Level Analysis:** Identify specific orders that failed and analyze patterns. This helps pinpoint which restaurant/location had issues.
4.  **Store-Level Impact:** Analyze which specific store locations (by Store ID and Store Name) were affected and their error patterns.
5.  **User-Level Impact:** Identify individual users affected and any patterns in user impact.
6.  **Identify High-Impact Areas:** Specifically highlight any store(s), service(s), users, or orders that experienced *multiple* (more than 1) {{errorCode}} errors. Quantify the errors for these specific high-impact areas.
7.  **Recommended Next Steps:** Based on the presence and distribution of these errors, suggest immediate next steps for investigation and troubleshooting. Be specific (e.g., "Check logs for Store ID X", "Contact User Y", "Monitor Z metric for Service W", "Investigate Store Location for Order ID"). If no errors were found, state that and suggest ongoing monitoring.

--- Log Analysis Summary ---
{{analysisSummary}}
--- End of Summary ---

Please structure your answer clearly with headings for each point (Overall Status, Per-Store/Service Analysis, Order-Level Analysis, Store-Level Impact, User-Level Impact, High-Impact Areas, Recommended Next Steps). Keep it professional and focused on operational insights.`
});

// ===============================================
// BUSINESS IMPACT TEMPLATE
// ===============================================

const BUSINESS_TEMPLATE = new PromptTemplate({
    id: 'business-impact-v2',
    name: 'Business Impact Analysis Prompt',
    description: 'Business-focused prompt for stakeholder and management analysis',
    type: TEMPLATE_TYPES.BUSINESS,
    version: '2.0',
    variables: [
        TEMPLATE_VARIABLES.ESTIMATED_REVENUE,
        TEMPLATE_VARIABLES.AVERAGE_ORDER_VALUE,
        TEMPLATE_VARIABLES.ACTUAL_ORDERS_WITH_VALUES,
        TEMPLATE_VARIABLES.UNIQUE_ORDERS,
        TEMPLATE_VARIABLES.UNIQUE_CUSTOMERS,
        TEMPLATE_VARIABLES.UNIQUE_STORES,
        TEMPLATE_VARIABLES.ERROR_COUNT,
        TEMPLATE_VARIABLES.ANALYSIS_SUMMARY
    ],
    template: `As a business operations analyst, analyze this log data focusing on customer and revenue impact:

BUSINESS CONTEXT:
- Each failed order represents a lost customer transaction
- Average order value: ${{averageOrderValue}} (calculated from actual order data)
- Total revenue at risk: ${{estimatedRevenue}}
- Customer satisfaction impact: {{uniqueOrders}} customers affected

KEY METRICS:
- Total 503 Errors: {{errorCount}}
- Unique Orders Affected: {{uniqueOrders}}
- Unique Customers Affected: {{uniqueCustomers}}
- Store Locations Affected: {{uniqueStores}}
- Orders with Known Values: {{actualOrdersWithValues}} of {{uniqueOrders}}

Please provide:
1. **Executive Summary** - High-level business impact
2. **Customer Impact Analysis** - Which customers were most affected
3. **Store Performance Analysis** - Which locations need attention
4. **Revenue Impact Assessment** - Financial implications
5. **Operational Recommendations** - Immediate action items

--- Detailed Analysis ---
{{analysisSummary}}
--- End Analysis ---

Focus on business outcomes and actionable recommendations for management.`
});

// ===============================================
// EXECUTIVE SUMMARY TEMPLATE
// ===============================================

const EXECUTIVE_TEMPLATE = new PromptTemplate({
    id: 'executive-summary-v1',
    name: 'Executive Summary Prompt',
    description: 'High-level executive summary for C-level stakeholders',
    type: TEMPLATE_TYPES.EXECUTIVE,
    version: '1.0',
    variables: [
        TEMPLATE_VARIABLES.ERROR_COUNT,
        TEMPLATE_VARIABLES.ESTIMATED_REVENUE,
        TEMPLATE_VARIABLES.UNIQUE_CUSTOMERS,
        TEMPLATE_VARIABLES.CONFIDENCE_LEVEL,
        TEMPLATE_VARIABLES.ANALYSIS_SUMMARY
    ],
    template: `As a senior business consultant, provide an executive summary of this system incident for C-level stakeholders:

INCIDENT OVERVIEW:
- System Impact: {{errorCount}} service failures detected
- Customer Impact: {{uniqueCustomers}} customers affected
- Revenue Impact: ${{estimatedRevenue}} at risk
- Data Confidence: {{confidenceLevel}} reliability

EXECUTIVE REQUIREMENTS:
1. **Executive Summary** (2-3 sentences) - What happened and business impact
2. **Customer Impact** - How many customers affected and potential churn risk
3. **Financial Impact** - Revenue loss and business continuity implications
4. **Action Required** - What leadership needs to authorize/approve
5. **Timeline** - How quickly this needs resolution
6. **Prevention** - Investment needed to prevent recurrence

--- Technical Analysis ---
{{analysisSummary}}
--- End Analysis ---

Keep language business-focused, avoid technical jargon, focus on decisions needed from leadership.`
});

// ===============================================
// TECHNICAL DEEP-DIVE TEMPLATE
// ===============================================

const TECHNICAL_TEMPLATE = new PromptTemplate({
    id: 'technical-deepdive-v1',
    name: 'Technical Deep-Dive Prompt',
    description: 'Detailed technical analysis for engineering teams',
    type: TEMPLATE_TYPES.TECHNICAL,
    version: '1.0',
    variables: [
        TEMPLATE_VARIABLES.ERROR_CODE,
        TEMPLATE_VARIABLES.SYSTEM_NAME,
        TEMPLATE_VARIABLES.TIME_RANGE,
        TEMPLATE_VARIABLES.ANALYSIS_SUMMARY
    ],
    template: `You are a senior software engineer performing root cause analysis on a production incident:

INCIDENT DETAILS:
- Error Type: {{errorCode}} Service Unavailable
- System: {{systemName}}
- Time Range: {{timeRange}}

ENGINEERING ANALYSIS REQUIRED:
1. **Root Cause Analysis** - Most likely technical causes based on error patterns
2. **Service Dependencies** - Which downstream services might be involved
3. **Code Investigation** - Specific functions/modules to examine
4. **Infrastructure Analysis** - Resource constraints, scaling issues, network problems
5. **Data Correlation** - Patterns in timing, geography, user types
6. **Monitoring Gaps** - What alerting/logging should be added
7. **Technical Remediation** - Specific code/config changes needed
8. **Testing Strategy** - How to verify fix and prevent regression

--- System Analysis Data ---
{{analysisSummary}}
--- End Data ---

Provide specific technical recommendations suitable for sprint planning and implementation.`
});

// ===============================================
// TEMPLATE REGISTRY
// ===============================================

export class PromptTemplateRegistry {
    constructor() {
        this.templates = new Map();
        this.registerDefaultTemplates();
    }

    /**
     * Register default templates
     */
    registerDefaultTemplates() {
        this.register(OPERATIONAL_TEMPLATE);
        this.register(BUSINESS_TEMPLATE);
        this.register(EXECUTIVE_TEMPLATE);
        this.register(TECHNICAL_TEMPLATE);
    }

    /**
     * Register a new template
     * @param {PromptTemplate} template - Template to register
     */
    register(template) {
        this.templates.set(template.id, template);
    }

    /**
     * Get template by ID
     * @param {String} templateId - Template identifier
     * @returns {PromptTemplate|null} Template or null if not found
     */
    getTemplate(templateId) {
        return this.templates.get(templateId) || null;
    }

    /**
     * Get templates by type
     * @param {String} type - Template type
     * @returns {Array<PromptTemplate>} Array of matching templates
     */
    getTemplatesByType(type) {
        return Array.from(this.templates.values()).filter(template => template.type === type);
    }

    /**
     * List all available templates
     * @returns {Array<Object>} Array of template metadata
     */
    listTemplates() {
        return Array.from(this.templates.values()).map(template => template.getMetadata());
    }

    /**
     * Render template with variables
     * @param {String} templateId - Template identifier
     * @param {Object} variables - Variables for interpolation
     * @returns {String|null} Rendered prompt or null if template not found
     */
    renderTemplate(templateId, variables = {}) {
        const template = this.getTemplate(templateId);
        if (!template) {
            console.error(`❌ Template not found: ${templateId}`);
            return null;
        }
        
        return template.render(variables);
    }
}

// ===============================================
// EXPORTS
// ===============================================

export {
    PromptTemplate,
    OPERATIONAL_TEMPLATE,
    BUSINESS_TEMPLATE,
    EXECUTIVE_TEMPLATE,
    TECHNICAL_TEMPLATE
};

export default PromptTemplateRegistry;
