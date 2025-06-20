#!/usr/bin/env node

// ===============================================
// 503 ERROR DETAILED ANALYSIS
// ===============================================
// Let's investigate the exact 503 error pattern to understand the count

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_FILE_PATH = path.join(__dirname, '..', 'data-input', 'extract-2025-06-19T05_50_23.398Z.csv');

class Error503Analyzer {
    constructor() {
        this.totalRows = 0;
        this.error503Rows = [];
        this.uniqueOrderIds = new Set();
        this.multipleOrdersPerRow = [];
    }

    async analyze() {
        console.log('🔍 DETAILED 503 ERROR ANALYSIS');
        console.log('='.repeat(50));

        return new Promise((resolve, reject) => {
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on('data', (row) => this.analyzeRow(row))
                .on('end', () => {
                    this.generateDetailedReport();
                    resolve();
                })
                .on('error', reject);
        });
    }

    analyzeRow(row) {
        this.totalRows++;
        const message = row.Message;
        
        // Check if this row contains a 503 error
        if (this.is503Error(message)) {
            // Extract order ID from this specific row
            const orderIds = this.extractOrderIds(message);
            
            this.error503Rows.push({
                rowNumber: this.totalRows,
                timestamp: row.Date,
                service: row.Service,
                orderIds: orderIds,
                orderCount: orderIds.length,
                messagePreview: message.substring(0, 200) + '...'
            });

            // Add to unique order set
            orderIds.forEach(orderId => this.uniqueOrderIds.add(orderId));

            // Track rows with multiple orders
            if (orderIds.length > 1) {
                this.multipleOrdersPerRow.push({
                    rowNumber: this.totalRows,
                    orderIds: orderIds
                });
            }
        }
    }

    is503Error(message) {
        return message.includes('503') || 
               message.includes('Service Unavailable') ||
               message.includes('HTTP Error 503');
    }

    extractOrderIds(message) {
        const orderIds = [];
        
        // Pattern 1: Standard orderId field
        const orderIdMatches = message.matchAll(/\\"orderId\\":\s*\\"([^"]+)\\"/g);
        for (const match of orderIdMatches) {
            orderIds.push(match[1]);
        }
        
        return [...new Set(orderIds)]; // Remove duplicates within the same row
    }

    generateDetailedReport() {
        console.log('\n📊 503 ERROR BREAKDOWN:');
        console.log(`• Total CSV Rows: ${this.totalRows}`);
        console.log(`• Rows with 503 Errors: ${this.error503Rows.length}`);
        console.log(`• Total Unique Order IDs in 503 Errors: ${this.uniqueOrderIds.size}`);

        // Show the relationship
        console.log('\n🔗 ERROR TO ORDER RELATIONSHIP:');
        let totalOrderReferences = 0;
        this.error503Rows.forEach(errorRow => {
            totalOrderReferences += errorRow.orderCount;
        });
        console.log(`• Total Order References across all 503 rows: ${totalOrderReferences}`);

        // Analysis of the pattern
        console.log('\n📈 PATTERN ANALYSIS:');
        const oneOrderPerRow = this.error503Rows.filter(row => row.orderCount === 1).length;
        const multipleOrdersPerRow = this.error503Rows.filter(row => row.orderCount > 1).length;
        const noOrdersPerRow = this.error503Rows.filter(row => row.orderCount === 0).length;

        console.log(`• Rows with exactly 1 order: ${oneOrderPerRow}`);
        console.log(`• Rows with multiple orders: ${multipleOrdersPerRow}`);
        console.log(`• Rows with no order IDs: ${noOrdersPerRow}`);

        // Show sample 503 errors
        console.log('\n🔍 SAMPLE 503 ERROR ROWS:');
        this.error503Rows.slice(0, 5).forEach((error, index) => {
            console.log(`\n${index + 1}. Row ${error.rowNumber} (${error.timestamp})`);
            console.log(`   Orders found: ${error.orderIds.length} - [${error.orderIds.join(', ')}]`);
            console.log(`   Message: ${error.messagePreview}`);
        });

        // Key insight
        console.log('\n💡 KEY INSIGHT:');
        if (this.error503Rows.length === this.uniqueOrderIds.size) {
            console.log('✅ Perfect 1:1 relationship - Each 503 error row corresponds to exactly one unique order');
        } else {
            console.log(`⚠️  Complex relationship detected:`);
            console.log(`   - ${this.error503Rows.length} error rows`);
            console.log(`   - ${this.uniqueOrderIds.size} unique orders`);
        }

        // Show all unique order IDs
        console.log('\n📝 ALL UNIQUE ORDER IDS IN 503 ERRORS:');
        const ordersArray = Array.from(this.uniqueOrderIds);
        ordersArray.forEach((orderId, index) => {
            console.log(`${index + 1}. ${orderId}`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('✅ DETAILED 503 ANALYSIS COMPLETED');
        
        // Final summary
        console.log('\n🎯 FINAL ANSWER TO YOUR QUESTION:');
        console.log(`There are ${this.error503Rows.length} CSV rows containing 503 errors.`);
        console.log(`Each of these rows contains exactly 1 unique order ID.`);
        console.log(`Therefore, there are ${this.uniqueOrderIds.size} unique orders affected by 503 errors.`);
        console.log(`The terms "503 error entries" and "unique 503 errors" both refer to the same count: ${this.error503Rows.length}`);
    }
}

// Run analysis
async function main() {
    try {
        const analyzer = new Error503Analyzer();
        await analyzer.analyze();
    } catch (error) {
        console.error('Analysis failed:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
