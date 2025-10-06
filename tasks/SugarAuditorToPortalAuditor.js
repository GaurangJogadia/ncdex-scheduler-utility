/**
 * SugarCRM Auditor to Portal Auditor Sync Task
 * Syncs SugarCRM Auditors data to Portal Auditors
 */

import { sugarCRMPost, fetchAllRecords, authenticateSugarCRM } from '../utils/sugarCRM.js';
import { callPortalAPIWithEnv } from '../utils/portalAPI.js';
import { getSyncRecord, updateSyncRecord } from '../utils/syncTracker.js';
import { getSugarcrmFields, transformSugarcrmToPortal } from '../utils/fieldTransformer.js';
import Logger from '../utils/logger.js';

/**
 * Main task function for syncing SugarCRM Auditors to Portal Auditors
 */
export default async function sugarAuditorToPortalAuditor() {
    console.log('📊 SugarCRM Auditor to Portal Auditor Sync');
    console.log('==========================================\n');
    
    try {
        // Log task start
        await Logger.taskStart('SugarAuditorToPortalAuditor', {
            taskType: 'SugarCRM to Portal Sync',
            module: 'Auditors'
        });
        
        // Get last sync date for Auditors module
        const syncRecord = await getSyncRecord('Auditors');
        if (!syncRecord) {
            throw new Error('No sync record found for Auditors module. Please create one first.');
        }
        
        const lastSyncDate = syncRecord.last_sync_at;
        console.log(`📅 Last sync date: ${lastSyncDate}`);
        
        // Get fields to fetch for Auditors from field mapping configuration
        const auditorFields = await getSugarcrmFields('sugarcrm_to_portal_auditors');
        console.log(`📋 Fields to fetch: ${auditorFields.join(', ')}`);
        
        // Create filters for SugarCRM API
        const filters = [
            {
                date_modified: {
                    $gte: lastSyncDate
                }
            }
        ];
        
        console.log(`  • Date filter: >= ${lastSyncDate}`);
        
        // Fetch all auditor records from SugarCRM
        const auditorRecords = await fetchAllRecords({
            module: 'aud_Auditor',
            fields: auditorFields.join(','),
            filters: filters,
            orderBy: 'date_modified:asc'
        });
        
        console.log(`✅ Found ${auditorRecords.records.length} auditor records to process`);
        
        if (auditorRecords.records.length === 0) {
            console.log('⏭️  No new auditor records to sync');
            return;
        }
        
        // Process records for Portal Auditors
        console.log('🔄 Processing auditor records for Portal...');
        const processedRecords = await processRecordsForPortalAuditors(auditorRecords.records);
        
        console.log(`✅ Processed ${processedRecords.length} auditor records`);
        
        // Print processed records for verification
        console.log('\n📋 Transformed Auditor Records:');
        console.log('─'.repeat(50));
        console.log(JSON.stringify(processedRecords, null, 2));
        
        // Sync to Portal Auditors
        const portalResponse = await syncToPortalAuditors(processedRecords);
        
        console.log(`\n🎯 Portal Auditor Sync Results:`);
        const responseArray = Array.isArray(portalResponse) ? portalResponse : [];
        console.log(`  • Total Records: ${responseArray.length}`);
        
        // Count different statuses
        const statusCounts = responseArray.reduce((counts, record) => {
            counts[record.internalStatus] = (counts[record.internalStatus] || 0) + 1;
            return counts;
        }, {});
        
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  • ${status}: ${count}`);
        });
        
        // Update sync record with current timestamp
        const currentTime = new Date().toISOString();
        updateSyncRecord('Auditors', {
            last_sync_at: currentTime,
            updated_at: currentTime,
            status: 'completed'
        });
        
        console.log(`\n✅ Sync completed successfully at ${currentTime}`);
        
        // Log task completion
        await Logger.taskComplete('SugarAuditorToPortalAuditor', {
            totalRecords: processedRecords.length,
            statusCounts,
            portalResponse
        });
        
    } catch (error) {
        console.error(`❌ Sync failed: ${error.message}`);
        
        // Log task failure
        await Logger.taskFailed('SugarAuditorToPortalAuditor', {
            error: error.message,
            stack: error.stack
        });
        
        throw error;
    }
}

/**
 * Process SugarCRM auditor records for Portal Auditors
 * @param {Array} auditorRecords - Array of SugarCRM auditor records
 * @returns {Array} Processed records for Portal
 */
async function processRecordsForPortalAuditors(auditorRecords) {
    console.log('🔄 Processing auditor records...');
    
    const processedRecords = [];
    
    for (const record of auditorRecords) {
        try {
            // Transform SugarCRM auditor record to Portal Auditor format using field transformer
            const transformed = await transformSugarcrmToPortal(record, 'sugarcrm_to_portal_auditors');
            
            // Extract only the data field with the 5 required fields
            const processed = {
                sugarcrm_id: transformed.data.sugarcrm_id,
                name: transformed.data.name,
                auditor_user_id_c: transformed.data.auditor_user_id_c,
                email_id_c: transformed.data.email_id_c,
                registration_no_c: transformed.data.registration_no_c
            };
            
            processedRecords.push(processed);
            
        } catch (error) {
            console.error(`❌ Error processing auditor record ${record.id}: ${error.message}`);
            
            // Add record with error information
            processedRecords.push({
                sugarcrm_id: record.id,
                name: record.name || 'Unknown',
                auditor_user_id_c: record.auditor_user_id_c || null,
                email_id_c: record.email_id_c || null,
                registration_no_c: record.registration_no_c || null
            });
        }
    }
    
    return processedRecords;
}

/**
 * Sync processed auditor records to Portal Auditors
 * @param {Array} processedRecords - Array of processed auditor records
 * @returns {Promise<Array>} Portal API response
 */
async function syncToPortalAuditors(processedRecords) {
    console.log('  🔄 Syncing to Portal Auditors...');
    
    if (processedRecords.length === 0) {
        console.log('    ⏭️  No records to sync');
        return [];
    }
    
    try {
        // Call Portal API with all processed records using generic utility
        const syncResult = await callPortalAPIWithEnv(
            'api/integration/SugarAuditorToPortalAuditor',
            processedRecords,
            {
                moduleName: 'Auditors',
                metadata: {
                    taskName: 'SugarAuditorToPortalAuditor',
                    recordCount: processedRecords.length
                }
            }
        );
        
        if (syncResult.success) {
            // Return the portal API response directly
            console.log(`    ✅ Portal sync completed successfully`);
            console.log(`    📊 Processed ${processedRecords.length} records`);
            
            // Log successful sync
            await Logger.info('Portal Auditors sync completed successfully', {
                totalRecords: processedRecords.length,
                responseData: syncResult.data
            });
            
            // Return the portal API response as-is
            return syncResult.data;
        } else {
            throw new Error(syncResult.error || 'Unknown error from Portal API');
        }
        
    } catch (error) {
        console.log(`    ❌ Error syncing to Portal Auditors: ${error.message}`);
        
        // Log error
        await Logger.error('Portal Auditors sync failed', {
            error: error.message,
            recordCount: processedRecords.length
        });
        
        throw error;
    }
}
