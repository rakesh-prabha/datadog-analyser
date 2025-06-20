
// Load environment variables *before* any other code, especially anything that uses process.env
import dotenv from 'dotenv';
dotenv.config();

// Standard Node.js imports for file system operations and path manipulation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// CSV parser library
import csv from 'csv-parser';

// Google Gen AI SDK import - Changed to GoogleGenAI as requested
import {GoogleGenAI} from '@google/genai';

// --- Configuration from .env ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const GOOGLE_GENAI_USE_VERTEXAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true'; // Convert string 'true' to boolean

// --- Application Specific Configuration ---
// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_FILE_PATH = path.join(__dirname, '..', 'data-input', 'extract-2025-06-19T05_50_23.398Z.csv'); // Path to your exported CSV file
// IMPORTANT: Adjust these column names to match your Datadog CSV export
const STATUS_CODE_COLUMN = 'Message'; // The message content where we'll search for 503 errors
const STORE_IDENTIFIER_COLUMN = 'Service'; // e.g., 'service', 'host', 'store_id', 'tags.store_name'
const ERROR_CODE_TO_LOOK_FOR = '503'; // The specific HTTP error code you're interested in
const MODEL_NAME_TO_USE = "gemini-2.0-flash"; // 'gemini-pro' is generally better for text analysis,
                                    // 'gemini-2.0-flash' is faster/cheaper but can be less deep.
                                    // You can use 'gemini-2.0-flash' if you prefer.

/**
 * Handles generating content using the ML Dev API (Google AI Studio).
 * @param {string} promptContent The text prompt to send to the model.
 * @param {string} modelName The model to use (e.g., 'gemini-pro', 'gemini-2.0-flash').
 * @returns {Promise<string>} The response text from the model.
 */
async function generateContentFromMLDev(promptContent, modelName) {
  // Use GoogleGenAI here
  const ai = new GoogleGenAI({vertexai: false, apiKey: GEMINI_API_KEY}); // API Key for ML Dev API
  const response = await ai.models.generateContent({
    model: modelName,
    contents: promptContent,
  });
  return response.text;
}

/**
 * Handles generating content using Google Cloud Vertex AI.
 * @param {string} promptContent The text prompt to send to the model.
 * @param {string} modelName The model to use (e.g., 'gemini-pro', 'gemini-2.0-flash').
 * @returns {Promise<string>} The response text from the model.
 */
async function generateContentFromVertexAI(promptContent, modelName) {
  // Use GoogleGenAI here
  const ai = new GoogleGenAI({
    vertexai: true,
    project: GOOGLE_CLOUD_PROJECT,
    location: GOOGLE_CLOUD_LOCATION,
  });
  const response = await ai.models.generateContent({
    model: modelName,
    contents: promptContent,
  });
  return response.text;
}

/**
 * Reads the CSV, processes the logs, and prepares the detailed prompt
 * for the Gemini model.
 * @returns {Promise<string>} The constructed prompt string.
 */
