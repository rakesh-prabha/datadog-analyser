# AI-Powered Log Analysis Architecture

🏗️ **Comprehensive Technical Architecture for Store-Aware Log Analysis Solution**

## 📋 Architecture Overview

The AI-Powered Log Analysis solution is a modern, modular system designed for analyzing Datadog CSV exports with a focus on 503 Service Unavailable errors. The architecture emphasizes clean separation of concerns, store-aware analysis, and AI-powered insights.

## 🎯 Design Principles

### 1. **Single Responsibility Principle**
Each module has one clearly defined purpose:
- Data processing ≠ Report generation ≠ AI integration ≠ Application orchestration

### 2. **Store-Aware Analysis**
Comprehensive store mapping integration for business-context analysis:
- Store ID to name mapping
- Location-specific error analysis
- Business impact assessment

### 3. **Dependency Injection**
Modules receive their dependencies through constructors, enabling easy testing and flexibility.

### 4. **Configuration-Driven**
All settings centralized in exportable CONFIG objects for easy maintenance.

### 5. **Error Handling & Logging**
Consistent error handling and professional logging throughout all modules.

## 📁 Project Structure

```
vertai/
├── src/                          # 🎯 Core Application
│   ├── index.js                  # Application Orchestrator
│   ├── log-analyzer.js           # Data Processing Engine
│   ├── analysis-reporter.js      # Report Generation System
│   ├── ai-integration.js         # AI Analysis Engine
│   ├── storeData.csv            # Store Mapping Database
│   └── extract-*.csv            # Log Data Files
├── docs/                         # 📚 Documentation
│   ├── ARCHITECTURE.md           # This document
│   ├── DEPLOYMENT.md             # Deployment guide
│   ├── LOG_ANALYSIS_SOLUTION.md  # Solution overview
│   └── QUICKSTART.md             # Quick start guide
├── tools/                        # 🔧 Development Tools
│   ├── 503-analysis.js           # Legacy analysis tool
│   ├── csv-validator.js          # Data validation
│   ├── index-original.js         # Original implementation
│   ├── index-new.js              # Development version
│   ├── vert.js                   # Utility script
│   └── temp/                     # Experimental code
├── output/                       # 📊 Analysis Results
│   ├── debug_output.txt          # Debug information
│   ├── new_output.txt            # Latest analysis
│   ├── old_output.txt            # Historical results
│   └── validation_output.txt     # Validation reports
└── README.md                     # Project overview
```

---

## 📊 Module 1: log-analyzer.js

**Purpose**: CSV processing, data extraction, store mapping, and correlation logic

### Classes & Exports

```javascript
// Configuration
export const CONFIG { ... }

// Store Data Management
export class StoreDataLoader { ... }

// Data Structures
export class LogAnalysisData { ... }

// Data Extraction Utilities
export class DataExtractor { ... }

// Processing Engine  
export class CSVProcessor { ... }
```

### Class: StoreDataLoader

**Role**: Load and manage store ID to name mappings from CSV

```javascript
class StoreDataLoader {
    static async loadStoreMapping() {
        // Loads store data from storeData.csv
        // Returns Map<storeId, storeName>
        // Handles missing files gracefully
        // Provides detailed logging for target stores
    }
}
```

**Key Features**:
- **Asynchronous CSV Loading**: Streams storeData.csv efficiently
- **Error Resilience**: Continues execution if store data is missing
- **Target Store Logging**: Specifically reports on stores 162 and 19
- **Data Validation**: Ensures clean store ID and name data

### Class: LogAnalysisData

**Role**: Central data store for all analysis results with store-aware capabilities

