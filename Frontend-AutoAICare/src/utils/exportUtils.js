/**
 * Export Utility for Analytics Data
 * Supports CSV and Excel export formats
 */

export const exportToCSV = (data, filename = 'export.csv') => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    let csvContent = headers.join(',') + '\n';

    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Handle values with commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportLeadsToCSV = (leads) => {
    const exportData = leads.map(lead => ({
        'Name': lead.name,
        'Phone': lead.phone,
        'Email': lead.email || '',
        'Company': lead.company || '',
        'Source': lead.source_name || '',
        'Status': lead.status,
        'Priority': lead.priority,
        'Score': lead.score || 0,
        'Created': new Date(lead.created_at).toLocaleDateString(),
        'Last Contact': lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : 'Never'
    }));

    exportToCSV(exportData, `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportCustomersToCSV = (customers) => {
    const exportData = customers.map(customer => ({
        'Name': customer.name,
        'Phone': customer.phone,
        'Email': customer.email || '',
        'Address': customer.address || '',
        'Lifetime Value': customer.lifetime_value || 0,
        'Reward Points': customer.reward_points || 0,
        'Total Bookings': customer.total_bookings || 0,
        'Membership': customer.membership_type || 'None',
        'Created': new Date(customer.created_at).toLocaleDateString()
    }));

    exportToCSV(exportData, `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportAnalyticsToCSV = (analyticsData, type = 'general') => {
    let exportData = [];
    let filename = `analytics_${type}_${new Date().toISOString().split('T')[0]}.csv`;

    switch (type) {
        case 'revenue':
            exportData = analyticsData.map(item => ({
                'Month': item.month,
                'Revenue': item.revenue,
                'Bookings': item.bookings,
                'Avg Value': Math.round(item.revenue / item.bookings)
            }));
            break;

        case 'services':
            exportData = analyticsData.map(item => ({
                'Service': item.name,
                'Bookings': item.bookings,
                'Revenue': item.revenue,
                'Rating': item.rating,
                'Avg Value': Math.round(item.revenue / item.bookings)
            }));
            break;

        case 'customers':
            exportData = analyticsData.map(item => ({
                'Month': item.month,
                'New Customers': item.customers,
                'Revenue': item.revenue,
                'Avg per Customer': Math.round(item.revenue / item.customers)
            }));
            break;

        default:
            exportData = analyticsData;
    }

    exportToCSV(exportData, filename);
};

export const exportToPDF = async (elementId, filename = 'export.pdf') => {
    // This would require html2pdf or jsPDF library
    // For now, we'll show an alert
    alert('PDF export feature coming soon! Please use CSV export for now.');
};

export const prepareChartDataForExport = (chartData, chartType) => {
    // Convert chart data to exportable format
    switch (chartType) {
        case 'pie':
            return chartData.map(item => ({
                'Category': item.name,
                'Value': item.value,
                'Percentage': `${((item.value / chartData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(2)}%`
            }));

        case 'bar':
        case 'line':
            return chartData;

        default:
            return chartData;
    }
};

export const exportMultipleSheets = (dataSheets, filename = 'export') => {
    // For multiple sheets, we'll create separate CSV files
    dataSheets.forEach(sheet => {
        exportToCSV(sheet.data, `${filename}_${sheet.name}_${new Date().toISOString().split('T')[0]}.csv`);
    });
};

// Email export functionality
export const emailReport = async (reportData, recipientEmail) => {
    try {
        // This would integrate with your backend email service
        const response = await fetch('/api/reports/email/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                recipient: recipientEmail,
                report_data: reportData,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            alert('Report sent successfully!');
        } else {
            alert('Failed to send report');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        alert('Error sending report');
    }
};

export default {
    exportToCSV,
    exportLeadsToCSV,
    exportCustomersToCSV,
    exportAnalyticsToCSV,
    exportToPDF,
    prepareChartDataForExport,
    exportMultipleSheets,
    emailReport
};
