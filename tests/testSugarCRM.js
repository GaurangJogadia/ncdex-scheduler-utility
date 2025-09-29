/**
 * Test SugarCRM API Connection
 * Simple test to verify SugarCRM API connectivity
 */

import { sugarCRMPost } from '../utils/sugarCRM.js';

export default async function testSugarCRM() {
    console.log('🧪 Testing SugarCRM API Connection');
    console.log('==================================\n');
    
    try {
        // Test 1: Simple request without filters
        console.log('📋 Test 1: Fetch Accounts without filters');
        console.log('─'.repeat(40));
        
        const simpleConfig = {
            module: 'Accounts',
            fields: ['id', 'name', 'date_modified'],
            maxResults: 5
        };
        
        const result = await sugarCRMPost(simpleConfig);
        console.log(`✅ Success! Fetched ${result.data.records?.length || 0} records`);
        console.log(`📊 Response structure:`, Object.keys(result.data));
        
        if (result.data.records && result.data.records.length > 0) {
            console.log(`📄 Sample record:`, result.data.records[0]);
        }
        
    } catch (error) {
        console.error(`❌ Test 1 failed: ${error.message}`);
    }
    
    console.log('\n');
    
    try {
        // Test 2: Request with simple filter
        console.log('📋 Test 2: Fetch Accounts with simple filter');
        console.log('─'.repeat(40));
        
        const filterConfig = {
            module: 'Accounts',
            filters: [
                {
                    date_modified: {
                        $gte: '2023-01-01T00:00:00Z'
                    }
                }
            ],
            fields: ['id', 'name', 'date_modified'],
            maxResults: 3
        };
        
        const result = await sugarCRMPost(filterConfig);
        console.log(`✅ Success! Fetched ${result.data.records?.length || 0} records with filter`);
        
    } catch (error) {
        console.error(`❌ Test 2 failed: ${error.message}`);
    }
    
    console.log('\n🎉 SugarCRM API test completed!');
}
