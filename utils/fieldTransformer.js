/**
 * Field Transformer Utility
 * Handles field mapping and transformation between SugarCRM and Portal Members
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load field mapping configuration
 * @param {string} mappingType - Type of mapping (e.g., 'sugarcrm_to_portal_members')
 * @returns {Promise<Object>} Field mapping configuration
 */
async function loadFieldMappings(mappingType = 'sugarcrm_to_portal_members') {
    try {
        const configPath = join(__dirname, '..', 'config', 'fieldMappings.json');
        const configData = await readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        if (!config[mappingType]) {
            throw new Error(`Field mapping configuration not found for type: ${mappingType}`);
        }
        
        return config[mappingType];
    } catch (error) {
        throw new Error(`Failed to load field mappings: ${error.message}`);
    }
}

/**
 * Transform SugarCRM record to Portal Member format
 * @param {Object} sugarcrmRecord - SugarCRM record data
 * @param {string} mappingType - Type of mapping to use
 * @returns {Promise<Object>} Transformed Portal Member record
 */
export async function transformSugarcrmToPortal(sugarcrmRecord, mappingType = 'sugarcrm_to_portal_members') {
    const mapping = await loadFieldMappings(mappingType);
    const transformedRecord = {};
    const validationErrors = [];
    
    // Apply field mappings
    for (const [sugarcrmField, mappingConfig] of Object.entries(mapping.field_mappings)) {
        const value = sugarcrmRecord[sugarcrmField];
        
        // Check if field is required and missing
        if (mappingConfig.required && (!value || value === '')) {
            validationErrors.push(`Missing required field: ${sugarcrmField}`);
            continue;
        }
        
        // Apply transformation based on type
        let transformedValue = value;
        
        switch (mappingConfig.transform) {
            case 'direct':
                transformedValue = value;
                break;
            case 'uppercase':
                transformedValue = value ? value.toString().toUpperCase() : value;
                break;
            case 'lowercase':
                transformedValue = value ? value.toString().toLowerCase() : value;
                break;
            case 'trim':
                transformedValue = value ? value.toString().trim() : value;
                break;
            default:
                transformedValue = value;
        }
        
        // Only add field if it has a value or is required
        if (transformedValue !== null && transformedValue !== undefined && transformedValue !== '') {
            transformedRecord[mappingConfig.portal_field] = transformedValue;
        }
    }
    
    // Apply default values (if they exist)
    if (mapping.default_values) {
        for (const [field, value] of Object.entries(mapping.default_values)) {
            if (!transformedRecord[field]) {
                transformedRecord[field] = value;
            }
        }
    }
    
    // Apply computed fields (if they exist)
    if (mapping.computed_fields) {
        for (const [field, config] of Object.entries(mapping.computed_fields)) {
            let computedValue;
            
            switch (config.transform) {
                case 'timestamp':
                    computedValue = new Date().toISOString();
                    break;
                case 'copy_from_name':
                    computedValue = transformedRecord.name;
                    break;
                case 'current_date':
                    computedValue = new Date().toISOString().split('T')[0];
                    break;
                default:
                    computedValue = null;
            }
            
            if (computedValue !== null) {
                transformedRecord[config.portal_field] = computedValue;
            }
        }
    }
    
    // Validate the transformed record (if validation rules exist)
    const isValid = mapping.validation_rules ? 
        validateTransformedRecord(transformedRecord, mapping.validation_rules, validationErrors) : 
        true;
    
    return {
        data: transformedRecord,
        isValid: isValid,
        validationErrors: validationErrors,
        mapping: mapping
    };
}

/**
 * Validate transformed record
 * @param {Object} record - Transformed record
 * @param {Object} validationRules - Validation rules
 * @param {Array} existingErrors - Existing validation errors
 * @returns {boolean} Whether the record is valid
 */
function validateTransformedRecord(record, validationRules, existingErrors) {
    let isValid = true;
    
    // Check required fields
    if (validationRules.required_fields) {
        for (const field of validationRules.required_fields) {
            if (!record[field] || record[field] === '') {
                existingErrors.push(`Missing required field: ${field}`);
                isValid = false;
            }
        }
    }
    
    // Email validation
    if (validationRules.email_validation && record.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailString = typeof record.email === 'object' ? JSON.stringify(record.email) : record.email;
        if (!emailRegex.test(emailString)) {
            existingErrors.push(`Invalid email format: ${emailString}`);
            isValid = false;
        }
    }
    
    // Phone validation
    if (validationRules.phone_validation && record.phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(record.phone.replace(/[\s\-\(\)]/g, ''))) {
            existingErrors.push(`Invalid phone format: ${record.phone}`);
            isValid = false;
        }
    }
    
    return isValid;
}

/**
 * Get field mapping configuration
 * @param {string} mappingType - Type of mapping
 * @returns {Promise<Object>} Field mapping configuration
 */
export async function getFieldMapping(mappingType = 'sugarcrm_to_portal_members') {
    return await loadFieldMappings(mappingType);
}

/**
 * Get required fields for a mapping type
 * @param {string} mappingType - Type of mapping
 * @returns {Promise<Array>} Array of required field names
 */
export async function getRequiredFields(mappingType = 'sugarcrm_to_portal_members') {
    const mapping = await loadFieldMappings(mappingType);
    const requiredFields = [];
    
    for (const [sugarcrmField, config] of Object.entries(mapping.field_mappings)) {
        if (config.required) {
            requiredFields.push(sugarcrmField);
        }
    }
    
    return requiredFields;
}

/**
 * Get all SugarCRM fields that should be fetched
 * @param {string} mappingType - Type of mapping
 * @returns {Promise<Array>} Array of SugarCRM field names
 */
export async function getSugarcrmFields(mappingType = 'sugarcrm_to_portal_members') {
    const mapping = await loadFieldMappings(mappingType);
    return Object.keys(mapping.field_mappings);
}
