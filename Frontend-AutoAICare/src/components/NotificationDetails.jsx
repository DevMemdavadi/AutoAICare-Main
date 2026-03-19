import PropTypes from 'prop-types';

/**
 * Component to display notification extra_data in a user-friendly format
 * instead of raw JSON
 */
const NotificationDetails = ({ extraData }) => {
    if (!extraData || Object.keys(extraData).length === 0) {
        return null;
    }

    // Define field labels for better readability
    const fieldLabels = {
        customer_name: 'Customer',
        job_id: 'Job Card',
        booking_id: 'Booking',
        appointment_id: 'Appointment ID',
        appointment_status: 'Status',
        vehicle: 'Vehicle',
        technician_name: 'Technician',
        payment_id: 'Payment ID',
        amount: 'Amount',
        payment_method: 'Payment Method',
        invoice_number: 'Invoice Number',
        total_amount: 'Total Amount',
        due_date: 'Due Date',
        booking_datetime: 'Booking Date',
        estimated_delivery: 'Estimated Delivery',
        start_time_display: 'Start Time',
        completion_time: 'Completion Time',
        update_time: 'Update Time',
        review_url: 'Review URL',
        customer_phone: 'Customer Phone',
        service_name: 'Service',
        vehicle_type: 'Vehicle Type',
        preferred_datetime: 'Preferred Date/Time',
        estimated_price: 'Estimated Price',
    };

    // Fields to exclude from display (internal/redundant data)
    const excludeFields = ['start_time', 'completion_timestamp'];

    // Format field values
    const formatValue = (key, value) => {
        if (value === null || value === undefined || value === 'N/A') {
            return 'N/A';
        }

        // Format status fields with capitalization
        if (key.includes('status') && typeof value === 'string') {
            return value.charAt(0).toUpperCase() + value.slice(1);
        }

        // Format amount/price fields
        if ((key.includes('amount') || key.includes('price')) && (typeof value === 'number' || !isNaN(value))) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return `₹${numValue.toLocaleString()}`;
        }

        // Format datetime fields
        if (key.includes('datetime') && typeof value === 'string') {
            try {
                const date = new Date(value);
                return date.toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                return value;
            }
        }

        // Format URLs as links
        if (key.includes('url') && typeof value === 'string') {
            return (
                <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                >
                    View Link
                </a>
            );
        }

        return value;
    };

    return (
        <div className="mt-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100/80 shadow-inner">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(extraData)
                    .filter(([key]) => !excludeFields.includes(key))
                    .map(([key, value]) => (
                        <div key={key} className="flex flex-col min-w-0">
                            <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                                {fieldLabels[key] || key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-bold text-gray-700 mt-0.5 truncate md:whitespace-normal">
                                {formatValue(key, value)}
                            </span>
                        </div>
                    ))}
            </div>
        </div>
    );
};

NotificationDetails.propTypes = {
    extraData: PropTypes.object,
};

export default NotificationDetails;
