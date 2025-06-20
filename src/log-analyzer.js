// ===============================================
// LOG ANALYZER MODULE
// ===============================================
// AI-Powered Log Analysis for Datadog CSV Exports
// Focuses on 503 Service Unavailable errors with customer impact analysis

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

// ===============================================
// CONFIGURATION
// ===============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
    INPUT_LOGS_DIR: path.join(__dirname, '..', 'data-input', 'input-logs'),
    STORE_DATA_PATH: path.join(__dirname, '..', 'data-input', 'storeData.csv'),
    STATUS_CODE_COLUMN: 'Message',
    STORE_IDENTIFIER_COLUMN: 'Service',
    ERROR_CODE_TO_LOOK_FOR: '503',
    MODEL_NAME: "gemini-2.0-flash",
    MAX_DEBUG_ERRORS: 3,
    MAX_CUSTOMER_DISPLAY: 15,
    MAX_ORDER_DISPLAY: 20
};

// ===============================================
// STORE DATA LOADER
// ===============================================

export class StoreDataLoader {
    static async loadStoreMapping() {
        const storeMapping = new Map();
        
        if (!fs.existsSync(CONFIG.STORE_DATA_PATH)) {
            console.warn(`⚠️  Store data file not found at ${CONFIG.STORE_DATA_PATH}`);
            return storeMapping;
        }

        return new Promise((resolve, reject) => {
            const results = [];
            
            fs.createReadStream(CONFIG.STORE_DATA_PATH)
                .pipe(csv())
                .on('data', (data) => {
                    const storeId = String(data.posStoreId || '').trim();
                    const storeName = String(data.name || '').trim();
                    
                    if (storeId && storeName) {
                        storeMapping.set(storeId, storeName);
                        results.push({ storeId, storeName });
                    }
                })
                .on('end', () => {
                    console.log(`✅ Loaded ${storeMapping.size} store mappings from store data`);
                    
                    // Log specific mappings for our target stores
                    if (storeMapping.has('162')) {
                        console.log(`🏪 Store ID 162 → "${storeMapping.get('162')}"`);
                    }
                    if (storeMapping.has('19')) {
                        console.log(`🏪 Store ID 19 → "${storeMapping.get('19')}"`);
                    } else {
                        console.log(`⚠️  Store ID 19 not found in store data`);
                    }
                    
                    resolve(storeMapping);
                })
                .on('error', (error) => {
                    console.error('❌ Error loading store data:', error);
                    reject(error);
                });
        });
    }
}

// ===============================================
// DATA STRUCTURES
// ===============================================

export class LogAnalysisData {
    constructor(storeMapping = new Map()) {
        // Error tracking maps
        this.storeErrorCounts = new Map();
        this.orderErrorCounts = new Map();
        this.orderToServiceMap = new Map();
        this.timestampToOrderMap = new Map();
        this.storeIdErrorCounts = new Map();
        this.userIdErrorCounts = new Map();
        this.storeNameErrorCounts = new Map();
        
        // Order value tracking
        this.orderValues = new Map(); // orderId -> order value
        
        // Correlation maps - initialize with provided store mapping
        this.storeIdToNameMap = new Map(storeMapping);
        this.userToStoreMap = new Map();
        
        // Counters
        this.total503Errors = 0;
        this.totalProcessedRows = 0;
    }

    // Get unique counts for analysis
    get uniqueOrders() { return this.orderErrorCounts.size; }
    get uniqueServices() { return this.storeErrorCounts.size; }
    get uniqueStores() { return this.storeIdErrorCounts.size; }
    get uniqueUsers() { return this.userIdErrorCounts.size; }
    get uniqueStoreNames() { return this.storeNameErrorCounts.size; }
    
    // Calculate total revenue at risk using actual order values
    get totalRevenueAtRisk() {
        let totalRevenue = 0;
        let ordersWithValues = 0;
        
        for (const orderId of this.orderErrorCounts.keys()) {
            const orderValue = this.orderValues.get(orderId);
            if (orderValue && orderValue > 0) {
                totalRevenue += orderValue;
                ordersWithValues++;
            }
        }
        
        return {
            totalRevenue: totalRevenue,
            ordersWithValues: ordersWithValues,
            averageOrderValue: ordersWithValues > 0 ? totalRevenue / ordersWithValues : 0
        };
    }
}

// ===============================================
// DATA EXTRACTION UTILITIES
// ===============================================

