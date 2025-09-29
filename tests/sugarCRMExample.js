/**
 * SugarCRM API Example Task
 * Demonstrates the generic SugarCRM POST method usage
 */

import { sugarCRMPost, createDateFilter, createTextFilter, getDefaultFields } from '../utils/sugarCRM.js';

/**
 * Example task demonstrating SugarCRM API usage
 */
export default async function sugarCRMExample() {
    console.log('🔧 SugarCRM API Example Task');
    console.log('============================\n');
    
    try {
        // Example 1: Fetch all Accounts
        console.log('📋 Example 1: Fetch all Accounts');
        console.log('─'.repeat(40));
        
        const accountsConfig = {
            module: 'Accounts',
            fields: getDefaultFields('Accounts'),
            maxResults: 10
        };
        
        const accountsResult = await sugarCRMPost(accountsConfig);
        console.log(`✅ Fetched ${accountsResult.data.records.length} Accounts`);
        console.log(`   Total available: ${accountsResult.data.total_count}`);
        console.log(`   Has more pages: ${accountsResult.data.has_more}\n`);
        
        // Example 2: Fetch Contacts with filters
        console.log('📋 Example 2: Fetch Contacts with filters');
        console.log('─'.repeat(40));
        
        const contactsConfig = {
            module: 'Contacts',
            filters: [
                createTextFilter('status', '$eq', 'Active'),
                createDateFilter('date_modified', '$gte', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            ],
            fields: ['id', 'first_name', 'last_name', 'email', 'phone_mobile', 'date_modified'],
            maxResults: 5
        };
        
        const contactsResult = await sugarCRMPost(contactsConfig);
        console.log(`✅ Fetched ${contactsResult.data.records.length} Contacts (Active, modified in last 7 days)`);
        console.log(`   Total available: ${contactsResult.data.total_count}\n`);
        
        // Example 3: Fetch Leads with list filter
        console.log('📋 Example 3: Fetch Leads with list filter');
        console.log('─'.repeat(40));
        
        const leadsConfig = {
            module: 'Leads',
            filters: [
                {
                    lead_source: {
                        $in: ['Website', 'Referral', 'Cold Call']
                    }
                },
                createTextFilter('status', '$ne', 'Converted')
            ],
            fields: ['id', 'first_name', 'last_name', 'company', 'lead_source', 'status', 'date_modified'],
            maxResults: 8,
            orderBy: 'date_modified',
            orderDirection: 'desc'
        };
        
        const leadsResult = await sugarCRMPost(leadsConfig);
        console.log(`✅ Fetched ${leadsResult.data.records.length} Leads (specific sources, not converted)`);
        console.log(`   Total available: ${leadsResult.data.total_count}\n`);
        
        // Example 4: Fetch Opportunities with complex filters
        console.log('📋 Example 4: Fetch Opportunities with complex filters');
        console.log('─'.repeat(40));
        
        const opportunitiesConfig = {
            module: 'Opportunities',
            filters: [
                createTextFilter('sales_stage', '$ne', 'Closed Won'),
                createTextFilter('sales_stage', '$ne', 'Closed Lost'),
                createDateFilter('expected_close_date', '$gte', new Date().toISOString())
            ],
            fields: ['id', 'name', 'amount', 'sales_stage', 'probability', 'expected_close_date', 'account_name'],
            maxResults: 6,
            orderBy: 'expected_close_date',
            orderDirection: 'asc'
        };
        
        const opportunitiesResult = await sugarCRMPost(opportunitiesConfig);
        console.log(`✅ Fetched ${opportunitiesResult.data.records.length} Opportunities (open, future close dates)`);
        console.log(`   Total available: ${opportunitiesResult.data.total_count}\n`);
        
        // Summary
        console.log('📊 Summary:');
        console.log('─'.repeat(40));
        console.log(`• Accounts: ${accountsResult.data.records.length} records`);
        console.log(`• Contacts: ${contactsResult.data.records.length} records`);
        console.log(`• Leads: ${leadsResult.data.records.length} records`);
        console.log(`• Opportunities: ${opportunitiesResult.data.records.length} records`);
        
        console.log('\n🎉 SugarCRM API Example completed successfully!');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}
