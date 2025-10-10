/**
 * SugarCRM Cases to Portal Cases Sync Task
 * Syncs SugarCRM Cases data into the Portal Cases module
 */

import { getSyncRecord, updateSyncRecord, getSyncStatistics } from '../utils/syncTracker.js';
import { sugarCRMPost, getDefaultFields, fetchAllRecords } from '../utils/sugarCRM.js';
import { transformSugarcrmToPortal, getSugarcrmFields } from '../utils/fieldTransformer.js';
import Logger from '../utils/logger.js';
import { callPortalAPIWithEnv } from '../utils/portalAPI.js';

/**
 * Main task function for SugarCRM Cases to Portal Cases sync
 */
export default async function SugarImportCasesToPortalCases() {
    const taskName = 'SugarImportCasesToPortalCases';
    const moduleName = 'Cases';
    const sugarCRMModule = 'Cases';
    
    try {
        // Log task start
        await Logger.taskStart(taskName, {
            module: moduleName,
            sugarcrmModule: sugarCRMModule
        });
        
        console.log('📊 SugarCRM Cases to Portal Cases Sync');
        console.log('=====================================');
        
        // Get last sync date
        const syncRecord = await getSyncRecord(moduleName);
        const lastSyncDate = syncRecord?.last_sync_at;
        
        if (lastSyncDate) {
            console.log(`📅 Last sync date: ${new Date(lastSyncDate).toLocaleString()}`);
            await Logger.info(`Last sync date found for module '${moduleName}'`, {
                moduleName,
                lastSyncDate,
                syncRecord
            });
        } else {
            console.log('⚠️  No last sync date found - will fetch all records');
            await Logger.info(`No last sync date found for module '${moduleName}'`, {
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

        /*filters.push({
            isimport_c: {
                "$equals": "0"
            }
        });
        console.log('  🔍 Filter: isimport_c equals "0"');*/
        
        // Get fields to fetch based on field mapping configuration
        const fields = await getSugarcrmFields('sugarcrm_to_portal_cases');
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
            console.log('\n🔄 Processing records for Portal Cases sync...');
            
            const processedRecords = await processRecordsForPortalCases(records);
            
            console.log(`\n📈 Processing Summary:`);
            console.log(`  • Records processed: ${processedRecords.length}`);
            
            // Print all processed records before pushing to portal
            console.log('\n📋 Complete Processed Records Array:');
            console.log('─'.repeat(60));
            console.log(JSON.stringify(processedRecords, null, 2));
            console.log('─'.repeat(60));
            
            // Sync to Portal Cases
            console.log('\n  🔄 Syncing to Portal Cases...');
            const portalResponse = await syncToPortalCases(processedRecords);
            
            // Log processing results
            await Logger.dataProcessing(`Portal Cases sync completed`, {
                totalRecords: processedRecords.length,
                responseData: portalResponse
            });
            
            // Display results summary
            if (portalResponse && portalResponse.length > 0) {
                const statusCounts = {};
                portalResponse.forEach(result => {
                    statusCounts[result.internalStatus] = (statusCounts[result.internalStatus] || 0) + 1;
                });
                
                console.log('\n🎯 Portal Cases Sync Results:');
                console.log(`  • Total Records: ${portalResponse.length}`);
                Object.entries(statusCounts).forEach(([status, count]) => {
                    console.log(`  • ${status}: ${count}`);
                });
                
                await Logger.info(`Portal Cases sync completed`, {
                    totalRecords: portalResponse.length,
                    statusCounts,
                    portalResponse
                });
            }
        }
        
        // Update sync record on success
        const currentTimestamp = new Date().toISOString();
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
        
        console.log('\n✅ SugarCRM Cases to Portal Cases sync completed successfully!');
        
        // Log task completion
        await Logger.taskComplete(taskName, {
            module: moduleName,
            recordsProcessed: total_fetched,
            duration: Date.now() - Date.now()
        });
        
    } catch (error) {
        console.log(`\n❌ Sync failed: ${error.message}`);
        
        // Log task failure
        await Logger.taskFailed(taskName, {
            module: moduleName,
            error: error.message,
            stack: error.stack
        });
        
        // Update sync record with failure status
        const currentTimestamp = new Date().toISOString();
        await updateSyncRecord(moduleName, {
            status: 'failed',
            last_sync_at: currentTimestamp,
            metadata: {
                error_message: error.message,
                failed_at: currentTimestamp,
                sugarcrm_module: sugarCRMModule
            }
        });
        
        throw error;
    }
}

/**
 * Process SugarCRM Cases records for Portal Cases sync
 * @param {Array} records - Array of SugarCRM Cases records
 * @returns {Promise<Array>} Processed records ready for Portal Cases sync
 */
async function processRecordsForPortalCases(records) {
    console.log('  🔄 Processing records with field transformation...');
    
    const processedRecords = [];
    
    for (const record of records) {
        try {
            // Transform SugarCRM record to Portal Cases format
            const transformation = await transformSugarcrmToPortal(record, 'sugarcrm_to_portal_cases');
            
            // Create processed record strictly per field mappings in sugarcrm_to_portal_cases
            const processed = {
                case_id: transformation.data.case_id || null,
                name: transformation.data.name || null,
                case_number: transformation.data.case_number || null,
                member_id: transformation.data.member_id || null,
                type: transformation.data.type || null,
                sub_type: transformation.data.sub_type || null,
                audit_details: transformation.data.audit_details || null,
                audit_due_date: transformation.data.audit_due_date || null,
                from_period: transformation.data.from_period || null,
                to_period: transformation.data.to_period || null,
                audit_user_id: transformation.data.audit_user_id || null,
                margin: transformation.data.margin || null,
                stage: transformation.data.stage || null,
                comment: transformation.data.comment || null,
                rejection_type: transformation.data.rejection_type || null
            };
            
            console.log(`    ✅ Processed case: ${record.name || record.id}`);
            
            processedRecords.push(processed);
            
        } catch (error) {
            console.log(`    ⚠️  Error processing record ${record.id}: ${error.message}`);
            processedRecords.push({
                case_id: record.id || null,
                name: record.name || null,
                case_number: null,
                member_id: null,
                type: null,
                sub_type: null,
                audit_details: null,
                audit_due_date: null,
                from_period: null,
                to_period: null,
                audit_user_id: null,
                margin: null,
                stage: null,
                comment: null,
                rejection_type: null
            });
        }
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return processedRecords;
}

/**
 * Sync processed records to Portal Cases
 * @param {Array} processedRecords - Array of processed records
 * @returns {Promise<Array>} Portal API response
 */
async function syncToPortalCases(processedRecords) {
    if (!processedRecords || processedRecords.length === 0) {
        console.log('  ⏭️  No records to sync');
        return [];
    }
    
    try {
        const response = await callPortalAPIWithEnv(
            'api/integration/SugarCasesToPortalCases',
            processedRecords,
            {
                moduleName: 'Cases',
                metadata: {
                    totalRecords: processedRecords.length,
                    syncType: 'cases_to_portal_cases'
                }
            }
        );
        
        if (response.success) {
            console.log(`    ✅ Portal sync completed successfully`);
            console.log(`    📊 Processed ${processedRecords.length} records`);
            return response.data || [];
        } else {
            throw new Error(`Portal API call failed: ${response.error}`);
        }
        
    } catch (error) {
        console.log(`    ❌ Portal sync failed: ${error.message}`);
        throw error;
    }
}
