# AI Prompt Template System

A powerful, reusable template system for AI prompt engineering that separates prompt logic from application code.

## 🎯 **Overview**

The template system provides:
- **Centralized Prompt Management**: All prompts in dedicated template files
- **Variable Interpolation**: Dynamic content injection using `{{variable}}` syntax
- **Template Versioning**: Track and manage prompt evolution
- **Type-Specific Templates**: Operational, Business, Executive, and Technical prompts
- **Validation System**: Ensure templates render correctly
- **CLI Management**: Command-line tools for template operations

## 📁 **File Structure**

```
src/templates/
├── prompt-templates.js     # Core template definitions and registry
├── template-config.js      # Configuration and usage guidelines
└── README.md              # This documentation

tools/
└── template-manager.js     # CLI utility for template management
```

## 🚀 **Quick Start**

### Basic Usage

```javascript
import PromptTemplateRegistry from './templates/prompt-templates.js';

const registry = new PromptTemplateRegistry();

// Render a template with variables
const prompt = registry.renderTemplate('operational-analysis-v3', {
    errorCode: '503',
    analysisSummary: 'Your analysis data here...'
});
```

### Using with PromptGenerator

```javascript
const promptGenerator = new PromptGenerator(data);

// Existing methods (now template-powered)
const operationalPrompt = promptGenerator.generateAnalysisPrompt(summary);
const businessPrompt = promptGenerator.generateBusinessImpactPrompt(summary);

// New template methods
const executivePrompt = promptGenerator.generateExecutiveSummaryPrompt(summary);
const technicalPrompt = promptGenerator.generateTechnicalPrompt(summary);
```

## 📋 **Available Templates**

### 1. **Operational Analysis** (`operational-analysis-v3`)
- **Audience**: Operations Teams, DevOps Engineers, SREs
- **Purpose**: Technical troubleshooting and incident response
- **Variables**: `errorCode`, `analysisSummary`

### 2. **Business Impact** (`business-impact-v2`)
- **Audience**: Product Managers, Business Operations
- **Purpose**: Business impact assessment and stakeholder communication
- **Variables**: `errorCount`, `estimatedRevenue`, `uniqueOrders`, `uniqueCustomers`, `uniqueStores`, `analysisSummary`

### 3. **Executive Summary** (`executive-summary-v1`)
- **Audience**: C-Level Executives, Senior Leadership
- **Purpose**: High-level incident summary for strategic decisions
- **Variables**: `errorCount`, `estimatedRevenue`, `uniqueCustomers`, `confidenceLevel`, `analysisSummary`

### 4. **Technical Deep-Dive** (`technical-deepdive-v1`)
- **Audience**: Software Engineers, Architects
- **Purpose**: Detailed technical analysis and root cause investigation
- **Variables**: `errorCode`, `systemName`, `timeRange`, `analysisSummary`

## 🛠️ **Template Management CLI**

### List All Templates
```bash
node tools/template-manager.js list
```

### Show Template Details
```bash
node tools/template-manager.js show operational-analysis-v3
```

### Test Template Rendering
```bash
node tools/template-manager.js test business-impact-v2
```

### Show Usage Examples
```bash
node tools/template-manager.js examples
```

### Compare Template Types
```bash
node tools/template-manager.js compare
```

### Validate Configuration
```bash
node tools/template-manager.js validate
```

## 📝 **Creating Custom Templates**

### Step 1: Define Template
```javascript
import { PromptTemplate, TEMPLATE_TYPES } from './prompt-templates.js';

const CUSTOM_TEMPLATE = new PromptTemplate({
    id: 'custom-analysis-v1',
    name: 'Custom Analysis Prompt',
    description: 'Your custom prompt description',
    type: TEMPLATE_TYPES.OPERATIONAL,
    version: '1.0',
    variables: ['errorCode', 'customVariable'],
    template: `Your prompt template with {{errorCode}} and {{customVariable}} placeholders...`
});
```

### Step 2: Register Template
```javascript
const registry = new PromptTemplateRegistry();
registry.register(CUSTOM_TEMPLATE);
```

### Step 3: Use Template
```javascript
const prompt = registry.renderTemplate('custom-analysis-v1', {
    errorCode: '503',
    customVariable: 'value'
});
```

## 🔧 **Variable System**

### Required Variables
- `errorCode`: HTTP error code (e.g., '503')
- `analysisSummary`: Processed analysis data

### Business Variables
- `errorCount`: Total number of errors
- `estimatedRevenue`: Calculated revenue impact
- `uniqueOrders`: Number of affected orders
- `uniqueCustomers`: Number of affected customers
- `uniqueStores`: Number of affected store locations

### Context Variables
- `systemName`: Name of system being analyzed
- `timeRange`: Analysis time period
- `confidenceLevel`: Data quality assessment

## 🎨 **Template Syntax**

### Variable Interpolation
```
Use {{variableName}} for variable substitution
```

### Example Template
```
You are analyzing {{errorCode}} errors in {{systemName}}.

Total errors: {{errorCount}}
Revenue impact: ${{estimatedRevenue}}

Analysis:
{{analysisSummary}}
```

## ⚙️ **Configuration**

### Default Templates
Configure which templates to use by default for each type:

```javascript
// template-config.js
export const TEMPLATE_CONFIG = {
    defaults: {
        operational: 'operational-analysis-v3',
        business: 'business-impact-v2',
        executive: 'executive-summary-v1',
        technical: 'technical-deepdive-v1'
    }
};
```

### Validation Settings
```javascript
validation: {
    strictMode: false,        // Fail on missing variables
    warnOnMissing: true,      // Warn about missing variables
    failOnMissing: false      // Don't fail, just warn
}
```

## 🏆 **Best Practices**

### Template Design
1. **Clear Role Definition**: Start with "You are an expert..."
2. **Structured Output**: Use numbered sections
3. **Actionable Focus**: Demand specific recommendations
4. **Professional Tone**: Maintain consistent voice
5. **Variable Validation**: Include all required variables

### Usage Guidelines
1. **Match Audience**: Use appropriate template for target audience
2. **Provide Context**: Include all required variables
3. **Test Templates**: Validate rendering before deployment
4. **Version Control**: Track template changes with versions
5. **Document Changes**: Update descriptions when modifying templates

## 🔄 **Migration from Old System**

The new template system is backward compatible. Existing code continues to work:

```javascript
// Old way (still works)
const prompt = promptGenerator.generateAnalysisPrompt(summary);

// New way (with templates)
const prompt = promptGenerator.generateCustomPrompt('operational-analysis-v3', {}, summary);
```

## 📈 **Benefits**

### For Developers
- **Maintainability**: Centralized prompt management
- **Reusability**: Templates work across different contexts
- **Consistency**: Standardized prompt structure
- **Testing**: Easy validation and testing

### For Business
- **Flexibility**: Easy to adapt prompts for different audiences
- **Quality**: Professional, consistent AI outputs
- **Scalability**: Add new templates without code changes
- **Governance**: Version control and approval workflows

## 🚀 **Future Enhancements**

- **Dynamic Templates**: Load templates from external sources
- **Template Inheritance**: Base templates with extensions
- **Multi-language Support**: Templates in different languages
- **A/B Testing**: Compare template effectiveness
- **User Templates**: Allow custom user-defined templates
- **API Integration**: REST API for template management

## 📞 **Support**

For questions about the template system:
1. Check this documentation
2. Run `node tools/template-manager.js examples`
3. Validate your setup with `node tools/template-manager.js validate`
4. Review template source code in `src/templates/`

---

**📝 Template system makes AI prompts maintainable, reusable, and professional.**
