/**
 * SugarCRM Relationship Data Example
 * Demonstrates practical usage of relationship data fetching
 */

import { fetchRelationshipData, fetchAllRelationshipRecords } from '../utils/sugarCRM.js';

export default async function sugarCRMRelationshipExample() {
    console.log('🔗 SugarCRM Relationship Data Example');
    console.log('====================================\n');
    
    try {
        // Example 1: Get compliance officers for an account
        console.log('📋 Example 1: Get Compliance Officers for Account');
        console.log('─'.repeat(50));
        
        const accountId = '41ebddea-5c63-11ee-87d0-00155d641607';
        const complianceOfficers = await fetchRelationshipData(
            'Accounts',
            accountId,
            'accounts_comp_compliance_officers_1',
            {
                fields: ['id', 'name', 'status_c', 'date_modified'],
                filters: [
                    { status_c: 1 }  // Only active compliance officers
                ],
                maxResults: 20
            }
        );
        
        console.log(`✅ Found ${complianceOfficers.total_records} active compliance officers`);
        if (complianceOfficers.data.records) {
            complianceOfficers.data.records.forEach((officer, index) => {
                console.log(`  ${index + 1}. ${officer.name} (ID: ${officer.id})`);
            });
        }
        
        // Example 2: Get all compliance officers (different filter)
        console.log('\n📋 Example 2: Get All Compliance Officers (No Filter)');
        console.log('─'.repeat(50));
        
        const allOfficers = await fetchRelationshipData(
            'Accounts',
            accountId,
            'accounts_comp_compliance_officers_1',
            {
                fields: ['id', 'name', 'status_c', 'date_modified'],
                maxResults: 10
            }
        );
        
        console.log(`✅ Found ${allOfficers.total_records} compliance officers`);
        if (allOfficers.data.records) {
            allOfficers.data.records.forEach((officer, index) => {
                const status = officer.status_c ? 'Active' : 'Inactive';
                console.log(`  ${index + 1}. ${officer.name || 'Unnamed'} (${status})`);
            });
        }
        
        // Example 3: Get compliance officers with date filter
        console.log('\n📋 Example 3: Get Recent Compliance Officers (Date Filter)');
        console.log('─'.repeat(50));
        
        const recentOfficers = await fetchRelationshipData(
            'Accounts',
            accountId,
            'accounts_comp_compliance_officers_1',
            {
                fields: ['id', 'name', 'status_c', 'date_modified'],
                filters: [
                    { 
                        date_modified: { 
                            $gte: '2025-09-01'  // Officers modified from September 2025
                        } 
                    }
                ],
                maxResults: 15,
                orderBy: 'date_modified',
                orderDirection: 'desc'
            }
        );
        
        console.log(`✅ Found ${recentOfficers.total_records} recently modified officers`);
        if (recentOfficers.data.records) {
            recentOfficers.data.records.forEach((officer, index) => {
                console.log(`  ${index + 1}. ${officer.name || 'Unnamed'} - ${officer.date_modified}`);
            });
        }
        
        // Example 4: Fetch all compliance officers with pagination
        console.log('\n📋 Example 4: Fetch All Compliance Officers (with pagination)');
        console.log('─'.repeat(50));
        
        const allOfficersPaginated = await fetchAllRelationshipRecords(
            'Accounts',
            accountId,
            'accounts_comp_compliance_officers_1',
            {
                fields: ['id', 'name', 'status_c', 'date_modified'],
                maxResults: 3  // Small page size for demonstration
            },
            (records, response) => {
                console.log(`📄 Fetched page: ${records.length} officers`);
            }
        );
        
        console.log(`✅ Total officers fetched: ${allOfficersPaginated.total_fetched}`);
        if (allOfficersPaginated.records.length > 0) {
            console.log('📄 Sample officers:');
            allOfficersPaginated.records.slice(0, 3).forEach((officer, index) => {
                const status = officer.status_c ? 'Active' : 'Inactive';
                console.log(`  ${index + 1}. ${officer.name || 'Unnamed'} (${status})`);
            });
        }
        
        // Example 5: Generic function usage
        console.log('\n📋 Example 5: Generic Relationship Data Function');
        console.log('─'.repeat(50));
        
        /**
         * Generic function to get relationship data for any module
         * @param {string} module - Module name
         * @param {string} recordId - Record ID
         * @param {string} linkName - Link name
         * @param {Array} fields - Fields to fetch
         * @param {Array} filters - Filters to apply
         */
        async function getRelationshipData(module, recordId, linkName, fields, filters = []) {
            return await fetchRelationshipData(module, recordId, linkName, {
                fields: fields,
                filters: filters,
                maxResults: 50
            });
        }
        
        // Usage example
        const genericResult = await getRelationshipData(
            'Accounts',
            accountId,
            'accounts_comp_compliance_officers_1',
            ['id', 'name', 'status_c'],
            [{ status_c: 1 }]
        );
        
        console.log(`✅ Generic function result: ${genericResult.total_records} records`);
        
        console.log('\n🎉 Relationship data examples completed!');
        console.log('\n📝 Usage Summary:');
        console.log('  • fetchRelationshipData() - Single page of relationship data');
        console.log('  • fetchAllRelationshipRecords() - All records with pagination');
        console.log('  • Supports MongoDB-style filters');
        console.log('  • Supports field selection, ordering, and pagination');
        console.log('  • Works with any module and relationship link');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}
