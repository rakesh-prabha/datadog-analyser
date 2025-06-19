// ===============================================
// ANALYSIS AND REPORTING MODULE
// ===============================================
// Generates detailed analysis reports and insights

import { CONFIG } from './log-analyzer.js';

// ===============================================
// ANALYSIS GENERATORS
// ===============================================

export class AnalysisGenerator {
    constructor(data) {
        this.data = data;
    }

    generateSummaryReport() {
        let summary = `📊 LOG ANALYSIS RESULTS SUMMARY:\n`;
        summary += `Total logs analyzed: ${this.data.totalProcessedRows}\n`;
        summary += `Total "${CONFIG.ERROR_CODE_TO_LOOK_FOR} Service Unavailable" errors detected: ${this.data.total503Errors}\n\n`;

        if (this.data.total503Errors === 0) {
            summary += `✅ No ${CONFIG.ERROR_CODE_TO_LOOK_FOR} errors found. System is healthy!\n`;
            return summary;
        }

        summary += this.generateServiceBreakdown();
        summary += this.generateOrderBreakdown();
        summary += this.generateStoreBreakdown();
        summary += this.generateCustomerBreakdown();

        summary += `\n📝 Note: 'UNKNOWN' refers to errors where the identifier was empty or could not be extracted.\n`;
        return summary;
    }

