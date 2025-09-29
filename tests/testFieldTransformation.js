/**
 * Test Field Transformation
 * Demonstrates the field mapping and transformation functionality
 */

import { transformSugarcrmToPortal, getFieldMapping } from '../utils/fieldTransformer.js';

export default async function testFieldTransformation() {
    console.log('🧪 Testing Field Transformation');
    console.log('===============================\n');
    
    try {
        // Load field mapping configuration
        const mapping = await getFieldMapping('sugarcrm_to_portal_members');
        console.log('📋 Field Mapping Configuration:');
        console.log(`  • Source Module: ${mapping.module}`);
        console.log(`  • Target Module: ${mapping.target_module}`);
        console.log(`  • Field Mappings: ${Object.keys(mapping.field_mappings).length}`);
        console.log(`  • Default Values: ${mapping.default_values ? Object.keys(mapping.default_values).length : 0}`);
        console.log(`  • Computed Fields: ${mapping.computed_fields ? Object.keys(mapping.computed_fields).length : 0}\n`);
        
        // Test with sample SugarCRM record
        const sampleRecord = {
            id: 'test-123',
            tm_id_c: 'TM001',
            name: 'Test Account',
            status_c: 'Active',
            membership_category_c: 'Premium',
            gstno_c: 'GST123456789'
        };
        
        console.log('📄 Sample SugarCRM Record:');
        console.log(JSON.stringify(sampleRecord, null, 2));
        console.log('');
        
        // Transform the record
        const transformation = await transformSugarcrmToPortal(sampleRecord, 'sugarcrm_to_portal_members');
        
        console.log('🔄 Transformation Result:');
        console.log(`  • Valid: ${transformation.isValid}`);
        console.log(`  • Validation Errors: ${transformation.validationErrors.length}`);
        
        if (transformation.validationErrors.length > 0) {
            console.log('  • Errors:');
            transformation.validationErrors.forEach(error => {
                console.log(`    - ${error}`);
            });
        }
        
        console.log('\n📋 Transformed Portal Member Record:');
        console.log(JSON.stringify(transformation.data, null, 2));
        
        // Test with incomplete record
        console.log('\n' + '─'.repeat(50));
        console.log('📄 Testing with incomplete record (missing name):');
        
        const incompleteRecord = {
            id: 'test-456',
            tm_id_c: 'TM002'
            // Missing name field to test validation
        };
        
        const incompleteTransformation = await transformSugarcrmToPortal(incompleteRecord, 'sugarcrm_to_portal_members');
        
        console.log(`  • Valid: ${incompleteTransformation.isValid}`);
        console.log(`  • Validation Errors: ${incompleteTransformation.validationErrors.length}`);
        
        if (incompleteTransformation.validationErrors.length > 0) {
            console.log('  • Errors:');
            incompleteTransformation.validationErrors.forEach(error => {
                console.log(`    - ${error}`);
            });
        }
        
        console.log('\n🎉 Field transformation test completed!');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}
