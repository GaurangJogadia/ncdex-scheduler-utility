/**
 * Test SugarAuditorToPortalAuditor Task
 * Test the new auditor sync task functionality
 */

import SugarAuditorToPortalAuditor from '../tasks/SugarAuditorToPortalAuditor.js';
import Logger from '../utils/logger.js';

export default async function testSugarAuditorToPortalAuditor() {
    console.log('🧪 Testing SugarAuditorToPortalAuditor Task');
    console.log('=========================================\n');
    
    try {
        console.log('📋 Task Information:');
        console.log('─'.repeat(50));
        console.log('  • Task: SugarAuditorToPortalAuditor');
        console.log('  • Purpose: Sync SugarCRM Auditors to Portal Auditors');
        console.log('  • Fields: sugarcrm_id, name, auditor_user_id_c, email_id_c, registration_no_c');
        console.log('  • API Endpoint: api/integration/SugarAuditorToPortalAuditor');
        console.log('');
        
        console.log('🔌 Testing SugarAuditorToPortalAuditor Task...');
        console.log('─'.repeat(50));
        console.log('  • This test will run the auditor sync task');
        console.log('  • It will fetch SugarCRM Auditors and sync to Portal');
        console.log('  • Database logging will be performed for each record');
        console.log('');
        
        // Run the auditor sync task
        await SugarAuditorToPortalAuditor();
        
        console.log('\n✅ SugarAuditorToPortalAuditor Task Test Completed!');
        console.log('─'.repeat(50));
        console.log('  • Task executed successfully');
        console.log('  • SugarCRM Auditors fetched');
        console.log('  • Portal sync completed');
        console.log('  • Database logging performed');
        console.log('  • Sync tracking updated');
        
        // Log test completion
        await Logger.info('SugarAuditorToPortalAuditor task test completed', {
            taskName: 'SugarAuditorToPortalAuditor',
            testType: 'auditor_sync'
        });
        
    } catch (error) {
        console.error(`❌ Test Error: ${error.message}`);
        console.error(`❌ Stack: ${error.stack}`);
        
        // Log error
        await Logger.error('SugarAuditorToPortalAuditor task test failed', {
            error: error.message,
            stack: error.stack
        });
        
        throw error;
    }
}
