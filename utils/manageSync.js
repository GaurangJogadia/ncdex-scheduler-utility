/**
 * Manage Sync Records Task
 * Provides utilities to view and manage integration sync records
 */

import { 
    getAllSyncRecords, 
    getSyncRecord, 
    getSyncStatistics, 
    updateSyncRecord,
    createSyncRecord,
    deleteSyncRecord,
    resetAllSyncRecords,
    getSyncRecordsByStatus,
    getSyncRecordsByDirection
} from '../utils/syncTracker.js';

/**
 * Display all sync records in a formatted table
 */
function displaySyncRecords(records) {
    if (records.length === 0) {
        console.log('  No sync records found.');
        return;
    }

    console.log('  ┌─────────────────┬─────────────────────┬───────────┬─────────────────────┬─────────────────────┬─────────┐');
    console.log('  │ Module Name     │ Integration Name    │ Direction │ Last Sync At        │ Updated At          │ Status  │');
    console.log('  ├─────────────────┼─────────────────────┼───────────┼─────────────────────┼─────────────────────┼─────────┤');

    records.forEach(record => {
        const moduleName = (record.module_name || '').padEnd(15).substring(0, 15);
        const integrationName = (record.integration_name || '').padEnd(19).substring(0, 19);
        const direction = (record.direction || '').padEnd(9).substring(0, 9);
        const lastSync = record.last_sync_at ? 
            new Date(record.last_sync_at).toLocaleString().padEnd(19).substring(0, 19) : 
            'Never'.padEnd(19);
        const updatedAt = record.updated_at ? 
            new Date(record.updated_at).toLocaleString().padEnd(19).substring(0, 19) : 
            'Never'.padEnd(19);
        const status = (record.status || 'unknown').padEnd(7).substring(0, 7);

        console.log(`  │ ${moduleName} │ ${integrationName} │ ${direction} │ ${lastSync} │ ${updatedAt} │ ${status} │`);
    });

    console.log('  └─────────────────┴─────────────────────┴───────────┴─────────────────────┴─────────────────────┴─────────┘');
}

/**
 * Main task function for managing sync records
 */
