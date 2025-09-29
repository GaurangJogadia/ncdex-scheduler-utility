/**
 * Integration Logger for PostgreSQL
 * Handles logging integration activities to the integration_logs table
 */

import { query } from './database.js';
import Logger from './logger.js';

/**
 * Log integration activity to PostgreSQL
 * @param {Object} logData - Log data object
 * @param {string} logData.log_type - Log type (Info, Error, Warning, etc.)
 * @param {string} logData.module_name - SugarCRM module name
 * @param {string} logData.sugar_id - SugarCRM record ID (optional)
 * @param {string} logData.portal_id - Portal record ID (optional)
 * @param {number} logData.http_status - HTTP status code (optional)
 * @param {string} logData.internal_status - Internal status (Success, Failed, Pending, etc.)
 * @param {string} logData.message - Detailed log message
 * @returns {Promise<Object>} Log result
 */
async function logIntegration(logData) {
    const {
        log_type,
        module_name,
        sugar_id = null,
        portal_id = null,
        http_status = null,
        internal_status = null,
        message
    } = logData;

    // Validate required fields
    if (!log_type || !module_name || !message) {
        const error = 'Missing required fields: log_type, module_name, and message are required';
        console.error(`❌ Integration log error: ${error}`);
        return {
            success: false,
            error: error
        };
    }

    const insertQuery = `
        INSERT INTO integration_logs (
            log_type,
            module_name,
            sugar_id,
            portal_id,
            http_status,
            internal_status,
            message,
            log_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, log_date
    `;

    // Handle UUID format for sugar_id and portal_id
    // If the values are not valid UUIDs, convert them to null or use a default UUID
    const formatForUUID = (value) => {
        if (!value) return null;
        // Check if it's already a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(value)) {
            return value;
        }
        // If not a valid UUID, return null to avoid database error
        return null;
    };

    const params = [
        log_type,
        module_name,
        formatForUUID(sugar_id),
        formatForUUID(portal_id),
        http_status,
        internal_status,
        message
    ];

    try {
        const result = await query(insertQuery, params);
        
        if (result.success && result.rows.length > 0) {
            const logEntry = result.rows[0];
            
            // Log to console for immediate feedback
            console.log(`📝 Integration log saved: ID ${logEntry.id} - ${log_type} - ${module_name}`);
            
            // Log to file logger as well
            await Logger.info('Integration log saved to database', {
                logId: logEntry.id,
                logType: log_type,
                moduleName: module_name,
                sugarId: sugar_id,
                portalId: portal_id,
                httpStatus: http_status,
                internalStatus: internal_status
            });
            
            return {
                success: true,
                logId: logEntry.id,
                logDate: logEntry.log_date,
                message: 'Integration log saved successfully'
            };
        } else {
            throw new Error(result.error || 'Failed to insert integration log');
        }
    } catch (error) {
        console.error(`❌ Failed to save integration log: ${error.message}`);
        
        // Log error to file logger
        await Logger.error('Failed to save integration log to database', {
            error: error.message,
            logData: logData
        });
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Log SugarCRM API call
 * @param {string} moduleName - SugarCRM module name
 * @param {string} sugarId - SugarCRM record ID
 * @param {number} httpStatus - HTTP status code
 * @param {string} message - Log message
 * @param {Object} additionalData - Additional data to include
 * @returns {Promise<Object>} Log result
 */
async function logSugarCRMCall(moduleName, sugarId, httpStatus, message, additionalData = {}) {
    return await logIntegration({
        log_type: 'Info',
        module_name: moduleName,
        sugar_id: sugarId,
        http_status: httpStatus,
        internal_status: httpStatus >= 200 && httpStatus < 300 ? 'Success' : 'Failed',
        message: message,
        ...additionalData
    });
}

/**
 * Log Portal API call
 * @param {string} moduleName - Module name
 * @param {string} portalId - Portal record ID
 * @param {number} httpStatus - HTTP status code
 * @param {string} message - Log message
 * @param {Object} additionalData - Additional data to include
 * @returns {Promise<Object>} Log result
 */
async function logPortalCall(moduleName, portalId, httpStatus, message, additionalData = {}) {
    return await logIntegration({
        log_type: 'Info',
        module_name: moduleName,
        portal_id: portalId,
        http_status: httpStatus,
        internal_status: httpStatus >= 200 && httpStatus < 300 ? 'Success' : 'Failed',
        message: message,
        ...additionalData
    });
}

/**
 * Log error
 * @param {string} moduleName - Module name
 * @param {string} message - Error message
 * @param {Object} additionalData - Additional data to include
 * @returns {Promise<Object>} Log result
 */
async function logError(moduleName, message, additionalData = {}) {
    return await logIntegration({
        log_type: 'Error',
        module_name: moduleName,
        internal_status: 'Failed',
        message: message,
        ...additionalData
    });
}

/**
 * Log sync operation
 * @param {string} moduleName - Module name
 * @param {string} operation - Operation type (start, complete, failed)
 * @param {Object} syncData - Sync data
 * @returns {Promise<Object>} Log result
 */
async function logSyncOperation(moduleName, operation, syncData = {}) {
    const { recordsProcessed = 0, created = 0, updated = 0, skipped = 0, errors = 0 } = syncData;
    
    let message = '';
    let internalStatus = 'Pending';
    
    switch (operation) {
        case 'start':
            message = `Sync operation started for ${moduleName}`;
            internalStatus = 'Pending';
            break;
        case 'complete':
            message = `Sync operation completed for ${moduleName}. Processed: ${recordsProcessed}, Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`;
            internalStatus = errors > 0 ? 'Partial Success' : 'Success';
            break;
        case 'failed':
            message = `Sync operation failed for ${moduleName}: ${syncData.error || 'Unknown error'}`;
            internalStatus = 'Failed';
            break;
        default:
            message = `Sync operation ${operation} for ${moduleName}`;
    }
    
    return await logIntegration({
        log_type: operation === 'failed' ? 'Error' : 'Info',
        module_name: moduleName,
        internal_status: internalStatus,
        message: message,
        ...syncData
    });
}

/**
 * Get integration logs
 * @param {Object} filters - Filter options
 * @param {string} filters.module_name - Filter by module name
 * @param {string} filters.log_type - Filter by log type
 * @param {string} filters.internal_status - Filter by internal status
 * @param {number} filters.limit - Limit number of results
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<Object>} Query result
 */
async function getIntegrationLogs(filters = {}) {
    const {
        module_name,
        log_type,
        internal_status,
        limit = 100,
        offset = 0
    } = filters;
    
    let whereClause = '';
    const params = [];
    let paramIndex = 1;
    
    if (module_name) {
        whereClause += ` WHERE module_name = $${paramIndex}`;
        params.push(module_name);
        paramIndex++;
    }
    
    if (log_type) {
        whereClause += whereClause ? ` AND log_type = $${paramIndex}` : ` WHERE log_type = $${paramIndex}`;
        params.push(log_type);
        paramIndex++;
    }
    
    if (internal_status) {
        whereClause += whereClause ? ` AND internal_status = $${paramIndex}` : ` WHERE internal_status = $${paramIndex}`;
        params.push(internal_status);
        paramIndex++;
    }
    
    const query = `
        SELECT 
            id,
            log_type,
            module_name,
            sugar_id,
            portal_id,
            http_status,
            internal_status,
            message,
            log_date
        FROM integration_logs
        ${whereClause}
        ORDER BY log_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    return await query(query, params);
}

export {
    logIntegration,
    logSugarCRMCall,
    logPortalCall,
    logError,
    logSyncOperation,
    getIntegrationLogs
};
