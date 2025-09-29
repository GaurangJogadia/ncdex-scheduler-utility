#!/usr/bin/env node

import { config } from 'dotenv';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main entry point for the NCDEX Scheduler Utility
 * Accepts command line arguments to execute specific tasks
 */
async function main() {
    const args = process.argv.slice(2);
    const taskName = args[0];

    // If no task name provided, show help
    if (!taskName) {
        await showHelp();
        return;
    }

    try {
        await executeTask(taskName);
    } catch (error) {
        console.error(`❌ Error executing task '${taskName}':`, error.message);
        process.exit(1);
    }
}

/**
 * Shows available tasks and usage information
 */
async function showHelp() {
    console.log('🚀 NCDEX Scheduler Utility');
    console.log('==========================\n');
    
    try {
        const tasksDir = join(__dirname, 'tasks');
        const files = await readdir(tasksDir);
        const taskFiles = files.filter(file => file.endsWith('.js'));
        
        if (taskFiles.length === 0) {
            console.log('No tasks found in the /tasks directory.');
            return;
        }

        console.log('Available tasks:');
        taskFiles.forEach(file => {
            const taskName = file.replace('.js', '');
            console.log(`  • ${taskName}`);
        });

        console.log('\nUsage:');
        console.log('  node index.js <taskName>');
        console.log('  npm start <taskName>');
        console.log('  npm run dev <taskName>');
        
        console.log('\nExamples:');
        console.log('  node index.js fetchData');
        console.log('  node index.js cleanTempFiles');
        
    } catch (error) {
        console.error('Error reading tasks directory:', error.message);
    }
}

/**
 * Executes a specific task by name
 * @param {string} taskName - The name of the task to execute
 */
async function executeTask(taskName) {
    const startTime = new Date();
    console.log(`🔄 Starting task: ${taskName}`);
    console.log(`⏰ Start time: ${startTime.toISOString()}`);
    console.log('─'.repeat(50));

    try {
        // Dynamically import the task module
        const taskModule = await import(`./tasks/${taskName}.js`);
        
        // Check if the module has a default export (the task function)
        if (typeof taskModule.default !== 'function') {
            throw new Error(`Task '${taskName}' does not export a default function`);
        }

        // Execute the task
        await taskModule.default();
        
        const endTime = new Date();
        const duration = endTime - startTime;
        
        console.log('─'.repeat(50));
        console.log(`✅ Task '${taskName}' completed successfully`);
        console.log(`⏰ End time: ${endTime.toISOString()}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        
    } catch (error) {
        const endTime = new Date();
        const duration = endTime - startTime;
        
        console.log('─'.repeat(50));
        console.log(`❌ Task '${taskName}' failed`);
        console.log(`⏰ End time: ${endTime.toISOString()}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`💥 Error: ${error.message}`);
        
        throw error;
    }
}

// Run the main function
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
