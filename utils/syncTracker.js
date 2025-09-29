/**
 * Sync Tracker Utility
 * Manages integration sync tracking data
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SYNC_DATA_FILE = join(__dirname, '..', 'data', 'integration_last_sync.json');

/**
 * Load sync data from the JSON file
 * @returns {Promise<Object>} The sync data object
 */
async function loadSyncData() {
    try {
        const data = await readFile(SYNC_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return default structure
            return {
                sync_records: [],
                metadata: {
                    created_at: new Date().toISOString(),
                    version: "1.0.0",
                    description: "Integration sync tracking for NCDEX scheduler utility"
                }
            };
        }
        throw new Error(`Failed to load sync data: ${error.message}`);
    }
}

/**
 * Save sync data to the JSON file
 * @param {Object} syncData - The sync data object to save
 */
async function saveSyncData(syncData) {
    try {
        await writeFile(SYNC_DATA_FILE, JSON.stringify(syncData, null, 2), 'utf8');
    } catch (error) {
        throw new Error(`Failed to save sync data: ${error.message}`);
    }
}

/**
 * Get sync record by module name or integration name
 * @param {string} identifier - Module name or integration name
 * @returns {Promise<Object|null>} The sync record or null if not found
 */
export async function getSyncRecord(identifier) {
    const syncData = await loadSyncData();
    
    return syncData.sync_records.find(record => 
        record.module_name === identifier || 
        record.integration_name === identifier
    ) || null;
}

/**
 * Update sync record with new sync information
 * @param {string} identifier - Module name or integration name
 * @param {Object} updateData - Data to update
 * @param {string} updateData.status - Sync status (success, failed, pending)
 * @param {string} updateData.last_sync_at - ISO timestamp of last sync
 * @param {Object} updateData.metadata - Additional metadata
 */
export async function updateSyncRecord(identifier, updateData = {}) {
    const syncData = await loadSyncData();
    const recordIndex = syncData.sync_records.findIndex(record => 
        record.module_name === identifier || 
        record.integration_name === identifier
    );

    if (recordIndex === -1) {
        throw new Error(`Sync record not found for identifier: ${identifier}`);
    }

    const now = new Date().toISOString();
    const record = syncData.sync_records[recordIndex];

    // Update the record
    syncData.sync_records[recordIndex] = {
        ...record,
        ...updateData,
        updated_at: now,
        last_sync_at: updateData.last_sync_at || record.last_sync_at
    };

    await saveSyncData(syncData);
    return syncData.sync_records[recordIndex];
}

/**
 * Create a new sync record
 * @param {Object} recordData - The sync record data
 * @param {string} recordData.module_name - Module name
 * @param {string} recordData.integration_name - Integration name
 * @param {string} recordData.direction - Direction (inbound, outbound)
 * @param {string} recordData.endpoint - API endpoint (optional)
 * @param {string} recordData.status - Initial status (default: pending)
 */
export async function createSyncRecord(recordData) {
    const syncData = await loadSyncData();
    const now = new Date().toISOString();

    const newRecord = {
        module_name: recordData.module_name,
        integration_name: recordData.integration_name,
        direction: recordData.direction,
        endpoint: recordData.endpoint || null,
        last_sync_at: null,
        updated_at: now,
        status: recordData.status || 'pending'
    };

    // Check if record already exists
    const existingIndex = syncData.sync_records.findIndex(record => 
        record.module_name === recordData.module_name || 
        record.integration_name === recordData.integration_name
    );

    if (existingIndex !== -1) {
        throw new Error(`Sync record already exists for module: ${recordData.module_name} or integration: ${recordData.integration_name}`);
    }

    syncData.sync_records.push(newRecord);
    await saveSyncData(syncData);
    return newRecord;
}

/**
 * Get all sync records
 * @returns {Promise<Array>} Array of all sync records
 */
export async function getAllSyncRecords() {
    const syncData = await loadSyncData();
    return syncData.sync_records;
}

/**
 * Get sync records by status
 * @param {string} status - Status to filter by (success, failed, pending)
 * @returns {Promise<Array>} Array of sync records with the specified status
 */
export async function getSyncRecordsByStatus(status) {
    const syncData = await loadSyncData();
    return syncData.sync_records.filter(record => record.status === status);
}

/**
 * Get sync records by direction
 * @param {string} direction - Direction to filter by (inbound, outbound)
 * @returns {Promise<Array>} Array of sync records with the specified direction
 */
export async function getSyncRecordsByDirection(direction) {
    const syncData = await loadSyncData();
    return syncData.sync_records.filter(record => record.direction === direction);
}

/**
 * Delete a sync record
 * @param {string} identifier - Module name or integration name
 */
export async function deleteSyncRecord(identifier) {
    const syncData = await loadSyncData();
    const recordIndex = syncData.sync_records.findIndex(record => 
        record.module_name === identifier || 
        record.integration_name === identifier
    );

    if (recordIndex === -1) {
        throw new Error(`Sync record not found for identifier: ${identifier}`);
    }

    syncData.sync_records.splice(recordIndex, 1);
    await saveSyncData(syncData);
}

/**
 * Get sync statistics
 * @returns {Promise<Object>} Statistics about sync records
 */
export async function getSyncStatistics() {
    const syncData = await loadSyncData();
    const records = syncData.sync_records;

    const stats = {
        total_records: records.length,
        by_status: {
            success: records.filter(r => r.status === 'success').length,
            failed: records.filter(r => r.status === 'failed').length,
            pending: records.filter(r => r.status === 'pending').length
        },
        by_direction: {
            inbound: records.filter(r => r.direction === 'inbound').length,
            outbound: records.filter(r => r.direction === 'outbound').length
        },
        last_updated: records.length > 0 ? 
            Math.max(...records.map(r => new Date(r.updated_at || 0).getTime())) : null
    };

    return stats;
}

/**
 * Reset all sync records (set status to pending and clear last_sync_at)
 */
export async function resetAllSyncRecords() {
    const syncData = await loadSyncData();
    const now = new Date().toISOString();

    syncData.sync_records = syncData.sync_records.map(record => ({
        ...record,
        status: 'pending',
        last_sync_at: null,
        updated_at: now
    }));

    await saveSyncData(syncData);
}
