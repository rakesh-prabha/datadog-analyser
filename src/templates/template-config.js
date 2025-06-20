// ===============================================
// PROMPT TEMPLATE CONFIGURATION
// ===============================================
// Configuration settings for the prompt template system

export const TEMPLATE_CONFIG = {
    // Default template preferences
    defaults: {
        operational: 'operational-analysis-v3',
        business: 'business-impact-v2',
        executive: 'executive-summary-v1',
        technical: 'technical-deepdive-v1'
    },
    
    // Template versioning
    versioning: {
        enabled: true,
        autoUpgrade: false,
        deprecationWarnings: true
    },
    
    // Variable validation
    validation: {
        strictMode: false,
        warnOnMissing: true,
        failOnMissing: false
    },
    
    // Template customization
    customization: {
        allowOverrides: true,
        userTemplatesEnabled: false,
        organizationTemplates: false
    }
};

// ===============================================
// TEMPLATE VARIABLE DEFINITIONS
// ===============================================

export const VARIABLE_DEFINITIONS = {
    // Core system variables
    errorCode: {
        name: 'Error Code',
        description: 'HTTP error code being analyzed (e.g., 503)',
        type: 'string',
        required: true,
        example: '503'
    },
    
    errorCount: {
        name: 'Error Count',
        description: 'Total number of errors detected',
        type: 'number',
        required: true,
        example: 36
    },
    
    analysisSummary: {
        name: 'Analysis Summary',
        description: 'Processed summary of log analysis data',
        type: 'string',
        required: true,
        example: 'Log analysis results summary: Total logs analyzed: 180...'
    },
    
    // Business metrics
    estimatedRevenue: {
        name: 'Estimated Revenue',
        description: 'Calculated revenue impact in dollars',
        type: 'number',
        required: true,
        example: 432
    },
    
    uniqueOrders: {
        name: 'Unique Orders',
        description: 'Number of unique orders affected',
        type: 'number',
        required: true,
        example: 36
    },
    
    uniqueCustomers: {
        name: 'Unique Customers',
        description: 'Number of unique customers affected',
        type: 'number',
        required: true,
        example: 19
    },
    
    uniqueStores: {
        name: 'Unique Stores',
        description: 'Number of unique store locations affected',
        type: 'number',
        required: true,
        example: 2
    },
    
    averageOrderValue: {
        name: 'Average Order Value',
        description: 'Average value per order (calculated from actual data)',
        type: 'number',
        required: false,
        default: 12.00,
        example: 9.70
    },
    
    actualOrdersWithValues: {
        name: 'Orders with Known Values',
        description: 'Number of orders where actual values were extracted',
        type: 'number',
        required: false,
        default: 0,
        example: 32
    },

    actualRevenue: {
        name: 'Actual Revenue',
        description: 'Revenue calculated from orders with known values',
        type: 'number',
        required: false,
        default: 0,
        example: 310.40
    },

    estimatedMissingRevenue: {
        name: 'Estimated Missing Revenue',
        description: 'Estimated revenue from orders without known values',
        type: 'number',
        required: false,
        default: 0,
        example: 48.00
    },

    revenueBreakdown: {
        name: 'Revenue Breakdown',
        description: 'Detailed breakdown of revenue calculation methodology',
        type: 'string',
        required: false,
        default: 'Revenue calculation details not available',
        example: 'Known Values: $310.40 from 32 orders, Estimated: $48.00 from 4 orders'
    },

    individualOrdersInfo: {
        name: 'Individual Orders Information',
        description: 'Summary of individual order values and price ranges',
        type: 'string',
        required: false,
        default: 'Individual order information not available',
        example: 'Top order values: $17.90, $11.20, $8.20. Price range: $8.20 - $17.90'
    },

    // Context variables
    systemName: {
        name: 'System Name',
        description: 'Name of the system being analyzed',
        type: 'string',
        required: false,
        default: 'Log Analysis System',
        example: 'Order Processing Service'
    },
    
    timeRange: {
        name: 'Time Range',
        description: 'Time period of the analysis',
        type: 'string',
        required: false,
        default: 'Recent analysis period',
        example: '2025-06-18 21:00 - 22:00 UTC'
    },
    
    confidenceLevel: {
        name: 'Confidence Level',
        description: 'Data quality confidence assessment',
        type: 'string',
        required: false,
        default: 'HIGH',
        example: 'HIGH',
        allowedValues: ['HIGH', 'MEDIUM-HIGH', 'MEDIUM', 'LOW']
    }
};

// ===============================================
// TEMPLATE USAGE GUIDELINES
// ===============================================

export const USAGE_GUIDELINES = {
    operational: {
        audience: 'Operations Teams, DevOps Engineers, Site Reliability Engineers',
        purpose: 'Technical troubleshooting and immediate incident response',
        expectedOutput: 'Actionable technical steps, specific investigation areas',
        whenToUse: 'During active incidents, for technical root cause analysis'
    },
    
    business: {
        audience: 'Product Managers, Business Operations, Customer Success',
        purpose: 'Business impact assessment and customer communication',
        expectedOutput: 'Revenue impact, customer metrics, business recommendations',
        whenToUse: 'For stakeholder updates, impact assessment, resource allocation'
    },
    
    executive: {
        audience: 'C-Level Executives, Senior Leadership, Board Members',
        purpose: 'High-level incident summary and strategic decision making',
        expectedOutput: 'Executive summary, financial impact, strategic recommendations',
        whenToUse: 'Major incidents, board reporting, investment decisions'
    },
    
    technical: {
        audience: 'Software Engineers, Architects, Platform Teams',
        purpose: 'Deep technical analysis and code-level investigation',
        expectedOutput: 'Root cause analysis, code changes, architecture improvements',
        whenToUse: 'Post-incident reviews, architecture planning, technical debt reduction'
    }
};

// ===============================================
// TEMPLATE CUSTOMIZATION OPTIONS
// ===============================================

export const CUSTOMIZATION_OPTIONS = {
    // Role-specific modifications
    roleAdaptations: {
        'junior-engineer': {
            additionalContext: 'Provide detailed explanations and learning resources',
            verbosity: 'high',
            includeExamples: true
        },
        'senior-manager': {
            additionalContext: 'Focus on business implications and resource requirements',
            verbosity: 'medium',
            includeMetrics: true
        },
        'customer-support': {
            additionalContext: 'Include customer communication templates',
            verbosity: 'medium',
            includeCustomerImpact: true
        }
    },
    
    // Industry-specific adaptations
    industryAdaptations: {
        'ecommerce': {
            additionalMetrics: ['cart_abandonment', 'checkout_completion', 'payment_failures'],
            businessContext: 'Focus on revenue impact and customer experience'
        },
        'fintech': {
            additionalMetrics: ['transaction_volume', 'compliance_impact', 'security_implications'],
            businessContext: 'Emphasize regulatory and security aspects'
        },
        'healthcare': {
            additionalMetrics: ['patient_impact', 'compliance_status', 'safety_implications'],
            businessContext: 'Prioritize patient safety and regulatory compliance'
        }
    },
    
    // Organization-specific settings
    organizationSettings: {
        companyName: 'Your Organization',
        primaryStakeholders: ['Engineering', 'Operations', 'Business'],
        escalationProcedures: true,
        brandVoice: 'professional', // professional, casual, technical
        metricsPriority: ['customer_impact', 'revenue_impact', 'operational_impact']
    }
};

export default {
    TEMPLATE_CONFIG,
    VARIABLE_DEFINITIONS,
    USAGE_GUIDELINES,
    CUSTOMIZATION_OPTIONS
};
