#!/usr/bin/env node

// ===============================================
// CSV DATA VALIDATION SCRIPT
// ===============================================
// Manual validation of CSV data to verify our solution accuracy

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_FILE_PATH = path.join(__dirname, 'src/extract-2025-06-19T05_50_23.398Z.csv');

class CSVValidator {
    constructor() {
        this.totalRows = 0;
        this.error503Count = 0;
        this.uniqueOrderIds = new Set();
        this.uniqueCustomers = new Set();
        this.uniqueStoreIds = new Set();
        this.customerDetails = new Map();
        this.orderDetails = new Map();
        this.error503Entries = [];
        this.allTimestamps = new Set();
        this.orderTimestamps = new Map();
    }

    async validateCSV() {
        console.log('🔍 STARTING COMPREHENSIVE CSV DATA VALIDATION');
        console.log('='.repeat(50));

        return new Promise((resolve, reject) => {
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on('data', (row) => this.analyzeRow(row))
                .on('end', () => {
                    this.generateValidationReport();
                    resolve();
                })
                .on('error', reject);
        });
    }

    analyzeRow(row) {
        this.totalRows++;
        
        const timestamp = row.Date;
        const service = row.Service;
        const message = row.Message;
        
        this.allTimestamps.add(timestamp);

        // Check for 503 errors
        if (this.is503Error(message)) {
            this.error503Count++;
            this.error503Entries.push({
                timestamp,
                service,
                message: message.substring(0, 200) + '...'
            });
        }

        // Extract order data
        this.extractOrderData(message, timestamp);
        
        // Extract customer data
        this.extractCustomerData(message);
    }

    is503Error(message) {
        return message.includes('503') || 
               message.includes('Service Unavailable') ||
               message.includes('HTTP Error 503');
    }