export class DataExtractor {
    static extractOrderId(messageContent) {
        const match = messageContent.match(/\\"orderId\\":\s*\\"([^"]+)\\"/);
        return match ? match[1] : null;
    }

    static extractStoreId(messageContent) {
        const match = messageContent.match(/\\"?pickupLocation\\"?:\s*(\d+)/);
        return match ? match[1] : null;
    }

    static extractUserId(messageContent) {
        const match = messageContent.match(/\\"?memberId\\"?:\s*(\d+)/);
        return match ? match[1] : null;
    }

    static extractUserDetails(messageContent) {
        const firstName = messageContent.match(/\\"?firstName\\"?:\s*\\"([^"]+)\\"/) || [];
        const lastName = messageContent.match(/\\"?lastName\\"?:\s*\\"([^"]+)\\"/) || [];
        const email = messageContent.match(/\\"?email\\"?:\s*\\"([^"]+)\\"/) || [];
        
        return {
            firstName: firstName[1] || null,
            lastName: lastName[1] || null,
            email: email[1] || null
        };
    }

    static extractStoreName(messageContent) {
        // Pattern 1: Standard JSON format: "store":{"name":"Store Name"}
        let match = messageContent.match(/\\"?store\\"?:\s*{\s*\\"?name\\"?:\s*\\"([^"]+)\\"/);
        if (!match) {
            // Pattern 2: Direct storeName field: "storeName":"Store Name"
            match = messageContent.match(/\\"?storeName\\"?:\s*\\"([^"]+)\\"/);
        }
        if (!match) {
            // Pattern 3: Multi-line store format as shown: store\n{\nname\nStore Name\n}
            match = messageContent.match(/store\s*\{\s*name\s+([^\}]+?)\s*\}/i);
        }
        if (!match) {
            // Pattern 4: Escaped multi-line format: "store\\n{\\nname\\nStore Name\\n}"
            match = messageContent.match(/store\\n\{\\nname\\n([^\\]+?)\\n\}/i);
        }
        if (!match) {
            // Pattern 5: Try saleName pattern - sometimes contains location info
            match = messageContent.match(/\\"?saleName\\"?:\s*\\"([^"]*(?:UNSW|University|Campus|Store|Shop|Outlet|Centre|Center|Mall|Plaza|Metro|Valley)[^"]*)\\"/, 'i');
        }
        if (!match) {
            // Pattern 6: Try location-related patterns
            match = messageContent.match(/\\"?(?:location|site|venue|place)Name\\"?:\s*\\"([^"]+)\\"/);
        }
        return match ? match[1].trim() : null;
    }

    static extractOrderValue(messageContent) {
        // Pattern 1: Extract value from medias array (total order value)
        const mediasValueMatch = messageContent.match(/\\"medias\\":\s*\[.*?\\"value\\":\s*([0-9]+\.?[0-9]*)/);
        if (mediasValueMatch) {
            return parseFloat(mediasValueMatch[1]);
        }
        
        // Pattern 2: Extract total value from items array (sum of all items)
        const itemsMatches = messageContent.match(/\\"items\\":\s*\[(.*?)\]/);
        if (itemsMatches) {
            const itemsContent = itemsMatches[1];
            const valueMatches = itemsContent.match(/\\"value\\":\s*([0-9]+\.?[0-9]*)/g);
            if (valueMatches) {
                const totalValue = valueMatches.reduce((sum, match) => {
                    const value = parseFloat(match.match(/([0-9]+\.?[0-9]*)/)[1]);
                    return sum + value;
                }, 0);
                return totalValue;
            }
        }
        
        // Pattern 3: Single item value as fallback
        const singleValueMatch = messageContent.match(/\\"value\\":\s*([0-9]+\.?[0-9]*)/);
        if (singleValueMatch) {
            return parseFloat(singleValueMatch[1]);
        }
        
        return null; // No value could be extracted
    }

    static isError503(messageContent) {
        return messageContent.includes(CONFIG.ERROR_CODE_TO_LOOK_FOR) || 
               messageContent.includes('Service Unavailable') ||
               messageContent.includes('HTTP Error 503');
    }
}

// ===============================================
// CSV PROCESSING
// ===============================================

export class CSVProcessor {
    constructor(data) {
        this.data = data;
    }

