/**
 * SugarCRM Account to Portal Member Sync Task
 * Syncs SugarCRM Accounts data into the Portal Members module
 */

import { getSyncRecord, updateSyncRecord, getSyncStatistics } from '../utils/syncTracker.js';
import { sugarCRMPost, getDefaultFields, fetchAllRecords } from '../utils/sugarCRM.js';
import { transformSugarcrmToPortal, getSugarcrmFields } from '../utils/fieldTransformer.js';
import Logger from '../utils/logger.js';
import { callPortalAPIWithEnv } from '../utils/portalAPI.js';

/**
 * Main task function that syncs SugarCRM Accounts to Portal Members
 */
export default async function SugarCRMAccountToPortalMember() {
    console.log('🔄 Starting SugarCRM Account to Portal Member sync...');
    
    const moduleName = 'Members';
    const sugarCRMModule = 'Accounts';
    const currentTimestamp = new Date().toISOString();
    
    // Log task start
    await Logger.taskStart('SugarCRMAccountToPortalMember', {
        moduleName,
        sugarCRMModule,
        timestamp: currentTimestamp
    });
    
    try {
        // Get last sync date for the Members module
        const syncRecord = await getSyncRecord(moduleName);
        let lastSyncDate = null;
        
        if (syncRecord && syncRecord.last_sync_at) {
            lastSyncDate = syncRecord.last_sync_at;
            console.log(`\n📅 Last sync date for module '${moduleName}': ${new Date(lastSyncDate).toLocaleString()}`);
            await Logger.info(`Last sync date found for module '${moduleName}'`, {
                moduleName,
                lastSyncDate,
                syncRecord
            });
        } else {
            console.log(`\n📅 No previous sync found for module '${moduleName}' - will fetch all records`);
            await Logger.info(`No previous sync found for module '${moduleName}' - will fetch all records`, {
                moduleName
            });
        }
        
        // Prepare filters for SugarCRM API
        const filters = [];
        
        // Add date filter if we have a last sync date
        if (lastSyncDate) {
            filters.push({
                date_modified: {
                    $gte: lastSyncDate
                }
            });
            console.log(`  🔍 Filter: date_modified >= ${new Date(lastSyncDate).toLocaleString()}`);
        } else {
            console.log(`  🔍 No date filter - fetching all records`);
        }
        
        // Add tm_id_c filter to get only members with valid TM ID
        filters.push({
            tm_id_c: {
                "$not_null": ""
            }
        });
        filters.push({
            tm_id_c: {
                "$not_equals": "0"
            }
        });
        console.log('  🔍 Filter: tm_id_c is not null and not equals "0"');
        filters.push({
            acc_type_c: {
                "$equals": "Member"
            }
        });
        console.log('  🔍 Filter: acc_type_c equals "Member"');
        
        // Get fields to fetch based on field mapping configuration
        const fields = await getSugarcrmFields('sugarcrm_to_portal_members');
        console.log(`  📋 Fields to fetch: ${fields.join(', ')}`);
        
        // Configure the API request
        const apiConfig = {
            module: sugarCRMModule,
            filters: filters,
            fields: fields,
            maxResults: 50, // Fetch 50 records per page
            orderBy: 'date_modified',
            orderDirection: 'desc'
        };
        
        console.log(`\n🚀 Fetching ${sugarCRMModule} records from SugarCRM...`);
        
        // Log API call
        await Logger.apiCall('POST', `${process.env.SUGARCRM_API_URL}/${sugarCRMModule}`, {
            module: sugarCRMModule,
            filters,
            fields,
            maxResults: apiConfig.maxResults
        });
        
        // Fetch all records with pagination
        const fetchResult = await fetchAllRecords(apiConfig, (records, response) => {
            console.log(`  📄 Fetched page: ${records.length} records (Total so far: ${response.data.total_count})`);
        });
        
        const { records, total_fetched } = fetchResult;
        
        console.log(`Total records fetched: ${total_fetched}`);
        
        // Log fetch results
        await Logger.info(`SugarCRM records fetched successfully`, {
            module: sugarCRMModule,
            totalFetched: total_fetched,
            recordsCount: records.length
        });
        
        if (records.length === 0) {
            console.log('\n✅ No new or modified records found - sync up to date');
        } else {
            // Process the fetched records
            console.log('\n🔄 Processing records for Portal Member sync...');
            
            const processedRecords = await processRecordsForPortalMembers(records);
            
            console.log(`\n📈 Processing Summary:`);
            console.log(`  • Records processed: ${processedRecords.length}`);
            
            // Print all processed records before pushing to portal
            console.log('\n📋 Complete Processed Records Array:');
            console.log('─'.repeat(60));
            console.log(JSON.stringify(processedRecords, null, 2));
            console.log('─'.repeat(60));
            
            // Log processed records
            await Logger.dataProcessing('Processed records ready for portal sync', processedRecords, {
                totalRecords: processedRecords.length,
                accountsWithOfficers,
                totalComplianceOfficers
            });
            
            // Sync to Portal Members
            const portalResponse = await syncToPortalMembers(processedRecords);
            
            console.log(`\n🎯 Portal Member Sync Results:`);
            console.log(`  • Total Records: ${portalResponse.length}`);
            
            // Count different statuses
            const statusCounts = portalResponse.reduce((counts, record) => {
                counts[record.internalStatus] = (counts[record.internalStatus] || 0) + 1;
                return counts;
            }, {});
            
            Object.entries(statusCounts).forEach(([status, count]) => {
                console.log(`  • ${status}: ${count}`);
            });
            
            // Log sync results
            await Logger.info('Portal Member sync completed', {
                totalRecords: portalResponse.length,
                statusCounts,
                portalResponse
            });
        }
            
            // Update sync record on success
        await updateSyncRecord(moduleName, {
                status: 'success',
            last_sync_at: currentTimestamp,
                metadata: {
                records_fetched: total_fetched,
                sugarcrm_module: sugarCRMModule,
                sync_duration: currentTimestamp,
                last_sync_date_used: lastSyncDate
            }
        });
        
        console.log('\n✅ SugarCRM Account to Portal Member sync completed successfully!');
        
        // Log task completion
        await Logger.taskComplete('SugarCRMAccountToPortalMember', {
            moduleName,
            totalFetched: total_fetched,
            timestamp: currentTimestamp
        });
            
        } catch (error) {
        console.error(`\n❌ Sync failed: ${error.message}`);
        
        // Log task failure
        await Logger.taskFailed('SugarCRMAccountToPortalMember', error.message, {
            moduleName,
            sugarCRMModule,
            timestamp: currentTimestamp
        });
            
            // Update sync record on failure
            try {
            await updateSyncRecord(moduleName, {
                    status: 'failed',
                    metadata: {
                        error_message: error.message,
                    failed_at: new Date().toISOString(),
                    sugarcrm_module: sugarCRMModule
                    }
                });
            console.log('💾 Sync record updated with failure status');
            } catch (updateError) {
            console.log(`⚠️  Failed to update sync record: ${updateError.message}`);
            await Logger.error('Failed to update sync record', {
                moduleName,
                updateError: updateError.message
            });
        }
        
        throw error;
    }
}

