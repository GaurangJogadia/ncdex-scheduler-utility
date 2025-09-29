/**
 * Test Relationship Data Fetching
 * Demonstrates how to fetch relationship data from SugarCRM
 */

import { fetchRelationshipData, fetchAllRelationshipRecords } from '../utils/sugarCRM.js';

export default async function testRelationshipData() {
    console.log('🔗 Testing SugarCRM Relationship Data Fetching');
    console.log('==============================================\n');
    
    try {
        // Test 1: Fetch relationship data with basic parameters
        console.log('📋 Test 1: Basic relationship data fetch');
        console.log('─'.repeat(50));
        
        const module = 'Accounts';
        const recordId = '41ebddea-5c63-11ee-87d0-00155d641607';
        const linkName = 'accounts_comp_compliance_officers_1';
        
        const basicOptions = {
            fields: ['id', 'name', 'status_c', 'date_modified'],
            maxResults: 5
        };
        
        const basicResult = await fetchRelationshipData(module, recordId, linkName, basicOptions);
        
        console.log(`✅ Successfully fetched ${basicResult.total_records} records`);
        console.log(`📄 Response data:`, JSON.stringify(basicResult.data, null, 2));
        
        // Test 2: Fetch with filters
        console.log('\n📋 Test 2: Relationship data with filters');
        console.log('─'.repeat(50));
        
        const filterOptions = {
            fields: ['id', 'name', 'status_c', 'date_modified'],
            filters: [
                { status_c: 1 }  // MongoDB style filter
            ],
            maxResults: 10
        };
        
        const filterResult = await fetchRelationshipData(module, recordId, linkName, filterOptions);
        
        console.log(`✅ Successfully fetched ${filterResult.total_records} filtered records`);
        console.log(`📄 Response data:`, JSON.stringify(filterResult.data, null, 2));
        
        // Test 3: Fetch all records with pagination
        console.log('\n📋 Test 3: Fetch all relationship records with pagination');
        console.log('─'.repeat(50));
        
        const paginationOptions = {
            fields: ['id', 'name', 'status_c'],
            maxResults: 3  // Small page size for testing
        };
        
        const allRecordsResult = await fetchAllRelationshipRecords(
            module, 
            recordId, 
            linkName, 
            paginationOptions,
            (records, response) => {
                console.log(`📄 Fetched page: ${records.length} records`);
            }
        );
        
        console.log(`✅ Successfully fetched ${allRecordsResult.total_fetched} total records`);
        console.log(`📄 Sample records:`, JSON.stringify(allRecordsResult.records.slice(0, 2), null, 2));
        
        // Test 4: Different module and link example
        console.log('\n📋 Test 4: Different module example (Contacts)');
        console.log('─'.repeat(50));
        
        const contactOptions = {
            fields: ['id', 'first_name', 'last_name', 'email1'],
            maxResults: 3
        };
        
        // Note: This is just an example - you would need a valid Contact ID and link name
        console.log('📝 Example for Contacts module:');
        console.log('   fetchRelationshipData("Contacts", "contact-id", "contacts_accounts_1", contactOptions)');
        
        console.log('\n🎉 Relationship data fetching tests completed!');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}
