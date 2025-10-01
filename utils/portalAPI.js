/**
 * Generic Portal API Utility
 * Reusable utility for making API calls to portal endpoints
 */

import Logger from './logger.js';
import { logIntegration } from './integrationLogger.js';
import { getPortalToken } from './portalAuth.js';

/**
 * Call Portal API with generic configuration
 * @param {string} portalUrl - Full portal API URL
 * @param {Array} data - Data to send to portal API
 * @param {Object} options - Additional options for logging and customization
 * @param {string} options.endpoint - API endpoint name for logging
 * @param {string} options.moduleName - Module name for database logging
 * @param {Object} options.metadata - Additional metadata for logging
 * @returns {Promise<Object>} API response
 */
async function callPortalAPI(portalUrl, data, options = {}) {
    const {
        endpoint = 'portal-api',
        moduleName = 'Generic',
        metadata = {}
    } = options;
    
    try {
        console.log(`    🔄 Making Portal API call to: ${portalUrl}`);
        console.log(`    📤 Sending ${data.length} records`);
        
        // Get portal authentication token
        const token = await getPortalToken();
        
        const response = await fetch(portalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        console.log(`    📥 Response received: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`    ❌ Error response body: ${errorText}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log(`    ✅ Response data received: ${JSON.stringify(responseData, null, 2)}`);
        
        // Log API call
        await Logger.apiCall('POST', portalUrl, {
            recordCount: data.length,
            endpoint: endpoint,
            moduleName: moduleName,
            ...metadata
        });
        
        // Log portal API response for each record individually
        if (responseData && Array.isArray(responseData)) {
            console.log(`    📝 Processing ${responseData.length} response records for database logging`);
            for (let i = 0; i < responseData.length; i++) {
                const result = responseData[i];
                
                // Combine message and validationErrors into a single string
                const combinedMessage = result.validationErrors
                    ? `${result.message} | Validation Errors: ${JSON.stringify(result.validationErrors)}`
                    : result.message;

                await logIntegration({
                    log_type: result.logType,
                    module_name: result.moduleName,
                    sugar_id: result.sugarId,
                    portal_id: result.portalId,
                    http_status: result.httpStatus,
                    internal_status: result.internalStatus,
                    message: combinedMessage
                });
                
                console.log(`    📝 Logged: ${result.logType} - ${result.moduleName} - ${result.sugarId} → ${result.portalId} (${result.internalStatus})`);
            }
        }
        
        console.log(`    ✅ Portal API call completed successfully`);
        return {
            success: true,
            data: responseData,
            status: response.status
        };
        
    } catch (error) {
        console.log(`    ❌ Portal API call failed: ${error.message}`);
        console.log(`    🔍 Error details: ${error.stack}`);
        
        // Log error to database
        await logIntegration({
            log_type: 'Error',
            module_name: moduleName,
            http_status: error.status || 0,
            internal_status: 'Failed',
            message: `Portal API call failed: ${error.message}`
        });
        
        return {
            success: false,
            error: error.message,
            status: error.status || 0
        };
    }
}

/**
 * Call Portal API with base URL configuration
 * @param {string} baseUrl - Portal base URL
 * @param {string} endpoint - API endpoint path
 * @param {Array} data - Data to send to portal API
 * @param {Object} options - Additional options for logging and customization
 * @returns {Promise<Object>} API response
 */
async function callPortalAPIWithBaseUrl(baseUrl, endpoint, data, options = {}) {
    const portalUrl = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    return await callPortalAPI(portalUrl, data, options);
}

/**
 * Call Portal API with environment configuration
 * @param {string} endpoint - API endpoint path
 * @param {Array} data - Data to send to portal API
 * @param {Object} options - Additional options for logging and customization
 * @returns {Promise<Object>} API response
 */
async function callPortalAPIWithEnv(endpoint, data, options = {}) {
    const baseUrl = process.env.PORTAL_BASE_URL || 'http://localhost:3001';
    
    // Set default options if not provided
    const defaultOptions = {
        endpoint: endpoint,
        moduleName: 'Portal Members',
        metadata: {}
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    return await callPortalAPIWithBaseUrl(baseUrl, endpoint, data, finalOptions);
}

/**
 * Get portal API URL from environment
 * @param {string} endpoint - API endpoint path
 * @returns {string} Full portal API URL
 */
function getPortalAPIUrl(endpoint) {
    const baseUrl = process.env.PORTAL_BASE_URL || 'http://localhost:3001';
    return `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

/**
 * Validate portal API response format
 * @param {Array} responseData - Portal API response data
 * @returns {Object} Validation result
 */
function validatePortalResponse(responseData) {
    if (!Array.isArray(responseData)) {
        return {
            valid: false,
            error: 'Response data is not an array'
        };
    }
    
    const requiredFields = ['logType', 'moduleName', 'sugarId', 'httpStatus', 'internalStatus', 'message'];
    const invalidRecords = [];
    
    responseData.forEach((record, index) => {
        const missingFields = requiredFields.filter(field => !(field in record));
        if (missingFields.length > 0) {
            invalidRecords.push({
                index,
                missingFields
            });
        }
    });
    
    if (invalidRecords.length > 0) {
        return {
            valid: false,
            error: `Invalid response format in records: ${invalidRecords.map(r => r.index).join(', ')}`,
            invalidRecords
        };
    }
    
    return {
        valid: true,
        recordCount: responseData.length
    };
}

export {
    callPortalAPI,
    callPortalAPIWithBaseUrl,
    callPortalAPIWithEnv,
    getPortalAPIUrl,
    validatePortalResponse
};
