/**
 * Logger Utility
 * Provides configurable logging functionality with date-wise log files
 */

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const LOG_ENABLED = process.env.LOG_ENABLED === 'true' || process.env.LOG_ENABLED === 'yes';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
const LOG_DIR = join(__dirname, '..', 'logs');

// Log levels hierarchy
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

/**
 * Get current date string for log file naming
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getCurrentDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get current timestamp for log entries
 * @returns {string} Timestamp string
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Get log file path for a specific date
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {string} Log file path
 */
function getLogFilePath(date = getCurrentDateString()) {
    return join(LOG_DIR, `ncdex-scheduler-${date}.log`);
}

/**
 * Ensure log directory exists
 * @returns {Promise<void>}
 */
async function ensureLogDirectory() {
    try {
        await mkdir(LOG_DIR, { recursive: true });
    } catch (error) {
        // Directory might already exist, ignore error
    }
}

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, meta = {}) {
    const timestamp = getCurrentTimestamp();
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}\n`;
}

/**
 * Write log message to file
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {Promise<void>}
 */
async function writeToLogFile(level, message, meta = {}) {
    if (!LOG_ENABLED) {
        return;
    }

    try {
        await ensureLogDirectory();
        const logFilePath = getLogFilePath();
        const formattedMessage = formatLogMessage(level, message, meta);
        await appendFile(logFilePath, formattedMessage, 'utf8');
    } catch (error) {
        // Fallback to console if file writing fails
        console.error(`Failed to write to log file: ${error.message}`);
        console.log(formatLogMessage(level, message, meta).trim());
    }
}

/**
 * Check if log level should be logged
 * @param {string} level - Log level to check
 * @returns {boolean} Whether the level should be logged
 */
function shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

/**
 * Logger class with different log levels
 */
class Logger {
    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    static async debug(message, meta = {}) {
        if (shouldLog('debug')) {
            console.log(`🔍 [DEBUG] ${message}`, meta);
            await writeToLogFile('debug', message, meta);
        }
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    static async info(message, meta = {}) {
        if (shouldLog('info')) {
            console.log(`ℹ️  [INFO] ${message}`, meta);
            await writeToLogFile('info', message, meta);
        }
    }

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    static async warn(message, meta = {}) {
        if (shouldLog('warn')) {
            console.warn(`⚠️  [WARN] ${message}`, meta);
            await writeToLogFile('warn', message, meta);
        }
    }

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    static async error(message, meta = {}) {
        if (shouldLog('error')) {
            console.error(`❌ [ERROR] ${message}`, meta);
            await writeToLogFile('error', message, meta);
        }
    }

    /**
     * Log task start
     * @param {string} taskName - Task name
     * @param {Object} meta - Additional metadata
     */
    static async taskStart(taskName, meta = {}) {
        const message = `Starting task: ${taskName}`;
        console.log(`🔄 ${message}`);
        await writeToLogFile('info', message, { taskName, ...meta });
    }

    /**
     * Log task completion
     * @param {string} taskName - Task name
     * @param {Object} meta - Additional metadata
     */
    static async taskComplete(taskName, meta = {}) {
        const message = `Task completed: ${taskName}`;
        console.log(`✅ ${message}`);
        await writeToLogFile('info', message, { taskName, ...meta });
    }

    /**
     * Log task failure
     * @param {string} taskName - Task name
     * @param {string} error - Error message
     * @param {Object} meta - Additional metadata
     */
    static async taskFailed(taskName, error, meta = {}) {
        const message = `Task failed: ${taskName} - ${error}`;
        console.error(`❌ ${message}`);
        await writeToLogFile('error', message, { taskName, error, ...meta });
    }

    /**
     * Log API call
     * @param {string} method - HTTP method
     * @param {string} url - API URL
     * @param {Object} meta - Additional metadata
     */
    static async apiCall(method, url, meta = {}) {
        const message = `API Call: ${method} ${url}`;
        await writeToLogFile('debug', message, { method, url, ...meta });
    }

    /**
     * Log data processing
     * @param {string} operation - Operation description
     * @param {Object} data - Data being processed
     * @param {Object} meta - Additional metadata
     */
    static async dataProcessing(operation, data, meta = {}) {
        const message = `Data Processing: ${operation}`;
        await writeToLogFile('info', message, { operation, data, ...meta });
    }

    /**
     * Get logging configuration
     * @returns {Object} Logging configuration
     */
    static getConfig() {
        return {
            enabled: LOG_ENABLED,
            level: LOG_LEVEL,
            directory: LOG_DIR,
            currentLogFile: getLogFilePath()
        };
    }
}

export default Logger;