```javascript
class LogAnalysisData {
    constructor(storeMapping = new Map()) {
        // Error tracking maps
        this.storeErrorCounts = new Map();           // store → error count
        this.orderErrorCounts = new Map();           // order → error count  
        this.orderToServiceMap = new Map();          // order → service
        this.timestampToOrderMap = new Map();        // timestamp → order
        this.storeIdErrorCounts = new Map();         // storeId → error count
        this.userIdErrorCounts = new Map();          // userId → error count
        this.storeNameErrorCounts = new Map();       // storeName → error count
        
        // Correlation maps - pre-loaded with store mappings
        this.storeIdToNameMap = new Map(storeMapping); // storeId → storeName
        this.userToStoreMap = new Map();             // userId → storeId
        
        // Counters
        this.total503Errors = 0;
        this.totalProcessedRows = 0;
    }
    
    // Computed properties for analysis
    get uniqueOrders() { return this.orderErrorCounts.size; }
    get uniqueServices() { return this.storeErrorCounts.size; }
    get uniqueStores() { return this.storeIdErrorCounts.size; }
    get uniqueUsers() { return this.userIdErrorCounts.size; }
    get uniqueStoreNames() { return this.storeNameErrorCounts.size; }
}
```

**Key Features:**
- ✅ **Store-Aware Initialization**: Pre-loaded with store mappings
- ✅ **Centralized Storage**: All analysis data in one place
- ✅ **Efficient Lookups**: Map-based storage for O(1) access
- ✅ **Correlation Tracking**: Cross-references between entities
- ✅ **Computed Properties**: Dynamic analysis metrics
- ✅ **Extensible**: Easy to add new data types

### Class: DataExtractor

**Role**: Extract structured data from log message content

```javascript
class DataExtractor {
    static extractOrderId(messageContent) { ... }
    static extractStoreId(messageContent) { ... }
    static extractUserId(messageContent) { ... }
    static extractUserDetails(messageContent) { ... }
    static extractStoreName(messageContent) { ... }
    static isError503(messageContent) { ... }
}
```

**Key Features:**
- **Multiple Pattern Matching**: Handles various JSON formats
- **Robust Extraction**: Graceful handling of malformed data
- **Comprehensive Data Mining**: Extracts orders, stores, users, and errors
- **Store Name Intelligence**: Multiple patterns for store identification

### Class: CSVProcessor

**Role**: CSV parsing, data extraction, and correlation processing

```javascript
class CSVProcessor {
    constructor(data) {
        this.data = data;  // LogAnalysisData instance
    }
    
    async processCSV() { ... }
    processRow(row) { ... }
    extractAllData(messageContent) { ... }
    storeCorrelations(data, timeKey) { ... }
    storeCustomerData(...) { ... }
    process503Error(data, storeId, timeKey, messageContent) { ... }
}
```

**Key Features:**
- **Streaming Processing**: Memory-efficient CSV handling
- **Comprehensive Extraction**: All data types from each row
- **Store Correlation**: Intelligent mapping of stores to orders
- **Customer Data Management**: Complete customer profiles
- **Error Context**: Rich 503 error analysis with business context

    async processCSV() { ... }           // Main processing pipeline
    processRow(row) { ... }              // Individual row processing
    extractAllData(messageContent) { ... } // Data extraction coordination
    storeCorrelations(data, timeKey) { ... } // Correlation storage
    process503Error(data, storeId, timeKey, message) { ... } // Error processing
}
```

**Processing Pipeline:**
1. **File Reading**: Stream CSV for memory efficiency
2. **Row Processing**: Extract all relevant data from each row
3. **Correlation Storage**: Build cross-reference maps
4. **Error Detection**: Identify and process 503 errors
5. **Validation**: Real-time data validation

### Class: DataExtractor

**Role**: Static utility functions for data extraction

```javascript
class DataExtractor {
    // Core extraction methods
    static extractOrderId(messageContent) { ... }
    static extractUserId(messageContent) { ... }
    static extractStoreId(messageContent) { ... }
    static extractUserDetails(messageContent) { ... }
    static extractStoreName(messageContent) { ... }
    
