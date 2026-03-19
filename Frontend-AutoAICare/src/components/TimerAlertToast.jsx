/**
 * Timer Alert Toast Component
 * Displays real-time timer alerts (warnings, critical, overdue)
 */

import React from 'react';
import { useTimers } from '../contexts/TimerContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { X, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import './TimerAlertToast.css';

const TimerAlertToast = () => {
    const { timerAlerts, clearAlert } = useTimers();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Show only the most recent 3 alerts
    const visibleAlerts = timerAlerts.slice(-3);

    if (visibleAlerts.length === 0) return null;

    // Get the correct job route based on user role
    const getJobRoute = (jobId) => {
        if (!user) return `/admin/jobcards/${jobId}`;

        switch (user.role) {
            case 'super_admin':
            case 'branch_admin':
                return `/admin/jobcards/${jobId}`;
            case 'floor_manager':
                return `/floor-manager/job/${jobId}`;
            case 'supervisor':
                return `/supervisor/job/${jobId}`;
            case 'staff':
                return `/technician/job/${jobId}`;
            case 'applicator':
                return `/applicator/job/${jobId}`;
            default:
                return `/admin/jobcards/${jobId}`;
        }
    };

    const handleAlertClick = (alert) => {
        navigate(getJobRoute(alert.jobId));
        clearAlert(alert.id);
    };

    const getAlertIcon = (type) => {
        switch (type) {
            case 'overdue':
                return <AlertCircle className="alert-icon overdue" />;
            case 'critical':
                return <AlertTriangle className="alert-icon critical" />;
            default:
                return <Clock className="alert-icon warning" />;
        }
    };

    const getAlertClass = (type) => {
        switch (type) {
            case 'overdue':
                return 'timer-alert overdue';
            case 'critical':
                return 'timer-alert critical';
            default:
                return 'timer-alert warning';
        }
    };

    const getAlertTitle = (alert) => {
        if (alert.type === 'overdue') {
            return '❌ OVERDUE';
        } else if (alert.type === 'critical') {
            return `🔴 CRITICAL - ${alert.threshold || 1} MIN`;
        } else {
            return `⚠️ WARNING - ${alert.threshold || 5} MIN`;
        }
    };

    return (
        <div className="timer-alert-container">
            {visibleAlerts.map((alert) => (
                <div
                    key={alert.id}
                    className={getAlertClass(alert.type)}
                    onClick={() => handleAlertClick(alert)}
                >
                    {getAlertIcon(alert.type)}
                    <div className="alert-content">
                        <div className="alert-title">
                            {getAlertTitle(alert)}
                        </div>
                        <div className="alert-message">{alert.message}</div>
                        <div className="alert-meta">
                            {alert.vehicleInfo} • {alert.customerName}
                        </div>
                    </div>
                    <button
                        className="alert-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            clearAlert(alert.id);
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default TimerAlertToast;

