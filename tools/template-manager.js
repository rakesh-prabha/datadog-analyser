#!/usr/bin/env node

// ===============================================
// TEMPLATE MANAGEMENT UTILITY
// ===============================================
// Command-line utility for managing AI prompt templates

import PromptTemplateRegistry, { 
    TEMPLATE_TYPES,
    OPERATIONAL_TEMPLATE,
    BUSINESS_TEMPLATE,
    EXECUTIVE_TEMPLATE,
    TECHNICAL_TEMPLATE 
} from '../src/templates/prompt-templates.js';
import { TEMPLATE_CONFIG, USAGE_GUIDELINES } from '../src/templates/template-config.js';

// ===============================================
// COMMAND-LINE INTERFACE
// ===============================================

class TemplateManager {
    constructor() {
        this.registry = new PromptTemplateRegistry();
    }

    /**
     * List all available templates
     */
    listTemplates() {
        console.log('📝 Available AI Prompt Templates\n');
        console.log('='.repeat(50));
        
        const templates = this.registry.listTemplates();
        
        Object.values(TEMPLATE_TYPES).forEach(type => {
            const typeTemplates = templates.filter(t => t.type === type);
            if (typeTemplates.length > 0) {
                console.log(`\n🎯 ${type.toUpperCase()} TEMPLATES:`);
                typeTemplates.forEach(template => {
                    console.log(`  ├── ${template.id} (v${template.version})`);
                    console.log(`  │   ${template.description}`);
                    console.log(`  │   Variables: ${template.variables.join(', ')}`);
                });
            }
        });
        
        console.log('\n' + '='.repeat(50));
    }

    /**
     * Show template details
     * @param {String} templateId - Template identifier
     */
    showTemplate(templateId) {
        const template = this.registry.getTemplate(templateId);
        
        if (!template) {
            console.error(`❌ Template not found: ${templateId}`);
            return;
        }
        
        console.log(`📋 Template Details: ${template.id}\n`);
        console.log('='.repeat(50));
        console.log(`Name: ${template.name}`);
        console.log(`Description: ${template.description}`);
        console.log(`Type: ${template.type}`);
        console.log(`Version: ${template.version}`);
        console.log(`Variables: ${template.variables.join(', ')}`);
        
        const usage = USAGE_GUIDELINES[template.type];
        if (usage) {
            console.log(`\n📖 Usage Guidelines:`);
            console.log(`Audience: ${usage.audience}`);
            console.log(`Purpose: ${usage.purpose}`);
            console.log(`Expected Output: ${usage.expectedOutput}`);
            console.log(`When to Use: ${usage.whenToUse}`);
        }
        
        console.log(`\n📝 Template Content:`);
        console.log('-'.repeat(50));
        console.log(template.template);
        console.log('-'.repeat(50));
    }

    /**
     * Test template rendering with sample data
     * @param {String} templateId - Template identifier
     */
    testTemplate(templateId) {
        const template = this.registry.getTemplate(templateId);
        
        if (!template) {
            console.error(`❌ Template not found: ${templateId}`);
            return;
        }
        
        // Sample test data
        const sampleData = {
            errorCode: '503',
            errorCount: 36,
            analysisSummary: 'Sample analysis summary: 36 errors found affecting 19 customers across 2 store locations...',
            estimatedRevenue: 432,
            uniqueOrders: 36,
            uniqueCustomers: 19,
            uniqueStores: 2,
            systemName: 'Order Processing Service',
            timeRange: '2025-06-18 21:00 - 22:00 UTC',
            confidenceLevel: 'HIGH'
        };
        
        console.log(`🧪 Testing Template: ${template.id}\n`);
        console.log('='.repeat(50));
        
        try {
            const renderedPrompt = this.registry.renderTemplate(templateId, sampleData);
            console.log('✅ Template rendered successfully!\n');
            console.log('📝 Rendered Prompt:');
            console.log('-'.repeat(50));
            console.log(renderedPrompt);
            console.log('-'.repeat(50));
        } catch (error) {
            console.error(`❌ Template rendering failed: ${error.message}`);
        }
    }