    async processCSV() {
        if (!fs.existsSync(CONFIG.INPUT_LOGS_DIR)) {
            throw new Error(`Input logs directory not found at ${CONFIG.INPUT_LOGS_DIR}`);
        }

        // Get all CSV files in the input-logs directory
        const files = fs.readdirSync(CONFIG.INPUT_LOGS_DIR)
            .filter(file => file.toLowerCase().endsWith('.csv'))
            .map(file => path.join(CONFIG.INPUT_LOGS_DIR, file));

        if (files.length === 0) {
            throw new Error(`No CSV files found in ${CONFIG.INPUT_LOGS_DIR}`);
        }

        console.log(`🔍 Found ${files.length} CSV file(s) to process:`);
        files.forEach(file => console.log(`   📄 ${path.basename(file)}`));
        console.log(`🔍 Starting analysis for ${CONFIG.ERROR_CODE_TO_LOOK_FOR} errors...`);

        // Process each CSV file
        for (const filePath of files) {
            await this.processSingleCSV(filePath);
        }

        console.log(`✅ Finished processing all CSV files: ${this.data.totalProcessedRows} total rows processed`);
        console.log(`🚨 Total ${CONFIG.ERROR_CODE_TO_LOOK_FOR} errors found: ${this.data.total503Errors}`);
    }