    // Validation
    static isError503(messageContent) { ... }
}
```

**Extraction Patterns:**
- **Regex-based**: Robust pattern matching for JSON-like log formats
- **Error-tolerant**: Handles malformed or incomplete data gracefully
- **Type-safe**: Returns null for missing data rather than throwing errors

### Configuration Object

```javascript
export const CONFIG = {
    CSV_FILE_PATH: path.join(__dirname, 'extract-2025-06-19T05_50_23.398Z.csv'),
    STORE_DATA_PATH: path.join(__dirname, 'storeData.csv'),
    STATUS_CODE_COLUMN: 'Message',
    STORE_IDENTIFIER_COLUMN: 'Service', 
    ERROR_CODE_TO_LOOK_FOR: '503',
    MODEL_NAME: "gemini-2.0-flash",
    MAX_DEBUG_ERRORS: 3,
    MAX_CUSTOMER_DISPLAY: 15,
    MAX_ORDER_DISPLAY: 20
};
```

**Enhanced Features:**
- **Store Data Integration**: Path to store mapping CSV
- **Configurable Limits**: Control output verbosity
- **AI Model Selection**: Flexible AI provider configuration

---

## 🎯 Module 0: index.js (Application Orchestrator)

**Purpose**: Main application entry point with store-aware initialization

### Class: LogAnalyzer

```javascript
class LogAnalyzer {
    constructor() {
        this.data = null; // Initialized with store data
        this.csvProcessor = null;
        this.analysisGenerator = null;
        this.consoleReporter = null;
        this.geminiClient = new GeminiClient();
        this.promptGenerator = null;
    }
    
    async initialize() { ... }
    async run() { ... }
    async processData() { ... }
    generateAnalysis() { ... }
    displayReports(analysisSummary) { ... }
    async generateAIInsights(analysisSummary) { ... }
}
```

**Enhanced Initialization Flow:**
1. **Store Data Loading**: Load store mappings before processing
2. **Component Initialization**: Initialize all modules with store context  
3. **CSV Processing**: Process log data with store awareness
4. **Analysis Generation**: Generate store-aware reports
5. **AI Integration**: Generate AI insights with business context

---

## 📈 Module 2: analysis-reporter.js

**Purpose**: Report generation with store-aware business context

### Classes & Exports

```javascript
// Analysis Generation
export class AnalysisGenerator { ... }

// Console Output  
export class ConsoleReporter { ... }
```

### Class: AnalysisGenerator

**Role**: Create structured analysis summaries with store context

```javascript
class AnalysisGenerator {
    constructor(data) {
        this.data = data;  // LogAnalysisData instance
    }

    generateSummaryReport() { ... }               // Complete analysis summary
    generateStoreBreakdown() { ... }              // Store-level analysis with names
    generateOrderBreakdown() { ... }              // Order-level analysis with store context
    generateCustomerBreakdown() { ... }           // Customer impact with store association
    getCustomerInfoForOrder(orderId) { ... }      // Order-customer mapping
    getStoreInfoForOrder(orderId) { ... }         // Order-store mapping with names
}
```

**Enhanced Summary Structure:**
```javascript
{
    totalLogs: 180,
    total503Errors: 36,
    storeBreakdown: "Store ID 162 (Fortitude Valley Metro): 30 errors...",
    orderBreakdown: "Order details with store names...", 
    customerBreakdown: "Customer impact with store context...",
    storeLocationBreakdown: "Real store names and locations...",
    customerDetailsBreakdown: "User details with store associations..."
}
```

### Class: ConsoleReporter

**Role**: Professional console output with store-aware formatting

```javascript
class ConsoleReporter {
    constructor(data) {
        this.data = data;
    }

