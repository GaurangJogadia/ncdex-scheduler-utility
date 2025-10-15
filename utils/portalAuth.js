/**
 * Portal Authentication Utility
 * Handles portal authentication and token management
 */

import Logger from './logger.js';
import { getSecretEnv } from './secrets.js';

let cachedToken = null;
let tokenExpiry = null;

/**
 * Get portal bearer token
 * @param {string} baseUrl - Portal base URL
 * @returns {Promise<string>} Bearer token
 */
export async function getPortalToken(baseUrl = null) {
    const portalBaseUrl = baseUrl || process.env.PORTAL_BASE_URL || 'http://localhost:3001';
    const loginUrl = `${portalBaseUrl}/api/auth/admin/login`;
    
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        console.log('  🔑 Using cached portal token');
        return cachedToken;
    }
    
    try {
        console.log('  🔑 Requesting new portal token...');
        
        const loginData = {
            username: process.env.PORTAL_USERNAME || 'admin',
            password: getSecretEnv('PORTAL_PASSWORD') || 'admin123'
        };
        
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        if (!response.ok) {
            throw new Error(`Portal login failed: ${response.status} ${response.statusText}`);
        }
        
        const authData = await response.json();
        
        if (!authData.token) {
            throw new Error('No token received from portal login');
        }
        
        // Cache the token (assuming 1 hour expiry, adjust as needed)
        cachedToken = authData.token;
        tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        console.log('  ✅ Portal token obtained successfully');
        
        // Log successful authentication
        await Logger.info('Portal authentication successful', {
            portalUrl: portalBaseUrl,
            tokenLength: authData.token.length
        });
        
        return authData.token;
        
    } catch (error) {
        console.log(`  ❌ Portal authentication failed: ${error.message}`);
        
        // Log authentication failure
        await Logger.error('Portal authentication failed', {
            portalUrl: portalBaseUrl,
            error: error.message
        });
        
        throw error;
    }
}

/**
 * Clear cached token (useful for testing or when token is invalid)
 */
export function clearPortalToken() {
    cachedToken = null;
    tokenExpiry = null;
    console.log('  🔄 Portal token cache cleared');
}

/**
 * Check if we have a valid cached token
 * @returns {boolean} True if token is cached and not expired
 */
export function hasValidToken() {
    return cachedToken && tokenExpiry && new Date() < tokenExpiry;
}