    async processSingleCSV(filePath) {
        const fileName = path.basename(filePath);
        console.log(`\n📁 Processing ${fileName}...`);

        return new Promise((resolve, reject) => {
            let fileRowCount = 0;
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    fileRowCount++;
                    this.processRow(row);
                })
                .on('end', () => {
                    console.log(`✅ Completed ${fileName}: ${fileRowCount} rows processed`);
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`❌ Error reading ${fileName}:`, err.message);
                    reject(err);
                });
        });
    }

    processRow(row) {
        this.data.totalProcessedRows++;
        
        const messageContent = String(row[CONFIG.STATUS_CODE_COLUMN] || '').trim();
        const storeId = String(row[CONFIG.STORE_IDENTIFIER_COLUMN] || 'UNKNOWN').trim();
        const timestamp = String(row['Date'] || '').trim();
        const timeKey = timestamp.substring(0, 19); // "2025-06-18T21:20:48"

        // Extract all relevant data from the message
        const extractedData = this.extractAllData(messageContent);
        
        // Store correlations for later analysis
        this.storeCorrelations(extractedData, timeKey);
        
        // Process 503 errors
        if (DataExtractor.isError503(messageContent)) {
            this.process503Error(extractedData, storeId, timeKey, messageContent);
        }
    }

    extractAllData(messageContent) {
        const orderId = DataExtractor.extractOrderId(messageContent);
        const storeIdFromLog = DataExtractor.extractStoreId(messageContent);
        const userIdFromLog = DataExtractor.extractUserId(messageContent);
        const userDetails = DataExtractor.extractUserDetails(messageContent);
        const storeNameFromLog = DataExtractor.extractStoreName(messageContent);
        const orderValue = DataExtractor.extractOrderValue(messageContent);

        return {
            orderId,
            storeIdFromLog,
            userIdFromLog,
            storeNameFromLog,
            orderValue,
            ...userDetails
        };
    }

    storeCorrelations(data, timeKey) {
        const { orderId, storeIdFromLog, userIdFromLog, storeNameFromLog, firstName, lastName, email, orderValue } = data;

        // Map timestamp to order ID
        if (orderId) {
            this.data.timestampToOrderMap.set(timeKey, orderId);
            
            // Store order value if available
            if (orderValue && orderValue > 0) {
                this.data.orderValues.set(orderId, orderValue);
            }
        }

        // Map store ID to store name
        if (storeIdFromLog && storeNameFromLog) {
            this.data.storeIdToNameMap.set(storeIdFromLog, storeNameFromLog);
        }

        // Map user to store
        if (userIdFromLog && storeIdFromLog) {
            this.data.userToStoreMap.set(userIdFromLog, storeIdFromLog);
        }

        // Store comprehensive customer data
        if (userIdFromLog && (firstName || lastName || email)) {
            this.storeCustomerData(userIdFromLog, firstName, lastName, email, orderId, storeIdFromLog);
        }
    }

    storeCustomerData(userIdFromLog, firstName, lastName, email, orderId, storeIdFromLog) {
        const userName = `${firstName || ''} ${lastName || ''}`.trim() || email || `User ${userIdFromLog}`;

        // Store user details
        if (!this.data.userToStoreMap.has(`${userIdFromLog}_name`)) {
            this.data.userToStoreMap.set(`${userIdFromLog}_name`, userName);
            if (email) {
                this.data.userToStoreMap.set(`${userIdFromLog}_email`, email);
            }
        }

        // Store order-specific customer data
        if (orderId) {
            this.data.userToStoreMap.set(`order_${orderId}_customer`, userName);
            this.data.userToStoreMap.set(`order_${orderId}_customerId`, userIdFromLog);
            if (email) {
                this.data.userToStoreMap.set(`order_${orderId}_customerEmail`, email);
            }
            if (storeIdFromLog) {
                this.data.userToStoreMap.set(`order_${orderId}_storeId`, storeIdFromLog);
                const storeName = this.data.storeIdToNameMap.get(storeIdFromLog);
                if (storeName) {
                    this.data.userToStoreMap.set(`order_${orderId}_storeName`, storeName);
                }
            }
        }
    }

    process503Error(data, storeId, timeKey, messageContent) {
        const { storeIdFromLog, userIdFromLog, storeNameFromLog } = data;
        
        this.data.total503Errors++;
        this.data.storeErrorCounts.set(storeId, (this.data.storeErrorCounts.get(storeId) || 0) + 1);

        // Correlate with order ID
        const correlatedOrderId = this.data.timestampToOrderMap.get(timeKey) || 'UNKNOWN';
        this.data.orderErrorCounts.set(correlatedOrderId, (this.data.orderErrorCounts.get(correlatedOrderId) || 0) + 1);
        this.data.orderToServiceMap.set(correlatedOrderId, storeId);

        // Get store and user data from correlated order
        let effectiveStoreId = storeIdFromLog;
        let effectiveUserId = userIdFromLog;
        let effectiveStoreName = storeNameFromLog;

        // If we don't have store/user data from the error message, get it from the correlated order
        if (correlatedOrderId !== 'UNKNOWN') {
            if (!effectiveStoreId) {
                effectiveStoreId = this.data.userToStoreMap.get(`order_${correlatedOrderId}_storeId`);
            }
            if (!effectiveUserId) {
                effectiveUserId = this.data.userToStoreMap.get(`order_${correlatedOrderId}_customerId`);
            }
            if (!effectiveStoreName && effectiveStoreId) {
                effectiveStoreName = this.data.storeIdToNameMap.get(effectiveStoreId);
            }
        }

        // Track by various dimensions using effective data
        if (effectiveStoreId) {
            this.data.storeIdErrorCounts.set(effectiveStoreId, (this.data.storeIdErrorCounts.get(effectiveStoreId) || 0) + 1);
        }
        if (effectiveUserId) {
            this.data.userIdErrorCounts.set(effectiveUserId, (this.data.userIdErrorCounts.get(effectiveUserId) || 0) + 1);
        }
        if (effectiveStoreName) {
            this.data.storeNameErrorCounts.set(effectiveStoreName, (this.data.storeNameErrorCounts.get(effectiveStoreName) || 0) + 1);
        }

        // Debug logging for first few errors
        this.logDebugInfo(storeId, correlatedOrderId, timeKey, { 
            storeIdFromLog: effectiveStoreId, 
            userIdFromLog: effectiveUserId, 
            storeNameFromLog: effectiveStoreName,
            ...data 
        }, messageContent);
    }

    logDebugInfo(storeId, correlatedOrderId, timeKey, data, messageContent) {
        if (this.data.total503Errors <= CONFIG.MAX_DEBUG_ERRORS) {
            const { storeIdFromLog, userIdFromLog, storeNameFromLog, firstName, lastName, email } = data;
            
            console.log(`🚨 Found 503 error #${this.data.total503Errors}:`);
            console.log(`   ├── Service: ${storeId}`);
            console.log(`   ├── Order: ${correlatedOrderId}`);
            console.log(`   ├── Time: ${timeKey}`);
            
            if (storeIdFromLog || storeNameFromLog) {
                console.log(`   ├── Store: ID ${storeIdFromLog || 'N/A'}, Name: ${storeNameFromLog || 'N/A'}`);
            }
            if (userIdFromLog || firstName || lastName) {
                console.log(`   ├── Customer: ${firstName || ''} ${lastName || ''} (ID: ${userIdFromLog || 'N/A'})`);
                console.log(`   ├── Email: ${email || 'N/A'}`);
            }
            console.log(`   └── Message: ${messageContent.substring(0, 150)}...`);
            console.log('');
        }
    }
}

export default { CONFIG, LogAnalysisData, DataExtractor, CSVProcessor, StoreDataLoader };
