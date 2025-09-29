/**
 * SugarCRM API Utility
 * Generic methods for interacting with SugarCRM REST API
 */

/**
 * Authenticate with SugarCRM and get OAuth token
 * @returns {Promise<string>} OAuth token
 */
export async function authenticateSugarCRM() {
    const username = process.env.SUGARCRM_USERNAME;
    const password = process.env.SUGARCRM_PASSWORD;
    const apiUrl = process.env.SUGARCRM_API_URL;
    
    if (!username || !password || !apiUrl) {
        throw new Error('Missing required environment variables: SUGARCRM_USERNAME, SUGARCRM_PASSWORD, SUGARCRM_API_URL');
    }
    
    try {
        const authEndpoint = `${apiUrl}/oauth2/token`;
        
        const authBody = {
            grant_type: 'password',
            client_id: 'sugar',
            username: username,
            password: password,
            platform: 'base'
        };
        
        const response = await fetch(authEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(authBody)
        });
        
        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }
        
        const authData = await response.json();
        
        if (!authData.access_token) {
            throw new Error('No access token received from SugarCRM');
        }
        
        return authData.access_token;
        
    } catch (error) {
        throw new Error(`SugarCRM authentication failed: ${error.message}`);
    }
}

/**
 * Generic POST method for SugarCRM API interactions
 * @param {Object} config - Configuration object
 * @param {string} config.module - SugarCRM module name (e.g., 'Accounts', 'Contacts', 'Leads')
 * @param {Array} config.filters - Array of filter objects
 * @param {Array} config.fields - Array of field names to retrieve
 * @param {number} config.maxResults - Maximum number of results (default: 20)
 * @param {number} config.offset - Offset for pagination (default: 0)
 * @param {string} config.orderBy - Field to order by (default: 'date_modified')
 * @param {string} config.orderDirection - Order direction 'asc' or 'desc' (default: 'desc')
 * @returns {Promise<Object>} API response data
 */