    extractOrderData(message, timestamp) {
        // Extract orderId
        const orderIdMatch = message.match(/\\"orderId\\":\s*\\"([^"]+)\\"/);
        if (orderIdMatch) {
            const orderId = orderIdMatch[1];
            this.uniqueOrderIds.add(orderId);
            this.orderTimestamps.set(orderId, timestamp);
            
            // Extract order value
            const valueMatch = message.match(/\\"value\\":\s*([0-9.]+)/);
            const value = valueMatch ? parseFloat(valueMatch[1]) : null;
            
            // Extract store ID (pickupLocation)
            const storeMatch = message.match(/\\"pickupLocation\\":\s*(\d+)/);
            const storeId = storeMatch ? storeMatch[1] : null;
            if (storeId) {
                this.uniqueStoreIds.add(storeId);
            }

            this.orderDetails.set(orderId, {
                value,
                storeId,
                timestamp
            });
        }
    }

    extractCustomerData(message) {
        // Extract customer details
        const firstNameMatch = message.match(/\\"firstName\\":\s*\\"([^"]+)\\"/);
        const lastNameMatch = message.match(/\\"lastName\\":\s*\\"([^"]+)\\"/);
        const emailMatch = message.match(/\\"email\\":\s*\\"([^"]+)\\"/);
        const memberIdMatch = message.match(/\\"memberId\\":\s*(\d+)/);
        
        if (firstNameMatch || lastNameMatch || emailMatch) {
            const firstName = firstNameMatch ? firstNameMatch[1] : '';
            const lastName = lastNameMatch ? lastNameMatch[1] : '';
            const email = emailMatch ? emailMatch[1] : '';
            const memberId = memberIdMatch ? memberIdMatch[1] : '';
            
            const fullName = `${firstName} ${lastName}`.trim();
            if (fullName) {
                this.uniqueCustomers.add(fullName);
                
                if (memberId) {
                    this.customerDetails.set(memberId, {
                        name: fullName,
                        email,
                        firstName,
                        lastName
                    });
                }
            }
        }
    }

    generateValidationReport() {
        console.log('\n📊 CSV DATA VALIDATION RESULTS');
        console.log('='.repeat(50));

        // Basic metrics
        console.log('\n🔢 BASIC METRICS:');
        console.log(`• Total CSV Rows: ${this.totalRows}`);
        console.log(`• Total 503 Errors Found: ${this.error503Count}`);
        console.log(`• Unique Order IDs: ${this.uniqueOrderIds.size}`);
        console.log(`• Unique Customers: ${this.uniqueCustomers.size}`);
        console.log(`• Unique Store IDs: ${this.uniqueStoreIds.size}`);

        // Error rate
        const errorRate = ((this.error503Count / this.totalRows) * 100).toFixed(2);
        console.log(`• Error Rate: ${errorRate}%`);

        // Customer details validation
        console.log('\n👥 CUSTOMER VALIDATION:');
        console.log(`• Total Customer Names Extracted: ${this.uniqueCustomers.size}`);
        const customerList = Array.from(this.uniqueCustomers).slice(0, 10);
        console.log(`• Sample Names: ${customerList.join(', ')}${this.uniqueCustomers.size > 10 ? '...' : ''}`);

        // Store validation
        console.log('\n🏪 STORE VALIDATION:');
        console.log(`• Store IDs Found: ${Array.from(this.uniqueStoreIds).join(', ')}`);

        // Order value analysis
        const orderValues = Array.from(this.orderDetails.values())
            .map(order => order.value)
            .filter(value => value !== null);
        
        if (orderValues.length > 0) {
            const totalValue = orderValues.reduce((sum, val) => sum + val, 0);
            const avgValue = (totalValue / orderValues.length).toFixed(2);
            console.log('\n💰 ORDER VALUE ANALYSIS:');
            console.log(`• Orders with Value Data: ${orderValues.length}`);
            console.log(`• Average Order Value: $${avgValue}`);
            console.log(`• Total Order Value: $${totalValue.toFixed(2)}`);
        }

        // Timeline analysis
        const timestamps = Array.from(this.allTimestamps).sort();
        console.log('\n⏰ TIMELINE ANALYSIS:');
        console.log(`• First Log Entry: ${timestamps[0]}`);
        console.log(`• Last Log Entry: ${timestamps[timestamps.length - 1]}`);

        // 503 Error correlation
        console.log('\n🚨 503 ERROR ANALYSIS:');
        console.log(`• Total 503 Errors: ${this.error503Count}`);
        
        // Correlate errors with orders by timestamp
        let correlatedErrors = 0;
        const errorOrderCorrelations = [];
        
        this.error503Entries.forEach(error => {
            const errorTime = error.timestamp.substring(0, 19); // To nearest second
            for (const [orderId, timestamp] of this.orderTimestamps.entries()) {
                const orderTime = timestamp.substring(0, 19);
                if (errorTime === orderTime) {
                    correlatedErrors++;
                    errorOrderCorrelations.push({
                        orderId,
                        errorTime,
                        orderTime
                    });
                    break;
                }
            }
        });

        console.log(`• Errors Correlated to Orders: ${correlatedErrors}`);
        console.log(`• Correlation Success Rate: ${((correlatedErrors / this.error503Count) * 100).toFixed(1)}%`);

        // Show sample correlations
        if (errorOrderCorrelations.length > 0) {
            console.log('\n🔗 SAMPLE ERROR-ORDER CORRELATIONS:');
            errorOrderCorrelations.slice(0, 5).forEach((corr, index) => {
                console.log(`${index + 1}. Order ${corr.orderId} at ${corr.orderTime}`);
            });
        }

        // Compare with our solution results
        console.log('\n✅ VALIDATION COMPARISON WITH OUR SOLUTION:');
        console.log('Expected Results vs CSV Reality:');
        
        const expectedResults = {
            totalRows: 180,
            total503Errors: 36,
            uniqueOrders: 36,
            uniqueCustomers: 19,
            errorRate: 20.00
        };

        console.log(`• Total Rows: ${this.totalRows} ${this.totalRows === expectedResults.totalRows ? '✅' : '❌'} (Expected: ${expectedResults.totalRows})`);
        console.log(`• 503 Errors: ${this.error503Count} ${this.error503Count === expectedResults.total503Errors ? '✅' : '❌'} (Expected: ${expectedResults.total503Errors})`);
        console.log(`• Unique Orders: ${this.uniqueOrderIds.size} ${this.uniqueOrderIds.size === expectedResults.uniqueOrders ? '✅' : '❌'} (Expected: ${expectedResults.uniqueOrders})`);
        console.log(`• Unique Customers: ${this.uniqueCustomers.size} ${this.uniqueCustomers.size === expectedResults.uniqueCustomers ? '✅' : '❌'} (Expected: ${expectedResults.uniqueCustomers})`);
        console.log(`• Error Rate: ${errorRate}% ${parseFloat(errorRate) === expectedResults.errorRate ? '✅' : '❌'} (Expected: ${expectedResults.errorRate}%)`);

        // Show detailed validation status
        console.log('\n🎯 OVERALL VALIDATION STATUS:');
        const validationPassed = (
            this.totalRows === expectedResults.totalRows &&
            this.error503Count === expectedResults.total503Errors &&
            this.uniqueOrderIds.size === expectedResults.uniqueOrders &&
            this.uniqueCustomers.size === expectedResults.uniqueCustomers
        );

        if (validationPassed) {
            console.log('🟢 ALL VALIDATIONS PASSED - Our solution is 100% accurate!');
        } else {
            console.log('🟡 Some validations need review - checking for discrepancies...');
        }

        // Show first few 503 errors for debugging
        console.log('\n🔍 SAMPLE 503 ERRORS:');
        this.error503Entries.slice(0, 3).forEach((error, index) => {
            console.log(`${index + 1}. ${error.timestamp}: ${error.message}`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('✅ CSV VALIDATION COMPLETED');
    }
}

// Run validation
async function main() {
    try {
        console.log('Starting CSV validation...');
        const validator = new CSVValidator();
        await validator.validateCSV();
        console.log('Validation completed successfully.');
    } catch (error) {
        console.error('Validation failed:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