/**
 * Process SugarCRM Account records for Portal Member sync
 * @param {Array} records - Array of SugarCRM Account records
 * @returns {Promise<Array>} Processed records ready for Portal Member sync
 */
async function processRecordsForPortalMembers(records) {
    console.log('  🔄 Processing records with field transformation...');
    
    const processedRecords = [];
    
    for (const record of records) {
        try {
            // Transform SugarCRM record to Portal Member format
            const transformation = await transformSugarcrmToPortal(record, 'sugarcrm_to_portal_members');
            
            // Create simple processed record with only essential fields
            const processed = {
                tm_id_c: transformation.data.tm_id_c || null,
                member_name: transformation.data.member_name || null,
                status_c: transformation.data.status_c || null,
                membership_category_c: transformation.data.membership_category_c || null,
                sugarcrm_id: transformation.data.sugarcrm_id || null
            };
            
            console.log(`    ✅ Processed account: ${record.name || record.id}`);
            
            processedRecords.push(processed);
            
        } catch (error) {
            console.log(`    ⚠️  Error processing record ${record.id}: ${error.message}`);
            processedRecords.push({
                tm_id_c: null,
                member_name: record.name || null,
                status_c: null,
                membership_category_c: null,
                sugarcrm_id: record.id || null
            });
        }
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return processedRecords;
}

/**
 * Sync processed records to Portal Members
 * @param {Array} processedRecords - Array of processed records
 * @returns {Promise<Array>} Portal API response array or empty array if no records
 */
async function syncToPortalMembers(processedRecords) {
    console.log('  🔄 Syncing to Portal Members...');
    
    if (processedRecords.length === 0) {
        console.log('    ⏭️  No records to sync');
        return [];
    }
    
    try {
        // Call Portal API with all processed records using generic utility
        const syncResult = await callPortalAPIWithEnv(
            'api/integration/SugarMemberToPortalMember',
            processedRecords,
            {
                moduleName: 'Members',
                metadata: {
                    taskName: 'SugarCRMAccountToPortalMember',
                    recordCount: processedRecords.length
                }
            }
        );
        
        if (syncResult.success) {
            // Return the portal API response directly
            console.log(`    ✅ Portal sync completed successfully`);
            console.log(`    📊 Processed ${processedRecords.length} records`);
            
            // Log successful sync
            await Logger.info('Portal Members sync completed successfully', {
                totalRecords: processedRecords.length,
                responseData: syncResult.data
            });
            
            // Return the portal API response as-is
            return syncResult.data;
        } else {
            throw new Error(syncResult.error || 'Unknown error from Portal API');
        }
        
    } catch (error) {
        console.log(`    ❌ Error syncing to Portal Members: ${error.message}`);
        
        // Log error
        await Logger.error('Portal Members sync failed', {
            error: error.message,
            recordCount: processedRecords.length
        });
        
        throw error;
    }
}
