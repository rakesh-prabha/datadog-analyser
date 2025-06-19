#!/usr/bin/env node

// ===============================================
// AI-POWERED LOG ANALYZER
// ===============================================
// Main application entry point for analyzing Datadog CSV exports
// Focuses on 503 Service Unavailable errors with customer impact analysis

import { LogAnalysisData, CSVProcessor, StoreDataLoader } from './log-analyzer.js';
import { AnalysisGenerator, ConsoleReporter } from './analysis-reporter.js';
import { GeminiClient, PromptGenerator } from './ai-integration.js';

// ===============================================
// MAIN APPLICATION CLASS
// ===============================================

class LogAnalyzer {
    constructor() {
        this.data = null; // Will be initialized with store data
        this.csvProcessor = null;
        this.analysisGenerator = null;
        this.consoleReporter = null;
        this.geminiClient = new GeminiClient();
        this.promptGenerator = null;
    }

    async initialize() {
        console.log('🏪 Loading store data mappings...');
        const storeMapping = await StoreDataLoader.loadStoreMapping();
        
        this.data = new LogAnalysisData(storeMapping);
        this.csvProcessor = new CSVProcessor(this.data);
        this.analysisGenerator = new AnalysisGenerator(this.data);
        this.consoleReporter = new ConsoleReporter(this.data);
        this.promptGenerator = new PromptGenerator(this.data);
    }

    async run() {
        try {
            console.log('🚀 Starting AI-Powered Log Analysis');
            console.log('=====================================\n');

            // Step 0: Initialize with store data
            await this.initialize();

            // Step 1: Process CSV data
            await this.processData();

            // Step 2: Generate analysis summary
            const analysisSummary = this.generateAnalysis();

            // Step 3: Display detailed reports
            this.displayReports(analysisSummary);

            // Step 4: Get AI insights
            await this.generateAIInsights(analysisSummary);

            console.log('\n✅ Analysis completed successfully!');

        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            process.exit(1);
        }
    }

    async processData() {
        console.log('📁 Processing CSV data...');
        await this.csvProcessor.processCSV();
    }

    generateAnalysis() {
        console.log('\n📊 Generating analysis summary...');
        const summary = this.analysisGenerator.generateSummaryReport();
        
        console.log('\n--- ANALYSIS SUMMARY FOR AI ---');
        console.log(summary);
        
        return summary;
    }

    displayReports(analysisSummary) {
        // Display detailed customer and store impact
        this.consoleReporter.displayDetailedCustomerImpact();
        
        // Display comprehensive analysis insights
        this.consoleReporter.displayAnalysisInsights();
    }

    async generateAIInsights(analysisSummary) {
        console.log('\n🤖 Generating AI analysis...');
        
        try {
            // Generate operational analysis prompt
            const operationalPrompt = this.promptGenerator.generateAnalysisPrompt(analysisSummary);
            
            // Get AI analysis
            const aiAnalysis = await this.geminiClient.generateAnalysis(operationalPrompt);
            
            // Display results
            console.log('\n=== 🧠 GOOGLE GEMINI AI ANALYSIS REPORT ===');
            console.log(aiAnalysis);
            
            // Optionally generate business-focused analysis
            if (this.data.total503Errors > 0) {
                console.log('\n=== 💼 BUSINESS IMPACT ANALYSIS ===');
                const businessPrompt = this.promptGenerator.generateBusinessImpactPrompt(analysisSummary);
                const businessAnalysis = await this.geminiClient.generateAnalysis(businessPrompt);
                console.log(businessAnalysis);
            }
            
        } catch (error) {
            console.error('⚠️ AI analysis failed:', error.message);
            console.log('📊 Local analysis completed successfully. AI insights unavailable.');
        }
    }
}

// ===============================================
// APPLICATION ENTRY POINT
// ===============================================

async function main() {
    const analyzer = new LogAnalyzer();
    await analyzer.run();
}

// Handle unhandled promises
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the application
main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
});