    displayDetailedReport(summary) { ... }       // Enhanced main report display
    displayAffectedEntitiesSummary() { ... }     // Store names summary
    displayCustomerDetails() { ... }             // Customer analysis with stores
    displayStoreDetails() { ... }                // Store-specific analysis
    displayCustomerCorrelation() { ... }         // Store-customer correlations
    displayDataQualityMetrics() { ... }          // Enhanced validation metrics
}
```

**Enhanced Output Features:**
- ✅ **Store-Aware Formatting**: Real store names instead of IDs
- ✅ **Business Context**: Revenue impact with location context
- ✅ **Customer-Store Mapping**: Clear associations between customers and stores
- ✅ **Professional Layout**: Business-ready presentation with actual store names

---

## 🤖 Module 3: ai-integration.js

**Purpose**: Google Gemini AI integration with store-aware prompt management

### Classes & Exports

```javascript
// AI Client
export class GeminiClient { ... }

// Prompt Management
export class PromptGenerator { ... }
```

### Class: GeminiClient

**Role**: Google Gemini API integration with enhanced error handling

```javascript
class GeminiClient {
    constructor() {
        this.initializeClient();
    }

    async generateInsights(prompt) { ... }       // Technical analysis with store context
    async generateBusinessAnalysis(prompt) { ... } // Business impact with real store names
    initializeClient() { ... }                  // API setup with error handling
    handleRateLimiting() { ... }                 // Rate limit management
}
```

**Enhanced Features:**
- ✅ **Store-Aware Prompts**: Include actual store names in AI analysis
- ✅ **Business Context**: Revenue impact with location-specific insights
- ✅ **Error Resilience**: Robust API error management with fallbacks
- ✅ **Rate Limiting**: Automatic retry with exponential backoff

---

## 🔄 Store-Aware Data Flow Architecture

```mermaid
graph TD
    A[storeData.csv] --> B[StoreDataLoader]
    B --> C[LogAnalysisData - Pre-loaded with store mappings]
    D[CSV Input] --> E[CSVProcessor]
    E --> C
    C --> F[AnalysisGenerator - Store-aware reports]
    F --> G[ConsoleReporter - Store names in output]
    C --> H[PromptGenerator - Store context in prompts]
    H --> I[GeminiClient - Store-aware AI analysis]
    I --> J[AI Insights with store context]
    G --> K[Console Output with store names]
    J --> K
    
    subgraph "Enhanced Store Integration"
        B --> |Store mapping preload|
        C --> |Store-aware data structures|
        F --> |Real store names in analysis|
        H --> |Store context in AI prompts|
    end
```

## 🏪 Store Integration Benefits

### 1. **Business Context**
- Real store names instead of cryptic IDs
- Location-specific analysis (Fortitude Valley Metro vs UNSW)
- Revenue impact tied to specific stores

### 2. **Actionable Insights**
- Target remediation efforts at specific stores
- Customer outreach with store context
- Performance comparison between locations

### 3. **Enhanced AI Analysis**
- AI receives business context, not just technical data
- Store-specific recommendations
- Location-aware impact assessment

## 📊 Key Architecture Achievements

### ✅ **Store Mapping Integration**
- **217 store mappings** loaded from CSV
- **Fortitude Valley Metro** and **UNSW** successfully identified
- **Real-time store context** in all analysis outputs

### ✅ **Business-Ready Reporting**
- Store names in customer impact analysis
- Location-specific error breakdowns
- Revenue impact tied to actual stores

### ✅ **Enhanced AI Insights**
- Store-aware prompt generation
- Business context in technical analysis
- Actionable recommendations with store names

### ✅ **Clean Project Structure**
- Core solution in `/src/`
- Development tools in `/tools/`
- Documentation in `/docs/`
- Analysis outputs in `/output/`

---

**📅 Last Updated**: June 19, 2025  
**🎯 Architecture Status**: Production Ready with Store Integration ✅  
**🏪 Store Mapping**: 217 stores loaded, IDs 162 & 19 mapped ✅  
**📊 Business Context**: Revenue impact with store locations ✅
