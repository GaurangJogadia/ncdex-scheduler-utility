/**
 * Test Merged Data Structure
 * Demonstrates the combined member and compliance officer data
 */

import { getSyncRecord, updateSyncRecord } from '../utils/syncTracker.js';
import { fetchAllRecords } from '../utils/sugarCRM.js';
import { transformSugarcrmToPortal, getSugarcrmFields } from '../utils/fieldTransformer.js';
import { fetchRelationshipData } from '../utils/sugarCRM.js';

export default async function testMergedData() {
    console.log('🧪 Testing Merged Member + Compliance Officer Data');
    console.log('================================================\n');
    
    try {
        // Reset sync date to fetch some records
        await updateSyncRecord('Members', {
            last_sync_at: '2025-09-01T00:00:00.000Z'
        });
        
        const sugarCRMModule = 'Accounts';
        const fields = await getSugarcrmFields('sugarcrm_to_portal_members');
        
        // Configure the API request
        const apiConfig = {
            module: sugarCRMModule,
            filters: [{
                date_modified: {
                    $gte: '2025-09-01T00:00:00.000Z'
                }
            }],
            fields: fields,
            maxResults: 3, // Limit to 3 records for testing
            orderBy: 'date_modified',
            orderDirection: 'desc'
        };
        
        console.log('🚀 Fetching sample Accounts records...');
        const fetchResult = await fetchAllRecords(apiConfig);
        const { records } = fetchResult;
        
        console.log(`📄 Fetched ${records.length} records for testing\n`);
        
        // Process each record to show merged data
        for (const record of records) {
            console.log('─'.repeat(60));
            console.log(`📋 Processing Account: ${record.name || record.id}`);
            console.log('─'.repeat(60));
            
            // Transform SugarCRM record to Portal Member format
            const transformation = await transformSugarcrmToPortal(record, 'sugarcrm_to_portal_members');
            
            // Fetch relationship data for this account
            const relationshipData = await fetchRelationshipData(
                'Accounts',
                record.id,
                'accounts_comp_compliance_officers_1',
                {
                    fields: ['id', 'name', 'status_c', 'date_modified', 'email1', 'phone_work'],
                    maxResults: 50
                }
            );
            
            // Get the first active compliance officer (or first one if none are active)
            const complianceOfficers = relationshipData.data.records || [];
            const activeOfficer = complianceOfficers.find(officer => officer.status_c === true) || complianceOfficers[0];
            
            // Merge member data with compliance officer data
            const mergedData = {
                ...transformation.data,
                // Add compliance officer fields if available
                com_email: activeOfficer?.email1 || null,
                com_phone_no: activeOfficer?.phone_work || null,
                com_name: activeOfficer?.name || null
            };
            
            console.log('📊 Merged Data Structure:');
            console.log(JSON.stringify(mergedData, null, 2));
            
            console.log('\n📈 Data Breakdown:');
            console.log(`  • Member ID: ${mergedData.tm_id_c || 'N/A'}`);
            console.log(`  • Member Name: ${mergedData.member_name || 'N/A'}`);
            console.log(`  • Status: ${mergedData.status_c || 'N/A'}`);
            console.log(`  • Membership Category: ${mergedData.membership_category_c || 'N/A'}`);
            console.log(`  • SugarCRM ID: ${mergedData.sugarcrm_id || 'N/A'}`);
            console.log(`  • GST No: ${mergedData.gst_no || 'N/A'}`);
            console.log(`  • Compliance Officer Name: ${mergedData.com_name || 'N/A'}`);
            console.log(`  • Compliance Officer Email: ${mergedData.com_email || 'N/A'}`);
            console.log(`  • Compliance Officer Phone: ${mergedData.com_phone_no || 'N/A'}`);
            
            console.log(`\n🔗 Relationship Data:`);
            console.log(`  • Total Compliance Officers: ${complianceOfficers.length}`);
            if (activeOfficer) {
                console.log(`  • Selected Officer: ${activeOfficer.name || 'Unnamed'} (${activeOfficer.status_c ? 'Active' : 'Inactive'})`);
            } else {
                console.log(`  • No compliance officers found`);
            }
            
            console.log('');
        }
        
        console.log('🎉 Merged data structure test completed!');
        console.log('\n📝 Summary:');
        console.log('  • Each record now contains both member and compliance officer data');
        console.log('  • Compliance officer fields are prefixed with "com_"');
        console.log('  • Active compliance officers are prioritized');
        console.log('  • Null values are used when no compliance officer is found');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}
