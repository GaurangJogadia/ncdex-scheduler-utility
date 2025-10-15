/**
 * Database Connection Utility
 * Handles PostgreSQL database connections and operations
 */

import pkg from 'pg';
import { getSecretEnv } from './secrets.js';
const { Pool } = pkg;

// Database configuration from environment variables
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'audit_portal',
    password: String(getSecretEnv('DB_PASSWORD') || ''),
    port: parseInt(process.env.DB_PORT) || 5432,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Debug database configuration (without password)
console.log('📊 Database Configuration:');
console.log(`  • Host: ${dbConfig.host}`);
console.log(`  • Port: ${dbConfig.port}`);
console.log(`  • Database: ${dbConfig.database}`);
console.log(`  • User: ${dbConfig.user}`);
console.log(`  • Password: ${dbConfig.password ? '[SET]' : '[NOT SET]'}`);
console.log(`  • Password Type: ${typeof dbConfig.password}`);

// Create connection pool
let pool = null;

/**
 * Get database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
    if (!pool) {
        try {
            pool = new Pool(dbConfig);
            
            // Handle pool errors
            pool.on('error', (err) => {
                console.error('Unexpected error on idle client', err);
            });
            
            console.log('📊 Database connection pool created');
        } catch (error) {
            console.error('❌ Failed to create database connection pool:', error.message);
            throw error;
        }
    }
    return pool;
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
    const pool = getPool();
    
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        client.release();
        
        console.log('✅ Database connection successful');
        console.log(`📅 Database time: ${result.rows[0].current_time}`);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

/**
 * Execute a query with parameters
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(query, params = []) {
    const pool = getPool();
    
    try {
        const result = await pool.query(query, params);
        return {
            success: true,
            rows: result.rows,
            rowCount: result.rowCount,
            command: result.command
        };
    } catch (error) {
        console.error('❌ Database query error:', error.message);
        return {
            success: false,
            error: error.message,
            rows: [],
            rowCount: 0
        };
    }
}

/**
 * Execute a query with a client (for transactions)
 * @param {Function} callback - Function that receives a client
 * @returns {Promise<Object>} Query result
 */
async function withClient(callback) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        const result = await callback(client);
        return {
            success: true,
            result: result
        };
    } catch (error) {
        console.error('❌ Database client operation error:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        client.release();
    }
}

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
async function closePool() {
    if (pool) {
        try {
            await pool.end();
            pool = null;
            console.log('📊 Database connection pool closed');
        } catch (error) {
            console.error('❌ Error closing database pool:', error.message);
        }
    }
}

/**
 * Get database configuration (without password)
 * @returns {Object} Database configuration
 */
function getConfig() {
    return {
        user: dbConfig.user,
        host: dbConfig.host,
        database: dbConfig.database,
        port: dbConfig.port,
        maxConnections: dbConfig.max,
        idleTimeout: dbConfig.idleTimeoutMillis,
        connectionTimeout: dbConfig.connectionTimeoutMillis
    };
}

export {
    getPool,
    testConnection,
    query,
    withClient,
    closePool,
    getConfig
};