export async function sugarCRMPost(config) {
    const {
        module,
        filters = [],
        fields = ['id', 'name', 'date_modified'],
        maxResults = 20,
        offset = 0,
        orderBy = 'date_modified',
        orderDirection = 'desc'
    } = config;

    // Validate required parameters
    if (!module) {
        throw new Error('Module name is required');
    }

    // Construct the API request body for SugarCRM v11_20
    const requestBody = {
        fields: Array.isArray(fields) ? fields : fields.split(','),
        max_num: maxResults,
        offset: offset,
        order_by: orderBy,
        order_direction: orderDirection
    };
    
    // Add filters if provided
    if (filters && filters.length > 0) {
        requestBody.filter = filters;
    }

    // Make real API call to SugarCRM
    try {
        const apiUrl = process.env.SUGARCRM_API_URL;
        if (!apiUrl) {
            throw new Error('SUGARCRM_API_URL environment variable is required');
        }
        
        const apiEndpoint = `${apiUrl}/${module}/filter`;
        
        // Get OAuth token
        const oauthToken = await authenticateSugarCRM();
        
        const headers = {
            'Content-Type': 'application/json',
            'OAuth-Token': oauthToken
        };
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`SugarCRM API call failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            module: module,
            request: requestBody,
            timestamp: new Date().toISOString(),
            data: data
        };
        
    } catch (error) {
        throw new Error(`SugarCRM API call failed for module '${module}': ${error.message}`);
    }
}


/**
 * Create a date filter for SugarCRM API
 * @param {string} field - Field name to filter on (default: 'date_modified')
 * @param {string} operator - Comparison operator (default: '$gte')
 * @param {string} value - Date value in ISO format
 * @returns {Object} Filter object
 */
export function createDateFilter(field = 'date_modified', operator = '$gte', value) {
    if (!value) {
        throw new Error('Date value is required for date filter');
    }
    
    return {
        [field]: {
            [operator]: value
        }
    };
}

/**
 * Create a text filter for SugarCRM API
 * @param {string} field - Field name to filter on
 * @param {string} operator - Comparison operator ('$eq', '$ne', '$contains', '$starts_with', '$ends_with')
 * @param {string} value - Text value to filter by
 * @returns {Object} Filter object
 */
export function createTextFilter(field, operator = '$eq', value) {
    if (!field || !value) {
        throw new Error('Field and value are required for text filter');
    }
    
    return {
        [field]: {
            [operator]: value
        }
    };
}


/**
 * Fetch records from SugarCRM with pagination support
 * @param {Object} config - Configuration object (same as sugarCRMPost)
 * @param {Function} onPage - Callback function called for each page of results
 * @returns {Promise<Object>} Summary of all fetched records
 */
export async function fetchAllRecords(config, onPage = null) {
    let allRecords = [];
    let offset = 0;
    let hasMore = true;
    let totalFetched = 0;
    
    const pageConfig = { ...config };
    
    while (hasMore) {
        pageConfig.offset = offset;
        
        try {
            const response = await sugarCRMPost(pageConfig);
            const records = response.data.records;
            
            allRecords = allRecords.concat(records);
            totalFetched += records.length;
            hasMore = response.data.has_more;
            offset = response.data.next_offset;
            
            // Call the page callback if provided
            if (onPage && typeof onPage === 'function') {
                await onPage(records, response);
            }
            
            // Prevent infinite loops
            if (totalFetched > 10000) {
                console.warn('⚠️  Fetched more than 10,000 records, stopping pagination');
                break;
            }
            
        } catch (error) {
            console.error(`❌ Error fetching page at offset ${offset}:`, error.message);
            throw error;
        }
    }
    
    return {
        records: allRecords,
        total_fetched: totalFetched,
        module: config.module,
        timestamp: new Date().toISOString()
    };
}


/**
 * Get default fields for a SugarCRM module
 * @param {string} module - Module name
 * @returns {Array} Array of default field names
 */
export function getDefaultFields(module) {
    const defaultFields = {
        'Accounts': ['id', 'name', 'tm_id_c', 'status_c', 'membership_category_c', 'gstno_c', 'date_modified']
    };  

    return defaultFields[module] || ['id', 'name', 'date_modified'];
}

/**
 * Fetch relationship data for a SugarCRM record
 * @param {string} module - Module name (e.g., 'Accounts', 'Contacts')
 * @param {string} recordId - Record ID
 * @param {string} linkName - Link/relationship name (e.g., 'accounts_comp_compliance_officers_1')
 * @param {Object} options - Additional options
 * @param {Array} options.fields - Fields to fetch (default: ['id', 'name', 'date_modified'])
 * @param {Array} options.filters - Filters to apply (MongoDB style)
 * @param {number} options.maxResults - Maximum number of results (default: 20)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @param {string} options.orderBy - Field to order by (default: 'date_modified')
 * @param {string} options.orderDirection - Order direction: 'asc' or 'desc' (default: 'desc')
 * @returns {Promise<Object>} Relationship data response
 */
export async function fetchRelationshipData(module, recordId, linkName, options = {}) {
    try {
        // Validate required parameters
        if (!module || !recordId || !linkName) {
            throw new Error('Module, recordId, and linkName are required parameters');
        }

        // Get authentication token
        const token = await authenticateSugarCRM();
        
        // Set default options
        const {
            fields = ['id', 'name', 'date_modified'],
            filters = [],
            maxResults = 20,
            offset = 0,
            orderBy = 'date_modified',
            orderDirection = 'desc'
        } = options;

        // Construct the URL
        const apiUrl = process.env.SUGARCRM_API_URL;
        if (!apiUrl) {
            throw new Error('SUGARCRM_API_URL environment variable is required');
        }

        const url = `${apiUrl}/${module}/${recordId}/link/${linkName}`;
        
        // Construct query parameters
        const queryParams = new URLSearchParams();
        
        // Add fields
        if (fields && fields.length > 0) {
            queryParams.append('fields', fields.join(','));
        }
        
        // Add filters (MongoDB style)
        if (filters && filters.length > 0) {
            filters.forEach((filter, index) => {
                for (const [field, condition] of Object.entries(filter)) {
                    if (typeof condition === 'object') {
                        // Handle MongoDB-style operators like { $gte: 'value' }
                        for (const [operator, value] of Object.entries(condition)) {
                            queryParams.append(`filter[${index}][${field}][${operator}]`, value);
                        }
                    } else {
                        // Handle simple equality
                        queryParams.append(`filter[${index}][${field}]`, condition);
                    }
                }
            });
        }
        
        // Add pagination
        if (maxResults) {
            queryParams.append('max_num', maxResults.toString());
        }
        if (offset) {
            queryParams.append('offset', offset.toString());
        }
        
        // Add ordering
        if (orderBy) {
            queryParams.append('order_by', `${orderBy}:${orderDirection}`);
        }

        const fullUrl = `${url}?${queryParams.toString()}`;
        
        console.log(`🔗 Fetching relationship data: ${module}/${recordId}/link/${linkName}`);
        console.log(`📋 Fields: ${fields.join(', ')}`);
        if (filters.length > 0) {
            console.log(`🔍 Filters: ${JSON.stringify(filters)}`);
        }
        console.log(`📄 URL: ${fullUrl}`);

        // Make the API request
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`SugarCRM API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        console.log(`✅ Fetched ${data.records ? data.records.length : 0} relationship records`);
        
        return {
            success: true,
            data: data,
            module: module,
            recordId: recordId,
            linkName: linkName,
            fields: fields,
            filters: filters,
            total_records: data.records ? data.records.length : 0,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error(`❌ Error fetching relationship data for ${module}/${recordId}/link/${linkName}:`, error.message);
        throw error;
    }
}

/**
 * Fetch all relationship records with pagination
 * @param {string} module - Module name
 * @param {string} recordId - Record ID
 * @param {string} linkName - Link/relationship name
 * @param {Object} options - Additional options
 * @param {Function} onPage - Callback function called for each page of results
 * @returns {Promise<Object>} All relationship records
 */
export async function fetchAllRelationshipRecords(module, recordId, linkName, options = {}, onPage = null) {
    const allRecords = [];
    let totalFetched = 0;
    let offset = 0;
    let hasMore = true;
    const maxResults = options.maxResults || 20;

    while (hasMore) {
        try {
            const config = {
                ...options,
                maxResults: maxResults,
                offset: offset
            };

            const response = await fetchRelationshipData(module, recordId, linkName, config);
            const records = response.data.records || [];
            
            allRecords.push(...records);
            totalFetched += records.length;
            hasMore = records.length === maxResults;
            offset += maxResults;
            
            // Call the page callback if provided
            if (onPage && typeof onPage === 'function') {
                await onPage(records, response);
            }
            
            // Prevent infinite loops
            if (totalFetched > 10000) {
                console.warn('⚠️  Fetched more than 10,000 relationship records, stopping pagination');
                break;
            }
            
        } catch (error) {
            console.error(`❌ Error fetching relationship page at offset ${offset}:`, error.message);
            throw error;
        }
    }
    
    return {
        records: allRecords,
        total_fetched: totalFetched,
        module: module,
        recordId: recordId,
        linkName: linkName,
        timestamp: new Date().toISOString()
    };
}