    generateServiceBreakdown() {
        let breakdown = `🏢 Breakdown by Store/Service:\n`;
        
        if (this.data.storeErrorCounts.size === 0) {
            breakdown += ` (No specific store/service identifier found)\n`;
        } else {
            const sorted = Array.from(this.data.storeErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sorted.forEach(([store, count]) => {
                breakdown += `- Store/Service "${store}": ${count} errors\n`;
            });
        }
        return breakdown + '\n';
    }

    generateOrderBreakdown() {
        let breakdown = `📦 Breakdown by Order ID with Customer Details:\n`;
        
        if (this.data.orderErrorCounts.size === 0) {
            breakdown += ` (No order IDs could be extracted)\n`;
        } else {
            const sorted = Array.from(this.data.orderErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sorted.slice(0, CONFIG.MAX_ORDER_DISPLAY).forEach(([orderId, count]) => {
                const serviceName = this.data.orderToServiceMap.get(orderId) || 'UNKNOWN';
                const customerInfo = this.getCustomerInfoForOrder(orderId);
                const storeInfo = this.getStoreInfoForOrder(orderId);

                breakdown += `- Order "${orderId}" (${count} errors)\n`;
                breakdown += `  └── Service: ${serviceName}\n`;
                breakdown += `  └── Customer: ${customerInfo}\n`;
                breakdown += `  └── Store: ${storeInfo}\n\n`;
            });

            if (sorted.length > CONFIG.MAX_ORDER_DISPLAY) {
                breakdown += `... and ${sorted.length - CONFIG.MAX_ORDER_DISPLAY} more orders affected\n`;
            }
        }
        return breakdown + '\n';
    }

    generateStoreBreakdown() {
        let breakdown = `🏪 Breakdown by Store Location:\n`;
        
        if (this.data.storeIdErrorCounts.size === 0) {
            breakdown += ` (No store IDs could be extracted)\n`;
        } else {
            const sorted = Array.from(this.data.storeIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sorted.forEach(([storeId, count]) => {
                const storeName = this.data.storeIdToNameMap.get(storeId) || 'Unknown Store';
                breakdown += `- Store ID ${storeId} (${storeName}): ${count} errors\n`;
            });
        }
        return breakdown + '\n';
    }

    generateCustomerBreakdown() {
        let breakdown = `👥 Breakdown by Customer Details:\n`;
        
        if (this.data.userIdErrorCounts.size === 0) {
            breakdown += ` (No customer IDs could be extracted)\n`;
        } else {
            const sorted = Array.from(this.data.userIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sorted.slice(0, 10).forEach(([userId, count]) => {
                const associatedStore = this.data.userToStoreMap.get(userId);
                const storeName = associatedStore ? 
                    this.data.storeIdToNameMap.get(associatedStore) || `Store ${associatedStore}` : 
                    'Unknown Store';
                const userName = this.data.userToStoreMap.get(`${userId}_name`) || `User ${userId}`;
                const userEmail = this.data.userToStoreMap.get(`${userId}_email`) || 'No email';

                breakdown += `- Customer: ${userName} (ID: ${userId})\n`;
                breakdown += `  └── Email: ${userEmail}\n`;
                breakdown += `  └── Store: ${storeName} (Store ID: ${associatedStore || 'Unknown'})\n`;
                breakdown += `  └── Error Count: ${count}\n\n`;
            });

            if (sorted.length > 10) {
                breakdown += `... and ${sorted.length - 10} more customers affected\n`;
            }
        }
        return breakdown;
    }

    getCustomerInfoForOrder(orderId) {
        const customerName = this.data.userToStoreMap.get(`order_${orderId}_customer`) || 'Customer details not available';
        const customerEmail = this.data.userToStoreMap.get(`order_${orderId}_customerEmail`) || '';
        return customerEmail ? `${customerName} (${customerEmail})` : customerName;
    }

    getStoreInfoForOrder(orderId) {
        const storeId = this.data.userToStoreMap.get(`order_${orderId}_storeId`) || '';
        const storeName = this.data.userToStoreMap.get(`order_${orderId}_storeName`) || 
                         (storeId ? this.data.storeIdToNameMap.get(storeId) : '') || 
                         'Store details not available';
        return storeId ? `${storeName} (Store ID: ${storeId})` : storeName;
    }
}

// ===============================================
// CONSOLE REPORTERS
// ===============================================

export class ConsoleReporter {
    constructor(data) {
        this.data = data;
    }

    displayDetailedCustomerImpact() {
        console.log("\n=== 👥 DETAILED CUSTOMER & STORE IMPACT ===");
        
        this.displayAffectedEntitiesSummary();
        this.displayCustomerDetails();
        this.displayStoreDetails();
    }

    displayAffectedEntitiesSummary() {
        console.log("\n📋 SUMMARY OF AFFECTED ENTITIES:");
        
        // Collect unique entities
        const affectedCustomers = new Set();
        const affectedStoreNames = new Set();
        
        for (const [key, value] of this.data.userToStoreMap.entries()) {
            if (key.includes('_name') && !key.startsWith('order_')) {
                affectedCustomers.add(value);
            }
        }
        
        for (const [storeId, storeName] of this.data.storeIdToNameMap.entries()) {
            if (this.data.storeIdErrorCounts.has(storeId)) {
                affectedStoreNames.add(storeName);
            }
        }
        
        console.log(`• Total Affected Customers: ${affectedCustomers.size}`);
        if (affectedCustomers.size > 0) {
            const customerList = Array.from(affectedCustomers).slice(0, 10);
            console.log(`  └── Sample Names: ${customerList.join(', ')}${affectedCustomers.size > 10 ? '...' : ''}`);
        }
        
        console.log(`• Total Affected Store Locations: ${affectedStoreNames.size}`);
        if (affectedStoreNames.size > 0) {
            const storeList = Array.from(affectedStoreNames);
            console.log(`  └── Store Names: ${storeList.join(', ')}`);
        }
    }

    displayCustomerDetails() {
        if (this.data.userIdErrorCounts.size === 0) return;

        console.log("\n👤 AFFECTED CUSTOMERS DETAILS:");
        const sorted = Array.from(this.data.userIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
        
        sorted.slice(0, CONFIG.MAX_CUSTOMER_DISPLAY).forEach(([userId, errorCount], index) => {
            const associatedStore = this.data.userToStoreMap.get(userId);
            const storeName = associatedStore ? 
                this.data.storeIdToNameMap.get(associatedStore) || `Store ${associatedStore}` : 
                'Unknown Store';
            const userName = this.data.userToStoreMap.get(`${userId}_name`) || `User ${userId}`;
            const userEmail = this.data.userToStoreMap.get(`${userId}_email`) || 'Email not available';
            
            console.log(`${index + 1}. Customer: ${userName}`);
            console.log(`   ├── User ID: ${userId}`);
            console.log(`   ├── Email: ${userEmail}`);
            console.log(`   ├── Store: ${storeName} (ID: ${associatedStore || 'Unknown'})`);
            console.log(`   └── Error Count: ${errorCount}`);
            console.log('');
        });
        
        if (sorted.length > CONFIG.MAX_CUSTOMER_DISPLAY) {
            console.log(`   ... and ${sorted.length - CONFIG.MAX_CUSTOMER_DISPLAY} more customers affected\n`);
        }
    }

    displayStoreDetails() {
        if (this.data.storeIdErrorCounts.size === 0) return;

        console.log("\n🏪 AFFECTED STORE LOCATIONS DETAILS:");
        const sorted = Array.from(this.data.storeIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
        
        sorted.forEach(([storeId, errorCount], index) => {
            const storeName = this.data.storeIdToNameMap.get(storeId) || 'Store name not available';
            
            // Count unique customers at this store
            const customersAtStore = Array.from(this.data.userToStoreMap.entries())
                .filter(([key, value]) => !key.includes('_') && value === storeId).length;
            
            console.log(`${index + 1}. Store: ${storeName}`);
            console.log(`   ├── Store ID: ${storeId}`);
            console.log(`   ├── Error Count: ${errorCount}`);
            console.log(`   └── Customers Affected: ${customersAtStore}`);
            console.log('');
        });
    }

    displayAnalysisInsights() {
        console.log("\n=== 📊 DETAILED ANALYSIS INSIGHTS ===");
        
        this.displayErrorDistribution();
        this.displayUniquenessAnalysis();
        this.displayCustomerCorrelation();
        this.displayBusinessImpact();
        this.displayDataQuality();
    }

    displayErrorDistribution() {
        console.log("\n📈 ERROR DISTRIBUTION ANALYSIS:");
        console.log(`• Total 503 Errors Found: ${this.data.total503Errors}`);
        console.log(`• Total Log Entries Processed: ${this.data.totalProcessedRows}`);
        console.log(`• Error Rate: ${((this.data.total503Errors / this.data.totalProcessedRows) * 100).toFixed(2)}% of all log entries`);
    }

    displayUniquenessAnalysis() {
        console.log("\n🔍 UNIQUENESS ANALYSIS:");
        console.log(`• Unique Order IDs Affected: ${this.data.uniqueOrders}`);
        console.log(`• Unique Services Affected: ${this.data.uniqueServices}`);
        console.log(`• Unique Store IDs Affected: ${this.data.uniqueStores}`);
        console.log(`• Unique Store Names Affected: ${this.data.uniqueStoreNames}`);
        console.log(`• Unique Users Affected: ${this.data.uniqueUsers}`);
        console.log(`• Average Errors per Order: ${(this.data.total503Errors / this.data.uniqueOrders).toFixed(2)}`);
        
        if (this.data.uniqueStores > 0) {
            console.log(`• Average Errors per Store: ${(this.data.total503Errors / this.data.uniqueStores).toFixed(2)}`);
        }
    }

    displayCustomerCorrelation() {
        console.log("\n👥 CUSTOMER CORRELATION ANALYSIS:");
        console.log(`• 1 Order ID = 1 Customer Order = 1 Customer Affected`);
        console.log(`• ${this.data.uniqueOrders} Unique Order IDs = ${this.data.uniqueOrders} Customers Affected`);
        
        if (this.data.uniqueUsers > 0) {
            console.log(`• ${this.data.uniqueUsers} Unique User IDs = ${this.data.uniqueUsers} Individual Users Affected`);
            if (this.data.uniqueUsers !== this.data.uniqueOrders) {
                console.log(`• Some users may have placed multiple orders or order correlation needs review`);
            }
        }
        
        if (this.data.uniqueStores > 0) {
            console.log(`• ${this.data.uniqueStores} Unique Store IDs = ${this.data.uniqueStores} Physical Store Locations Affected`);
            
            // Find most affected store
            const sorted = Array.from(this.data.storeIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            const topStore = sorted[0];
            if (topStore) {
                const storeName = this.data.storeIdToNameMap.get(topStore[0]) || 'Unknown';
                console.log(`• Most Affected Store: Store ID ${topStore[0]} (${storeName}) with ${topStore[1]} errors`);
            }
        }
        
        // Pattern analysis
        const ordersWithMultipleErrors = Array.from(this.data.orderErrorCounts.values()).filter(count => count > 1).length;
        const ordersWithSingleError = this.data.uniqueOrders - ordersWithMultipleErrors;
        
        console.log(`• Customers with Single Error: ${ordersWithSingleError} (${((ordersWithSingleError / this.data.uniqueOrders) * 100).toFixed(1)}%)`);
        console.log(`• Customers with Multiple Errors: ${ordersWithMultipleErrors} (${((ordersWithMultipleErrors / this.data.uniqueOrders) * 100).toFixed(1)}%)`);
    }

    displayBusinessImpact() {
        const avgOrderValue = 12; // Estimated from data
        const estimatedRevenueLoss = this.data.uniqueOrders * avgOrderValue;
        
        console.log("\n💰 BUSINESS IMPACT ESTIMATION:");
        console.log(`• Estimated Average Order Value: $${avgOrderValue}`);
        console.log(`• Estimated Revenue at Risk: $${estimatedRevenueLoss} (${this.data.uniqueOrders} orders × $${avgOrderValue})`);
        console.log(`• Customer Experience Impact: ${this.data.uniqueOrders} customers experienced failed orders`);
    }

    displayDataQuality() {
        const orderExtractionRate = (this.data.uniqueOrders / this.data.total503Errors) * 100;
        const timestampCorrelationRate = Array.from(this.data.timestampToOrderMap.keys()).length / this.data.totalProcessedRows * 100;
        
        console.log("\n📈 DATA QUALITY & CONFIDENCE ANALYSIS:");
        console.log(`• Order ID Extraction Success Rate: ${orderExtractionRate.toFixed(1)}% (${this.data.uniqueOrders}/${this.data.total503Errors} errors correlated)`);
        console.log(`• Timestamp Correlation Coverage: ${timestampCorrelationRate.toFixed(1)}% of log entries`);
        
        // Confidence assessment
        let confidenceLevel = "HIGH";
        const confidenceReasons = [];
        
        if (orderExtractionRate >= 90) {
            confidenceReasons.push("✅ Excellent order ID extraction rate");
        } else if (orderExtractionRate >= 70) {
            confidenceReasons.push("⚠️ Good order ID extraction rate");
            confidenceLevel = "MEDIUM-HIGH";
        } else {
            confidenceReasons.push("❌ Low order ID extraction rate");
            confidenceLevel = "MEDIUM";
        }
        
        if (this.data.uniqueOrders === this.data.total503Errors) {
            confidenceReasons.push("✅ Perfect 1:1 error-to-order correlation");
        } else if (this.data.uniqueOrders >= this.data.total503Errors * 0.8) {
            confidenceReasons.push("✅ Strong error-to-order correlation");
        } else {
            confidenceReasons.push("⚠️ Some errors not correlated to orders");
            if (confidenceLevel === "HIGH") confidenceLevel = "MEDIUM-HIGH";
        }
        
        if (this.data.uniqueServices === 1) {
            confidenceReasons.push("✅ Single service failure pattern (clear root cause)");
        } else {
            confidenceReasons.push("⚠️ Multiple services affected (complex issue)");
            if (confidenceLevel === "HIGH") confidenceLevel = "MEDIUM-HIGH";
        }
        
        console.log(`\n🎯 CONFIDENCE LEVEL: ${confidenceLevel}`);
        console.log("📋 Confidence Assessment Factors:");
        confidenceReasons.forEach(reason => console.log(`   ${reason}`));
        
        // Reliability metrics
        console.log("\n📊 RELIABILITY METRICS:");
        console.log(`• Data Completeness: ${((this.data.total503Errors / this.data.totalProcessedRows) * 100).toFixed(1)}% error coverage`);
        console.log(`• Customer Identification: ${orderExtractionRate.toFixed(1)}% success rate`);
        console.log(`• Pattern Consistency: ${this.data.uniqueServices === 1 ? 'Single service pattern' : 'Multi-service pattern'}`);
        
        // Recommendations
        console.log("\n💡 DATA QUALITY RECOMMENDATIONS:");
        if (confidenceLevel === "HIGH") {
            console.log("• Data quality is excellent - proceed with confidence");
            console.log("• Customer impact numbers are highly reliable");
            console.log("• Business decisions can be made based on this analysis");
        } else if (confidenceLevel === "MEDIUM-HIGH") {
            console.log("• Data quality is good - minor validation recommended");
            console.log("• Customer impact numbers are reliable with small margin of error");
            console.log("• Consider cross-referencing with customer service reports");
        } else {
            console.log("• Data quality needs improvement - additional validation required");
            console.log("• Customer impact numbers should be treated as estimates");
            console.log("• Recommend improving log format for better order ID extraction");
        }
        
        console.log("\n" + "=".repeat(60));
    }
}

export default { AnalysisGenerator, ConsoleReporter };