export default async function manageSync() {
    const args = process.argv.slice(3); // Get arguments after 'manageSync'
    const command = args[0];

    console.log('🔧 Sync Records Management');
    console.log('==========================\n');

    try {
        switch (command) {
            case 'list':
            case undefined:
                await handleListCommand(args);
                break;
            case 'stats':
                await handleStatsCommand();
                break;
            case 'show':
                await handleShowCommand(args);
                break;
            case 'reset':
                await handleResetCommand(args);
                break;
            case 'create':
                await handleCreateCommand(args);
                break;
            case 'delete':
                await handleDeleteCommand(args);
                break;
            case 'help':
                showHelp();
                break;
            default:
                console.log(`❌ Unknown command: ${command}`);
                showHelp();
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

/**
 * Handle list command
 */
async function handleListCommand(args) {
    const filter = args[1];
    
    let records;
    if (filter === 'success' || filter === 'failed' || filter === 'pending') {
        records = await getSyncRecordsByStatus(filter);
        console.log(`📋 Sync Records (Status: ${filter}):`);
    } else if (filter === 'inbound' || filter === 'outbound') {
        records = await getSyncRecordsByDirection(filter);
        console.log(`📋 Sync Records (Direction: ${filter}):`);
    } else {
        records = await getAllSyncRecords();
        console.log('📋 All Sync Records:');
    }
    
    console.log('');
    displaySyncRecords(records);
    console.log(`\nTotal records: ${records.length}`);
}

/**
 * Handle stats command
 */
async function handleStatsCommand() {
    console.log('📊 Sync Statistics:');
    console.log('');
    
    const stats = await getSyncStatistics();
    
    console.log(`  • Total Records: ${stats.total_records}`);
    console.log(`  • By Status:`);
    console.log(`    - Success: ${stats.by_status.success}`);
    console.log(`    - Failed: ${stats.by_status.failed}`);
    console.log(`    - Pending: ${stats.by_status.pending}`);
    console.log(`  • By Direction:`);
    console.log(`    - Inbound: ${stats.by_direction.inbound}`);
    console.log(`    - Outbound: ${stats.by_direction.outbound}`);
    
    if (stats.last_updated) {
        console.log(`  • Last Updated: ${new Date(stats.last_updated).toLocaleString()}`);
    }
}

/**
 * Handle show command
 */
async function handleShowCommand(args) {
    const identifier = args[1];
    
    if (!identifier) {
        console.log('❌ Please provide a module name or integration name');
        return;
    }
    
    const record = await getSyncRecord(identifier);
    
    if (!record) {
        console.log(`❌ No sync record found for: ${identifier}`);
        return;
    }
    
    console.log(`📄 Sync Record Details for: ${identifier}`);
    console.log('');
    console.log(`  Module Name: ${record.module_name}`);
    console.log(`  Integration Name: ${record.integration_name}`);
    console.log(`  Direction: ${record.direction}`);
    console.log(`  Endpoint: ${record.endpoint || 'N/A'}`);
    console.log(`  Status: ${record.status}`);
    console.log(`  Last Sync At: ${record.last_sync_at || 'Never'}`);
    console.log(`  Updated At: ${record.updated_at || 'Never'}`);
    
    if (record.metadata) {
        console.log(`  Metadata:`);
        Object.entries(record.metadata).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
        });
    }
}

/**
 * Handle reset command
 */
async function handleResetCommand(args) {
    const identifier = args[1];
    
    if (identifier) {
        // Reset specific record
        await updateSyncRecord(identifier, {
            status: 'pending',
            last_sync_at: null
        });
        console.log(`✅ Reset sync record for: ${identifier}`);
    } else {
        // Reset all records
        await resetAllSyncRecords();
        console.log('✅ Reset all sync records');
    }
}

/**
 * Handle create command
 */
async function handleCreateCommand(args) {
    const moduleName = args[1];
    const integrationName = args[2];
    const direction = args[3];
    const endpoint = args[4];
    
    if (!moduleName || !integrationName || !direction) {
        console.log('❌ Usage: manageSync create <module_name> <integration_name> <direction> [endpoint]');
        console.log('   Direction must be: inbound or outbound');
        return;
    }
    
    if (direction !== 'inbound' && direction !== 'outbound') {
        console.log('❌ Direction must be either "inbound" or "outbound"');
        return;
    }
    
    const record = await createSyncRecord({
        module_name: moduleName,
        integration_name: integrationName,
        direction: direction,
        endpoint: endpoint
    });
    
    console.log('✅ Created new sync record:');
    console.log(`  Module: ${record.module_name}`);
    console.log(`  Integration: ${record.integration_name}`);
    console.log(`  Direction: ${record.direction}`);
    console.log(`  Endpoint: ${record.endpoint || 'N/A'}`);
}

/**
 * Handle delete command
 */
async function handleDeleteCommand(args) {
    const identifier = args[1];
    
    if (!identifier) {
        console.log('❌ Please provide a module name or integration name to delete');
        return;
    }
    
    await deleteSyncRecord(identifier);
    console.log(`✅ Deleted sync record for: ${identifier}`);
}

/**
 * Show help information
 */
function showHelp() {
    console.log('📖 Available Commands:');
    console.log('');
    console.log('  list [filter]           - List all sync records (optional: success|failed|pending|inbound|outbound)');
    console.log('  stats                   - Show sync statistics');
    console.log('  show <identifier>       - Show details for a specific record');
    console.log('  reset [identifier]      - Reset sync record(s) to pending status');
    console.log('  create <module> <integration> <direction> [endpoint] - Create new sync record');
    console.log('  delete <identifier>     - Delete a sync record');
    console.log('  help                    - Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node index.js manageSync list');
    console.log('  node index.js manageSync list success');
    console.log('  node index.js manageSync show market_data');
    console.log('  node index.js manageSync reset');
    console.log('  node index.js manageSync create orders ncdex_orders_api inbound https://api.ncdex.com/orders');
    console.log('  node index.js manageSync delete old_integration');
}
