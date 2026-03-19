// Helper function to calculate trend percentage
export const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10; // Round to 1 decimal place
};

// Helper function to format trend display
export const formatTrend = (trend) => {
    if (trend === null || trend === undefined) return null;
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend}%`;
};

// Helper function to get period dates for comparison
export const getPeriodDates = (period) => {
    const today = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    switch (period) {
        case 'daily':
            currentStart = new Date(today);
            currentStart.setHours(0, 0, 0, 0);
            currentEnd = new Date(today);
            currentEnd.setHours(23, 59, 59, 999);

            previousStart = new Date(currentStart);
            previousStart.setDate(previousStart.getDate() - 1);
            previousEnd = new Date(currentEnd);
            previousEnd.setDate(previousEnd.getDate() - 1);
            break;

        case 'weekly':
            // Current week (Monday to Sunday)
            const dayOfWeek = today.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
            currentStart = new Date(today);
            currentStart.setDate(today.getDate() + diff);
            currentStart.setHours(0, 0, 0, 0);
            currentEnd = new Date(currentStart);
            currentEnd.setDate(currentStart.getDate() + 6);
            currentEnd.setHours(23, 59, 59, 999);

            // Previous week
            previousStart = new Date(currentStart);
            previousStart.setDate(previousStart.getDate() - 7);
            previousEnd = new Date(currentEnd);
            previousEnd.setDate(previousEnd.getDate() - 7);
            break;

        case 'monthly':
            // Current month
            currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
            currentEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

            // Previous month
            previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            previousEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
            break;

        case 'quarterly':
            // Current quarter
            const currentQuarter = Math.floor(today.getMonth() / 3);
            currentStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
            currentEnd = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);

            // Previous quarter
            const prevQuarter = currentQuarter - 1;
            if (prevQuarter < 0) {
                previousStart = new Date(today.getFullYear() - 1, 9, 1);
                previousEnd = new Date(today.getFullYear(), 0, 0, 23, 59, 59, 999);
            } else {
                previousStart = new Date(today.getFullYear(), prevQuarter * 3, 1);
                previousEnd = new Date(today.getFullYear(), (prevQuarter + 1) * 3, 0, 23, 59, 59, 999);
            }
            break;

        case 'yearly':
            // Current year
            currentStart = new Date(today.getFullYear(), 0, 1);
            currentEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

            // Previous year
            previousStart = new Date(today.getFullYear() - 1, 0, 1);
            previousEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            break;

        default:
            return null;
    }

    return {
        current: {
            start: currentStart.toISOString().split('T')[0],
            end: currentEnd.toISOString().split('T')[0],
        },
        previous: {
            start: previousStart.toISOString().split('T')[0],
            end: previousEnd.toISOString().split('T')[0],
        },
    };
};

// Helper function to get period label
export const getPeriodLabel = (period) => {
    const labels = {
        daily: 'yesterday',
        weekly: 'last week',
        monthly: 'last month',
        quarterly: 'last quarter',
        yearly: 'last year',
    };
    return labels[period] || 'previous period';
};
