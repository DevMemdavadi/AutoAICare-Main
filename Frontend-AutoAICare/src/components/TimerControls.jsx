import { useState, useEffect } from 'react';
import { Pause, Play, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';

/**
 * TimerControls Component - Provides pause/resume controls and buffer display
 * 
 * @param {object} jobCard - The job card object with timer information
 * @param {function} onUpdate - Callback when timer state changes
 * @param {boolean} disabled - Whether controls are disabled
 */
const TimerControls = ({ jobCard, onUpdate, disabled = false }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pauseElapsed, setPauseElapsed] = useState('');
    const [liveCurrentPauseSec, setLiveCurrentPauseSec] = useState(0);

    // Live pause counter — updates pause elapsed, buffer, and total pause every second
    useEffect(() => {
        if (!jobCard?.is_timer_paused || !jobCard?.pause_started_at) {
            setPauseElapsed('');
            setLiveCurrentPauseSec(0);
            return;
        }

        const calcElapsed = () => {
            const start = new Date(jobCard.pause_started_at);
            const now = new Date();
            const currentSec = Math.max(0, Math.floor((now - start) / 1000));
            setLiveCurrentPauseSec(currentSec);

            // Total = accumulated from previous sessions + current session
            const totalSec = currentSec + (jobCard.total_pause_duration_seconds || 0);
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            if (h > 0) {
                setPauseElapsed(`${h}h ${m}m ${s}s`);
            } else if (m > 0) {
                setPauseElapsed(`${m}m ${s}s`);
            } else {
                setPauseElapsed(`${s}s`);
            }
        };

        calcElapsed();
        const interval = setInterval(calcElapsed, 1000);
        return () => clearInterval(interval);
    }, [jobCard?.is_timer_paused, jobCard?.pause_started_at, jobCard?.total_pause_duration_seconds]);

    // Don't show controls if job hasn't started
    if (!jobCard?.job_started_at) {
        return null;
    }

    const isPaused = jobCard.is_timer_paused;
    const totalBuffer = jobCard.buffer_minutes_allocated || 0;

    // Calculate live values: during a pause, add current pause session to server values
    const liveTotalPauseSec = (jobCard.total_pause_duration_seconds || 0) + (isPaused ? liveCurrentPauseSec : 0);
    const liveTotalPauseMin = Math.floor(liveTotalPauseSec / 60);
    const remainingBuffer = Math.max(0, totalBuffer - liveTotalPauseMin);
    const bufferUsedPercentage = totalBuffer > 0 ? ((totalBuffer - remainingBuffer) / totalBuffer) * 100 : 0;

    // Disable pause when job is ready for billing or later stages
    const isReadyForBillingOrLater = ['ready_for_billing', 'billed', 'ready_for_delivery', 'delivered', 'closed'].includes(jobCard.status);

    const handlePauseTimer = async (reason = 'manual') => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.post(`/jobcards/${jobCard.id}/pause_timer/`, { reason });

            // Show success message
            if (onUpdate) {
                onUpdate(response.data);
            }
        } catch (err) {
            console.error('Error pausing timer:', err);
            setError(err.response?.data?.error || 'Failed to pause timer');
        } finally {
            setLoading(false);
        }
    };

    const handleResumeTimer = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.post(`/jobcards/${jobCard.id}/resume_timer/`);

            // Show success message
            if (onUpdate) {
                onUpdate(response.data);
            }
        } catch (err) {
            console.error('Error resuming timer:', err);
            setError(err.response?.data?.error || 'Failed to resume timer');
        } finally {
            setLoading(false);
        }
    };

    const getBufferStatusColor = () => {
        if (remainingBuffer <= 0) return 'text-red-600 bg-red-50 border-red-200';
        if (bufferUsedPercentage >= 70) return 'text-orange-600 bg-orange-50 border-orange-200';
        if (bufferUsedPercentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-green-600 bg-green-50 border-green-200';
    };

    const getBufferIcon = () => {
        if (remainingBuffer <= 0) return AlertCircle;
        if (bufferUsedPercentage >= 70) return AlertCircle;
        return CheckCircle2;
    };

    const BufferIcon = getBufferIcon();

    return (
        <div className="space-y-3">
            {/* Pause/Resume Controls */}
            <div className="flex items-center gap-2">
                {isPaused ? (
                    <button
                        onClick={handleResumeTimer}
                        disabled={disabled || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Play size={16} />
                        <span className="font-medium">Resume Timer</span>
                    </button>
                ) : (
                    <button
                        onClick={() => handlePauseTimer('manual')}
                        disabled={disabled || loading || remainingBuffer <= 0 || isReadyForBillingOrLater}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Pause size={16} />
                        <span className="font-medium">Pause Timer</span>
                    </button>
                )}

                {/* Pause Status Indicator */}
                {isPaused && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Clock size={16} className="text-yellow-600 animate-pulse" />
                        <span className="text-sm font-medium text-yellow-700">
                            Paused: {pauseElapsed || '0s'}
                        </span>
                        <span className="text-xs text-yellow-600">
                            ({jobCard.pause_reason?.replace('_', ' ') || 'Manual'})
                        </span>
                    </div>
                )}
            </div>

            {/* Buffer Information Display */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${getBufferStatusColor()}`}>
                <div className="flex items-center gap-2">
                    <BufferIcon size={18} />
                    <div>
                        <div className="text-sm font-semibold">
                            {remainingBuffer <= 0
                                ? 'Buffer Exhausted'
                                : `Buffer: ${remainingBuffer} min remaining`}
                        </div>
                        <div className="text-xs opacity-75">
                            {totalBuffer} min total · {Math.round(bufferUsedPercentage)}% used
                        </div>
                    </div>
                </div>

                {/* Buffer Progress Bar */}
                <div className="w-32">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${remainingBuffer <= 0
                                ? 'bg-red-500'
                                : bufferUsedPercentage >= 70
                                    ? 'bg-orange-500'
                                    : bufferUsedPercentage >= 40
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(bufferUsedPercentage, 100)}%` }}
                        />
                    </div>

                </div>
            </div>

            {/* Total Pause Duration */}
            {liveTotalPauseMin > 0 && (
                <div className="text-xs text-gray-600">
                    Total pause time: {liveTotalPauseMin} minutes
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Ready for Billing Warning */}
            {isReadyForBillingOrLater && !isPaused && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle size={18} className="text-blue-600" />
                    <div className="text-sm text-blue-700">
                        <div className="font-semibold">Timer Locked</div>
                        <div className="text-xs">Timer cannot be paused once the job is ready for billing.</div>
                    </div>
                </div>
            )}

            {/* Buffer Exhausted Warning */}
            {remainingBuffer <= 0 && !isPaused && !isReadyForBillingOrLater && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={18} className="text-red-600" />
                    <div className="text-sm text-red-700">
                        <div className="font-semibold">Buffer Exhausted!</div>
                        <div className="text-xs">Cannot pause timer. Consider requesting a buffer extension.</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimerControls;