async function prepareLogAnalysisPrompt() {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        throw new Error(`CSV file not found at ${CSV_FILE_PATH}. Please ensure your exported Datadog CSV is named 'datadog_logs.csv' and placed in the same directory as this script.`);
    }

    const storeErrorCounts = new Map(); // Stores { 'store_id': count } for 503 errors
    const orderErrorCounts = new Map(); // Stores { 'order_id': count } for 503 errors
    const orderToServiceMap = new Map(); // Maps order_id to service for cross-reference
    const timestampToOrderMap = new Map(); // Maps timestamp (to nearest second) to order ID
    const storeIdErrorCounts = new Map(); // Stores { 'storeId': count } for 503 errors
    const userIdErrorCounts = new Map(); // Stores { 'userId': count } for 503 errors
    const storeNameErrorCounts = new Map(); // Stores { 'store_name': count } for 503 errors
    const storeIdToNameMap = new Map(); // Maps storeId to store name
    const userToStoreMap = new Map(); // Maps userId to storeId for cross-reference
    let total503Errors = 0;
    let totalProcessedRows = 0;

    console.log(`Starting analysis of ${CSV_FILE_PATH} for ${ERROR_CODE_TO_LOOK_FOR} errors...`);

    // Use a Promise to handle the asynchronous nature of CSV parsing
    await new Promise((resolve, reject) => {
        fs.createReadStream(CSV_FILE_PATH)
            .pipe(csv())
            .on('data', (row) => {
                totalProcessedRows++;
                const messageContent = String(row[STATUS_CODE_COLUMN] || '').trim();
                const storeId = String(row[STORE_IDENTIFIER_COLUMN] || 'UNKNOWN').trim();
                const timestamp = String(row['Date'] || '').trim();
                
                // Extract timestamp to nearest second for correlation
                const timeKey = timestamp.substring(0, 19); // "2025-06-18T21:20:48"
                
                // Extract order ID from any message that contains it
                let orderId = null;
                let storeIdFromLog = null;
                let userIdFromLog = null;
                let storeNameFromLog = null;
                let userFirstName = null;
                let userLastName = null;
                let userEmail = null;
                
                try {
                    // Extract order ID
                    const orderIdMatch = messageContent.match(/\\"orderId\\":\s*\\"([^"]+)\\"/);
                    if (orderIdMatch && orderIdMatch[1]) {
                        orderId = orderIdMatch[1];
                        timestampToOrderMap.set(timeKey, orderId);
                    }
                    
                    // Extract storeId (using pickupLocation as store identifier)
                    const storeIdMatch = messageContent.match(/\\"?pickupLocation\\"?:\s*(\d+)/);
                    if (storeIdMatch && storeIdMatch[1]) {
                        storeIdFromLog = storeIdMatch[1];
                    }
                    
                    // Extract userId (using memberId as user identifier)
                    const userIdMatch = messageContent.match(/\\"?memberId\\"?:\s*(\d+)/);
                    if (userIdMatch && userIdMatch[1]) {
                        userIdFromLog = userIdMatch[1];
                    }
                    
                    // Extract user details
                    const firstNameMatch = messageContent.match(/\\"?firstName\\"?:\s*\\"([^"]+)\\"/);
                    if (firstNameMatch && firstNameMatch[1]) {
                        userFirstName = firstNameMatch[1];
                    }
                    
                    const lastNameMatch = messageContent.match(/\\"?lastName\\"?:\s*\\"([^"]+)\\"/);
                    if (lastNameMatch && lastNameMatch[1]) {
                        userLastName = lastNameMatch[1];
                    }
                    
                    const emailMatch = messageContent.match(/\\"?email\\"?:\s*\\"([^"]+)\\"/);
                    if (emailMatch && emailMatch[1]) {
                        userEmail = emailMatch[1];
                    }
                    
                    // Extract store name from store object or from other patterns
                    let storeNameMatch = messageContent.match(/\\"?store\\"?:\s*{\s*\\"?name\\"?:\s*\\"([^"]+)\\"/);
                    if (!storeNameMatch) {
                        // Try alternative patterns for store name
                        storeNameMatch = messageContent.match(/\\"?storeName\\"?:\s*\\"([^"]+)\\"/);
                    }
                    if (storeNameMatch && storeNameMatch[1]) {
                        storeNameFromLog = storeNameMatch[1];
                    }
                    
                    // Map storeId to store name if both are available
                    if (storeIdFromLog && storeNameFromLog) {
                        storeIdToNameMap.set(storeIdFromLog, storeNameFromLog);
                    }
                    
                    // Map userId to storeId for cross-reference
                    if (userIdFromLog && storeIdFromLog) {
                        userToStoreMap.set(userIdFromLog, storeIdFromLog);
                    }
                    
                    // Store comprehensive order and customer correlation data
                    if (orderId && userIdFromLog && (userFirstName || userLastName || userEmail)) {
                        const userName = `${userFirstName || ''} ${userLastName || ''}`.trim() || userEmail || `User ${userIdFromLog}`;
                        
                        // Map order to customer details
                        if (!userToStoreMap.has(`order_${orderId}_customer`)) {
                            userToStoreMap.set(`order_${orderId}_customer`, userName);
                            userToStoreMap.set(`order_${orderId}_customerId`, userIdFromLog);
                            if (userEmail) {
                                userToStoreMap.set(`order_${orderId}_customerEmail`, userEmail);
                            }
                            if (storeIdFromLog) {
                                userToStoreMap.set(`order_${orderId}_storeId`, storeIdFromLog);
                                const storeName = storeIdToNameMap.get(storeIdFromLog);
                                if (storeName) {
                                    userToStoreMap.set(`order_${orderId}_storeName`, storeName);
                                }
                            }
                        }
                    }
                    
                    // Store user details for display
                    if (userIdFromLog && (userFirstName || userLastName || userEmail)) {
                        const userName = `${userFirstName || ''} ${userLastName || ''}`.trim() || userEmail || `User ${userIdFromLog}`;
                        if (!userToStoreMap.has(`${userIdFromLog}_name`)) {
                            userToStoreMap.set(`${userIdFromLog}_name`, userName);
                            if (userEmail) {
                                userToStoreMap.set(`${userIdFromLog}_email`, userEmail);
                            }
                        }
                    }
                    
                } catch (e) {
                    // If regex matching fails, continue
                }

                // Check if the message contains 503 error indicators
                if (messageContent.includes(ERROR_CODE_TO_LOOK_FOR) || 
                    messageContent.includes('Service Unavailable') ||
                    messageContent.includes('HTTP Error 503')) {
                    total503Errors++;
                    storeErrorCounts.set(storeId, (storeErrorCounts.get(storeId) || 0) + 1);
                    
                    // Try to correlate with an order ID from the same time period
                    let correlatedOrderId = timestampToOrderMap.get(timeKey) || 'UNKNOWN';
                    
                    // Track errors by order ID
                    orderErrorCounts.set(correlatedOrderId, (orderErrorCounts.get(correlatedOrderId) || 0) + 1);
                    orderToServiceMap.set(correlatedOrderId, storeId);
                    
                    // Track errors by storeId if available
                    if (storeIdFromLog) {
                        storeIdErrorCounts.set(storeIdFromLog, (storeIdErrorCounts.get(storeIdFromLog) || 0) + 1);
                    }
                    
                    // Track errors by userId if available
                    if (userIdFromLog) {
                        userIdErrorCounts.set(userIdFromLog, (userIdErrorCounts.get(userIdFromLog) || 0) + 1);
                    }
                    
                    // Track errors by store name if available
                    if (storeNameFromLog) {
                        storeNameErrorCounts.set(storeNameFromLog, (storeNameErrorCounts.get(storeNameFromLog) || 0) + 1);
                    }
                    
                    // Log the first few 503 errors for debugging with enhanced details
                    if (total503Errors <= 3) {
                        console.log(`Found 503 error #${total503Errors} in service: ${storeId}, order: ${correlatedOrderId} (time: ${timeKey})`);
                        if (storeIdFromLog || userIdFromLog || storeNameFromLog || userFirstName || userLastName) {
                            console.log(`  Store details: storeId=${storeIdFromLog || 'N/A'}, storeName=${storeNameFromLog || 'N/A'}`);
                            console.log(`  Customer details: userId=${userIdFromLog || 'N/A'}, name=${userFirstName || ''} ${userLastName || ''}, email=${userEmail || 'N/A'}`);
                        }
                        console.log(`Message snippet: ${messageContent.substring(0, 200)}...`);
                    }
                }
            })
            .on('end', () => {
                console.log(`\nFinished parsing CSV.`);
                console.log(`Total rows processed: ${totalProcessedRows}`);
                console.log(`Total ${ERROR_CODE_TO_LOOK_FOR} errors found: ${total503Errors}`);
                resolve();
            })
            .on('error', (err) => {
                console.error('Error reading or parsing CSV:', err.message);
                reject(err);
            });
    }); // Catch handled by caller (main)

    // --- Prepare summary for Google Gemini ---
    let analysisSummary = `Log analysis results summary:\n`;
    analysisSummary += `Total logs analyzed: ${totalProcessedRows}\n`;
    analysisSummary += `Total "${ERROR_CODE_TO_LOOK_FOR} Service Unavailable" errors detected: ${total503Errors}\n\n`;

    if (total503Errors === 0) {
        analysisSummary += `No ${ERROR_CODE_TO_LOOK_FOR} errors were identified in the provided log file. Everything looks good!\n`;
    } else {
        analysisSummary += `Breakdown of ${ERROR_CODE_TO_LOOK_FOR} errors by store/service:\n`;
        if (storeErrorCounts.size === 0) {
            analysisSummary += ` (No specific store/service identifier found for these errors, or the '${STORE_IDENTIFIER_COLUMN}' column was empty in relevant rows).\n`;
        } else {
            // Sort services by error count descending for better readability
            const sortedStoreErrors = Array.from(storeErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sortedStoreErrors.forEach(([store, count]) => {
                analysisSummary += `- Store/Service "${store}": ${count} errors\n`;
            });
        }

        analysisSummary += `\nBreakdown of ${ERROR_CODE_TO_LOOK_FOR} errors by Order ID with Customer Details:\n`;
        if (orderErrorCounts.size === 0) {
            analysisSummary += ` (No order IDs could be extracted from the error messages).\n`;
        } else {
            // Sort orders by error count descending
            const sortedOrderErrors = Array.from(orderErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sortedOrderErrors.slice(0, 20).forEach(([orderId, count]) => { // Show top 20 orders
                const serviceName = orderToServiceMap.get(orderId) || 'UNKNOWN';
                
                // Get customer details directly linked to this order
                const customerName = userToStoreMap.get(`order_${orderId}_customer`) || 'Customer details not available';
                const customerEmail = userToStoreMap.get(`order_${orderId}_customerEmail`) || '';
                const storeId = userToStoreMap.get(`order_${orderId}_storeId`) || '';
                const storeName = userToStoreMap.get(`order_${orderId}_storeName`) || 
                                 (storeId ? storeIdToNameMap.get(storeId) : '') || 'Store details not available';
                
                const customerInfo = customerEmail ? `${customerName} (${customerEmail})` : customerName;
                const storeInfo = storeId ? `${storeName} (Store ID: ${storeId})` : storeName;
                
                analysisSummary += `- Order "${orderId}" (${count} errors)\n`;
                analysisSummary += `  └── Service: ${serviceName}\n`;
                analysisSummary += `  └── Customer: ${customerInfo}\n`;
                analysisSummary += `  └── Store: ${storeInfo}\n\n`;
            });
            
            if (sortedOrderErrors.length > 20) {
                analysisSummary += `... and ${sortedOrderErrors.length - 20} more orders affected\n`;
            }
        }

        // Add Store ID breakdown
        analysisSummary += `\nBreakdown of ${ERROR_CODE_TO_LOOK_FOR} errors by Store ID:\n`;
        if (storeIdErrorCounts.size === 0) {
            analysisSummary += ` (No store IDs could be extracted from the error messages).\n`;
        } else {
            const sortedStoreIdErrors = Array.from(storeIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sortedStoreIdErrors.forEach(([storeId, count]) => {
                const storeName = storeIdToNameMap.get(storeId) || 'Unknown Store';
                analysisSummary += `- Store ID ${storeId} (${storeName}): ${count} errors\n`;
            });
        }

        // Add Store Name breakdown
        analysisSummary += `\nBreakdown of ${ERROR_CODE_TO_LOOK_FOR} errors by Store Name:\n`;
        if (storeNameErrorCounts.size === 0) {
            analysisSummary += ` (No store names could be extracted from the error messages).\n`;
        } else {
            const sortedStoreNameErrors = Array.from(storeNameErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sortedStoreNameErrors.forEach(([storeName, count]) => {
                analysisSummary += `- Store "${storeName}": ${count} errors\n`;
            });
        }

        // Add User ID breakdown with customer details
        analysisSummary += `\nBreakdown of ${ERROR_CODE_TO_LOOK_FOR} errors by Customer Details:\n`;
        if (userIdErrorCounts.size === 0) {
            analysisSummary += ` (No user IDs could be extracted from the error messages).\n`;
        } else {
            const sortedUserErrors = Array.from(userIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
            sortedUserErrors.slice(0, 10).forEach(([userId, count]) => { // Show top 10 users
                const associatedStore = userToStoreMap.get(userId);
                const storeName = associatedStore ? storeIdToNameMap.get(associatedStore) || `Store ${associatedStore}` : 'Unknown Store';
                const userName = userToStoreMap.get(`${userId}_name`) || `User ${userId}`;
                const userEmail = userToStoreMap.get(`${userId}_email`) || 'No email';
                
                analysisSummary += `- Customer: ${userName} (ID: ${userId})\n`;
                analysisSummary += `  └── Email: ${userEmail}\n`;
                analysisSummary += `  └── Store: ${storeName} (Store ID: ${associatedStore || 'Unknown'})\n`;
                analysisSummary += `  └── Error Count: ${count}\n\n`;
            });
            if (sortedUserErrors.length > 10) {
                analysisSummary += `... and ${sortedUserErrors.length - 10} more customers affected\n`;
            }
        }

        analysisSummary += `\nNote: 'UNKNOWN' refers to errors where the identifier was empty or could not be extracted.\n`;
    }

    console.log("\n--- Analysis Summary for Gemini ---");
    console.log(analysisSummary);

    console.log("\n=== DETAILED CUSTOMER & STORE IMPACT ===");
    
    // Show summary of all affected customer names and store names
    console.log("\n📋 SUMMARY OF AFFECTED ENTITIES:");
    
    // Collect unique customer names
    const affectedCustomers = new Set();
    const affectedStoreNames = new Set();
    
    for (const [key, value] of userToStoreMap.entries()) {
        if (key.includes('_name') && !key.startsWith('order_')) {
            affectedCustomers.add(value);
        }
    }
    
    for (const [storeId, storeName] of storeIdToNameMap.entries()) {
        if (storeIdErrorCounts.has(storeId)) {
            affectedStoreNames.add(storeName);
        }
    }
    
    console.log(`• Total Affected Customers: ${affectedCustomers.size}`);
    if (affectedCustomers.size > 0) {
        const customerList = Array.from(affectedCustomers).slice(0, 10);
        console.log(`  └── Sample Customer Names: ${customerList.join(', ')}${affectedCustomers.size > 10 ? '...' : ''}`);
    }
    
    console.log(`• Total Affected Store Locations: ${affectedStoreNames.size}`);
    if (affectedStoreNames.size > 0) {
        const storeList = Array.from(affectedStoreNames);
        console.log(`  └── Store Names: ${storeList.join(', ')}`);
    }
    
    // Show detailed customer information for affected customers
    if (userIdErrorCounts.size > 0) {
        console.log("\n👤 AFFECTED CUSTOMERS DETAILS:");
        const sortedUserErrors = Array.from(userIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
        
        sortedUserErrors.slice(0, 15).forEach(([userId, errorCount], index) => {
            const associatedStore = userToStoreMap.get(userId);
            const storeName = associatedStore ? storeIdToNameMap.get(associatedStore) || `Store ${associatedStore}` : 'Unknown Store';
            const userName = userToStoreMap.get(`${userId}_name`) || `User ${userId}`;
            const userEmail = userToStoreMap.get(`${userId}_email`) || 'Email not available';
            
            console.log(`${index + 1}. Customer: ${userName}`);
            console.log(`   ├── User ID: ${userId}`);
            console.log(`   ├── Email: ${userEmail}`);
            console.log(`   ├── Store: ${storeName} (ID: ${associatedStore || 'Unknown'})`);
            console.log(`   └── Error Count: ${errorCount}`);
            console.log('');
        });
        
        if (sortedUserErrors.length > 15) {
            console.log(`   ... and ${sortedUserErrors.length - 15} more customers affected\n`);
        }
    }
    
    // Show detailed store information
    if (storeIdErrorCounts.size > 0) {
        console.log("\n🏪 AFFECTED STORE LOCATIONS DETAILS:");
        const sortedStoreErrors = Array.from(storeIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
        
        sortedStoreErrors.forEach(([storeId, errorCount], index) => {
            const storeName = storeIdToNameMap.get(storeId) || 'Store name not available';
            
            // Count unique customers at this store
            const customersAtStore = Array.from(userToStoreMap.entries())
                .filter(([key, value]) => !key.includes('_') && value === storeId).length;
            
            console.log(`${index + 1}. Store: ${storeName}`);
            console.log(`   ├── Store ID: ${storeId}`);
            console.log(`   ├── Error Count: ${errorCount}`);
            console.log(`   └── Customers Affected: ${customersAtStore}`);
            console.log('');
        });
    }

    // --- Generate detailed analysis insights ---
    console.log("\n=== DETAILED ANALYSIS INSIGHTS ===");
    
    // Error Distribution Analysis
    console.log("\n📊 ERROR DISTRIBUTION ANALYSIS:");
    console.log(`• Total 503 Errors Found: ${total503Errors}`);
    console.log(`• Total Log Entries Processed: ${totalProcessedRows}`);
    console.log(`• Error Rate: ${((total503Errors / totalProcessedRows) * 100).toFixed(2)}% of all log entries`);
    
    // Uniqueness Analysis
    const uniqueOrders = orderErrorCounts.size;
    const uniqueServices = storeErrorCounts.size;
    const uniqueStores = storeIdErrorCounts.size;
    const uniqueUsers = userIdErrorCounts.size;
    const uniqueStoreNames = storeNameErrorCounts.size;
    
    console.log("\n🔍 UNIQUENESS ANALYSIS:");
    console.log(`• Unique Order IDs Affected: ${uniqueOrders}`);
    console.log(`• Unique Services Affected: ${uniqueServices}`);
    console.log(`• Unique Store IDs Affected: ${uniqueStores}`);
    console.log(`• Unique Store Names Affected: ${uniqueStoreNames}`);
    console.log(`• Unique Users Affected: ${uniqueUsers}`);
    console.log(`• Average Errors per Order: ${(total503Errors / uniqueOrders).toFixed(2)}`);
    if (uniqueStores > 0) {
        console.log(`• Average Errors per Store: ${(total503Errors / uniqueStores).toFixed(2)}`);
    }
    
    // Customer Correlation Analysis
    console.log("\n👥 CUSTOMER CORRELATION ANALYSIS:");
    console.log(`• 1 Order ID = 1 Customer Order = 1 Customer Affected`);
    console.log(`• ${uniqueOrders} Unique Order IDs = ${uniqueOrders} Customers Affected`);
    
    if (uniqueUsers > 0) {
        console.log(`• ${uniqueUsers} Unique User IDs = ${uniqueUsers} Individual Users Affected`);
        if (uniqueUsers !== uniqueOrders) {
            console.log(`• Some users may have placed multiple orders or order correlation needs review`);
        }
    }
    
    if (uniqueStores > 0) {
        console.log(`• ${uniqueStores} Unique Store IDs = ${uniqueStores} Physical Store Locations Affected`);
        
        // Find most affected stores
        const sortedStoreErrors = Array.from(storeIdErrorCounts.entries()).sort((a, b) => b[1] - a[1]);
        const topAffectedStore = sortedStoreErrors[0];
        if (topAffectedStore) {
            const storeName = storeIdToNameMap.get(topAffectedStore[0]) || 'Unknown';
            console.log(`• Most Affected Store: Store ID ${topAffectedStore[0]} (${storeName}) with ${topAffectedStore[1]} errors`);
        }
    }
    
    // Calculate patterns
    const ordersWithMultipleErrors = Array.from(orderErrorCounts.values()).filter(count => count > 1).length;
    const ordersWithSingleError = uniqueOrders - ordersWithMultipleErrors;
    
    console.log(`• Customers with Single Error: ${ordersWithSingleError} (${((ordersWithSingleError / uniqueOrders) * 100).toFixed(1)}%)`);
    console.log(`• Customers with Multiple Errors: ${ordersWithMultipleErrors} (${((ordersWithMultipleErrors / uniqueOrders) * 100).toFixed(1)}%)`);
    
    // Business Impact
    const avgOrderValue = 12; // Estimated from data ($8.20-$15.00 range)
    const estimatedRevenueLoss = uniqueOrders * avgOrderValue;
    
    console.log("\n💰 BUSINESS IMPACT ESTIMATION:");
    console.log(`• Estimated Average Order Value: $${avgOrderValue}`);
    console.log(`• Estimated Revenue at Risk: $${estimatedRevenueLoss} (${uniqueOrders} orders × $${avgOrderValue})`);
    console.log(`• Customer Experience Impact: ${uniqueOrders} customers experienced failed orders`);
    
    // Data Quality & Confidence Analysis
    const orderExtractionSuccessRate = (uniqueOrders / total503Errors) * 100;
    const timestampCorrelationRate = Array.from(timestampToOrderMap.keys()).length / totalProcessedRows * 100;
    
    console.log("\n📈 DATA QUALITY & CONFIDENCE ANALYSIS:");
    console.log(`• Order ID Extraction Success Rate: ${orderExtractionSuccessRate.toFixed(1)}% (${uniqueOrders}/${total503Errors} errors correlated)`);
    console.log(`• Timestamp Correlation Coverage: ${timestampCorrelationRate.toFixed(1)}% of log entries`);
    
    // Confidence Level Assessment
    let confidenceLevel = "HIGH";
    let confidenceReasons = [];
    
    if (orderExtractionSuccessRate >= 90) {
        confidenceReasons.push("✅ Excellent order ID extraction rate");
    } else if (orderExtractionSuccessRate >= 70) {
        confidenceReasons.push("⚠️ Good order ID extraction rate");
        confidenceLevel = "MEDIUM-HIGH";
    } else {
        confidenceReasons.push("❌ Low order ID extraction rate");
        confidenceLevel = "MEDIUM";
    }
    
    if (uniqueOrders === total503Errors) {
        confidenceReasons.push("✅ Perfect 1:1 error-to-order correlation");
    } else if (uniqueOrders >= total503Errors * 0.8) {
        confidenceReasons.push("✅ Strong error-to-order correlation");
    } else {
        confidenceReasons.push("⚠️ Some errors not correlated to orders");
        if (confidenceLevel === "HIGH") confidenceLevel = "MEDIUM-HIGH";
    }
    
    if (uniqueServices === 1) {
        confidenceReasons.push("✅ Single service failure pattern (clear root cause)");
    } else {
        confidenceReasons.push("⚠️ Multiple services affected (complex issue)");
        if (confidenceLevel === "HIGH") confidenceLevel = "MEDIUM-HIGH";
    }
    
    console.log(`\n🎯 CONFIDENCE LEVEL: ${confidenceLevel}`);
    console.log("📋 Confidence Assessment Factors:");
    confidenceReasons.forEach(reason => console.log(`   ${reason}`));
    
    // Reliability Metrics
    console.log("\n📊 RELIABILITY METRICS:");
    console.log(`• Data Completeness: ${((total503Errors / totalProcessedRows) * 100).toFixed(1)}% error coverage`);
    console.log(`• Customer Identification: ${orderExtractionSuccessRate.toFixed(1)}% success rate`);
    console.log(`• Pattern Consistency: ${uniqueServices === 1 ? 'Single service pattern' : 'Multi-service pattern'}`);
    
    // Recommendations based on confidence
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

    // --- Construct the specific prompt for Gemini ---
    const prompt = `You are an expert operations engineer specialized in analyzing application logs and identifying service health issues. I have provided a summary of ${ERROR_CODE_TO_LOOK_FOR} "Service Unavailable" errors found in a recent Datadog log export.

    Your task is to analyze this summary and provide a concise, actionable report covering the following:

    1.  **Overall Status:** Did ${ERROR_CODE_TO_LOOK_FOR} errors occur? If so, what is the total count?
    2.  **Per-Store/Service Analysis:** List any stores or services that experienced ${ERROR_CODE_TO_LOOK_FOR} errors.
    3.  **Order-Level Analysis:** Identify specific orders that failed and analyze patterns. This helps pinpoint which restaurant/location had issues.
    4.  **Store-Level Impact:** Analyze which specific store locations (by Store ID and Store Name) were affected and their error patterns.
    5.  **User-Level Impact:** Identify individual users affected and any patterns in user impact.
    6.  **Identify High-Impact Areas:** Specifically highlight any store(s), service(s), users, or orders that experienced *multiple* (more than 1) ${ERROR_CODE_TO_LOOK_FOR} errors. Quantify the errors for these specific high-impact areas.
    7.  **Recommended Next Steps:** Based on the presence and distribution of these errors, suggest immediate next steps for investigation and troubleshooting. Be specific (e.g., "Check logs for Store ID X", "Contact User Y", "Monitor Z metric for Service W", "Investigate Store Location for Order ID"). If no errors were found, state that and suggest ongoing monitoring.

    --- Log Analysis Summary ---
    ${analysisSummary}
    --- End of Summary ---

    Please structure your answer clearly with headings for each point (Overall Status, Per-Store/Service Analysis, Order-Level Analysis, Store-Level Impact, User-Level Impact, High-Impact Areas, Recommended Next Steps). Keep it professional and focused on operational insights.`;

    return prompt;
}

// Main execution function
async function main() {
  let geminiResponseText;
  let promptContent;

  try {
    // Step 1: Prepare the prompt by analyzing the CSV
    promptContent = await prepareLogAnalysisPrompt();
  } catch (e) {
    console.error('Error during CSV analysis:', e.message);
    process.exit(1); // Exit if CSV analysis fails
  }

  // Step 2: Send the prepared prompt to Gemini using your existing API selection logic
  if (GOOGLE_GENAI_USE_VERTEXAI) {
    console.log('Attempting to use Vertex AI...');
    if (!GOOGLE_CLOUD_PROJECT || !GOOGLE_CLOUD_LOCATION) {
        console.error('Error: GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION must be set in .env for Vertex AI.');
        process.exit(1);
    }
    try {
      geminiResponseText = await generateContentFromVertexAI(promptContent, MODEL_NAME_TO_USE);
    } catch (e) {
      console.error('Vertex AI failed:', e.message);
      console.log('Falling back to ML Dev API...');
      if (!GEMINI_API_KEY) {
        console.error('No GEMINI_API_KEY found in environment variables. Please set it to use the ML Dev API.');
        process.exit(1);
      }
      geminiResponseText = await generateContentFromMLDev(promptContent, MODEL_NAME_TO_USE).catch((e) => {
        console.error('ML Dev API also failed:', e);
        return null; // Return null on failure to prevent console.log(null)
      });
    }
  } else {
    console.log('Using ML Dev API...');
    if (!GEMINI_API_KEY) {
      console.error('No GEMINI_API_KEY found in environment variables. Please set it to use the ML Dev API.');
      process.exit(1);
    }
    geminiResponseText = await generateContentFromMLDev(promptContent, MODEL_NAME_TO_USE).catch((e) => {
      console.error('Error calling ML Dev API:', e);
      return null;
    });
  }

  // Step 3: Display Gemini's analysis
  if (geminiResponseText) {
    console.log("\n--- Google Gemini's Analysis Report ---");
    console.log(geminiResponseText);
  } else {
    console.log("\nNo analysis report could be generated due to previous errors.");
  }
}

// Run the main function
main();