    /**
     * Show usage examples
     */
    showUsageExamples() {
        console.log('💡 Template Usage Examples\n');
        console.log('='.repeat(50));
        
        console.log(`
🔧 Basic Usage in Code:

import PromptTemplateRegistry from './templates/prompt-templates.js';

const registry = new PromptTemplateRegistry();

// Render operational template
const operationalPrompt = registry.renderTemplate('operational-analysis-v3', {
    errorCode: '503',
    analysisSummary: analysisData
});

// Render business template
const businessPrompt = registry.renderTemplate('business-impact-v2', {
    errorCount: 36,
    estimatedRevenue: 432,
    uniqueOrders: 36,
    uniqueCustomers: 19,
    uniqueStores: 2,
    analysisSummary: analysisData
});

📋 Command Line Usage:

# List all templates
node tools/template-manager.js list

# Show specific template
node tools/template-manager.js show operational-analysis-v3

# Test template rendering
node tools/template-manager.js test business-impact-v2

# Show usage examples
node tools/template-manager.js examples

🎯 Integration with LogAnalyzer:

const promptGenerator = new PromptGenerator(data);

// Use existing methods (now template-powered)
const operationalPrompt = promptGenerator.generateAnalysisPrompt(summary);
const businessPrompt = promptGenerator.generateBusinessImpactPrompt(summary);

// Use new template methods
const executivePrompt = promptGenerator.generateExecutiveSummaryPrompt(summary);
const technicalPrompt = promptGenerator.generateTechnicalPrompt(summary);
`);
    }

    /**
     * Compare different template types
     */
    compareTemplates() {
        console.log('🔄 Template Comparison\n');
        console.log('='.repeat(50));
        
        Object.entries(USAGE_GUIDELINES).forEach(([type, usage]) => {
            console.log(`\n📊 ${type.toUpperCase()} TEMPLATE:`);
            console.log(`  Target: ${usage.audience}`);
            console.log(`  Focus: ${usage.purpose}`);
            console.log(`  Output: ${usage.expectedOutput}`);
            console.log(`  Best For: ${usage.whenToUse}`);
        });
        
        console.log(`\n💡 Recommendation: 
- Use OPERATIONAL for immediate incident response
- Use BUSINESS for stakeholder communication  
- Use EXECUTIVE for leadership reporting
- Use TECHNICAL for detailed engineering analysis`);
    }

    /**
     * Validate template configuration
     */
    validateConfiguration() {
        console.log('✅ Validating Template Configuration\n');
        console.log('='.repeat(50));
        
        const templates = this.registry.listTemplates();
        let isValid = true;
        
        // Check default templates exist
        Object.entries(TEMPLATE_CONFIG.defaults).forEach(([type, templateId]) => {
            const template = this.registry.getTemplate(templateId);
            if (template) {
                console.log(`✅ Default ${type} template found: ${templateId}`);
            } else {
                console.error(`❌ Default ${type} template missing: ${templateId}`);
                isValid = false;
            }
        });
        
        // Check template variables
        templates.forEach(template => {
            const testData = { errorCode: '503', analysisSummary: 'test' };
            try {
                this.registry.renderTemplate(template.id, testData);
                console.log(`✅ Template ${template.id} renders correctly`);
            } catch (error) {
                console.error(`❌ Template ${template.id} has rendering issues: ${error.message}`);
                isValid = false;
            }
        });
        
        console.log(`\n${isValid ? '✅' : '❌'} Template configuration is ${isValid ? 'valid' : 'invalid'}`);
        return isValid;
    }
}

// ===============================================
// MAIN EXECUTION
// ===============================================

function main() {
    const manager = new TemplateManager();
    const command = process.argv[2];
    const argument = process.argv[3];
    
    switch (command) {
        case 'list':
            manager.listTemplates();
            break;
            
        case 'show':
            if (!argument) {
                console.error('❌ Usage: node template-manager.js show <template-id>');
                process.exit(1);
            }
            manager.showTemplate(argument);
            break;
            
        case 'test':
            if (!argument) {
                console.error('❌ Usage: node template-manager.js test <template-id>');
                process.exit(1);
            }
            manager.testTemplate(argument);
            break;
            
        case 'examples':
            manager.showUsageExamples();
            break;
            
        case 'compare':
            manager.compareTemplates();
            break;
            
        case 'validate':
            manager.validateConfiguration();
            break;
            
        default:
            console.log(`
🛠️  AI Prompt Template Manager

Usage:
  node tools/template-manager.js <command> [arguments]

Commands:
  list                     List all available templates
  show <template-id>       Show details for specific template
  test <template-id>       Test template rendering with sample data
  examples                 Show code usage examples
  compare                  Compare different template types
  validate                 Validate template configuration

Examples:
  node tools/template-manager.js list
  node tools/template-manager.js show operational-analysis-v3
  node tools/template-manager.js test business-impact-v2
  node tools/template-manager.js examples
            `);
            break;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default TemplateManager;
