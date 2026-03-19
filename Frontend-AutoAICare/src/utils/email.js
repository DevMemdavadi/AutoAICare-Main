/**
 * Email utility functions
 */

/**
 * Check if an email is a placeholder (generated for walk-in customers)
 * @param {string} email - The email to check
 * @returns {boolean} - True if the email is a placeholder
 */
export const isPlaceholderEmail = (email) => {
    if (!email) return true;
    return email.endsWith('@walkin.local');
};

/**
 * Get display-friendly email (returns 'Not provided' for placeholder emails)
 * @param {string} email - The email to display
 * @returns {string} - Display-friendly email string
 */
export const getDisplayEmail = (email) => {
    if (isPlaceholderEmail(email)) {
        return 'Not provided';
    }
    return email;
};

/**
 * Generate a placeholder email for walk-in customers
 * @param {string} phone - Customer phone number
 * @returns {string} - Placeholder email
 */
export const generatePlaceholderEmail = (phone) => {
    return `${phone}@walkin.local`;
};
