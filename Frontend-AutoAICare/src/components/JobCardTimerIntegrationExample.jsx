/**
 * PHASE 3 FRONTEND INTEGRATION EXAMPLE
 * 
 * This file demonstrates how to integrate the new timer controls
 * into your existing job card detail pages.
 * 
 * Copy the relevant sections into your actual job card components.
 */

import { useState } from 'react';
import JobTimer from '../components/JobTimer';
import TimerControls from '../components/TimerControls';
import BufferExtensionModal from '../components/BufferExtensionModal';
import { Clock, Plus } from 'lucide-react';

const JobCardDetailExample = ({ jobCard, onJobCardUpdate }) => {
    const [showExtensionModal, setShowExtensionModal] = useState(false);

    // Handler for timer state changes
    const handleTimerUpdate = (response) => {
        // Show success toast
        console.log('Timer updated:', response);

        // Refresh job card data
        if (onJobCardUpdate) {
            onJobCardUpdate();
        }
    };

    // Handler for successful buffer extension request
    const handleExtensionSuccess = (response) => {
        // Show success toast
        console.log('Extension requested:', response);
        alert(`Buffer extension request submitted! Request ID: ${response.request.note_id}`);

        // Refresh job card data
        if (onJobCardUpdate) {
            onJobCardUpdate();
        }
    };

    return (
        <div className="space-y-6">
            {/* Job Card Header with Timer */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Job Card #{jobCard.id}
                    </h2>

                    {/* Enhanced Timer Display */}
                    <JobTimer
                        jobStartedAt={jobCard.job_started_at}
                        allowedDurationMinutes={jobCard.allowed_duration_minutes}
                        effectiveDurationMinutes={jobCard.effective_duration_minutes}
                        elapsedWorkTime={jobCard.elapsed_work_time}
                        isTimerPaused={jobCard.is_timer_paused}
                        pauseReason={jobCard.pause_reason}
                        status={jobCard.status}
                    />
                </div>

                {/* Timer Controls Section */}
                {jobCard.job_started_at && (
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Clock size={20} />
                                Timer Controls
                            </h3>

                            {/* Request Buffer Extension Button */}
                            <button
                                onClick={() => setShowExtensionModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Plus size={16} />
                                Request Extension
                            </button>
                        </div>

                        {/* Timer Controls Component */}
                        <TimerControls
                            jobCard={jobCard}
                            onUpdate={handleTimerUpdate}
                        />
                    </div>
                )}
            </div>

            {/* Other job card sections... */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Job Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-medium">{jobCard.status}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Base Duration:</span>
                        <span className="ml-2 font-medium">{jobCard.allowed_duration_minutes} min</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Buffer Time:</span>
                        <span className="ml-2 font-medium">{jobCard.buffer_minutes_allocated} min</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Effective Duration:</span>
                        <span className="ml-2 font-medium">{jobCard.effective_duration_minutes} min</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Elapsed Work Time:</span>
                        <span className="ml-2 font-medium">{jobCard.elapsed_work_time} min</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Remaining Buffer:</span>
                        <span className="ml-2 font-medium">{jobCard.remaining_buffer_minutes} min</span>
                    </div>
                </div>
            </div>

            {/* Buffer Extension Modal */}
            <BufferExtensionModal
                isOpen={showExtensionModal}
                onClose={() => setShowExtensionModal(false)}
                jobCard={jobCard}
                onSuccess={handleExtensionSuccess}
            />
        </div>
    );
};

export default JobCardDetailExample;

/**
 * INTEGRATION NOTES:
 * 
 * 1. Import the components:
 *    import JobTimer from '../components/JobTimer';
 *    import TimerControls from '../components/TimerControls';
 *    import BufferExtensionModal from '../components/BufferExtensionModal';
 * 
 * 2. Update JobTimer usage to include new props:
 *    <JobTimer
 *      jobStartedAt={jobCard.job_started_at}
 *      allowedDurationMinutes={jobCard.allowed_duration_minutes}
 *      effectiveDurationMinutes={jobCard.effective_duration_minutes}  // NEW
 *      elapsedWorkTime={jobCard.elapsed_work_time}                    // NEW
 *      isTimerPaused={jobCard.is_timer_paused}                        // NEW
 *      pauseReason={jobCard.pause_reason}                             // NEW
 *      status={jobCard.status}
 *    />
 * 
 * 3. Add TimerControls component:
 *    <TimerControls
 *      jobCard={jobCard}
 *      onUpdate={handleTimerUpdate}
 *    />
 * 
 * 4. Add BufferExtensionModal:
 *    <BufferExtensionModal
 *      isOpen={showExtensionModal}
 *      onClose={() => setShowExtensionModal(false)}
 *      jobCard={jobCard}
 *      onSuccess={handleExtensionSuccess}
 *    />
 * 
 * 5. The backend API will automatically return these new fields:
 *    - buffer_percentage
 *    - buffer_minutes_allocated
 *    - is_timer_paused
 *    - pause_started_at
 *    - pause_reason
 *    - total_pause_duration_seconds
 *    - remaining_buffer_minutes
 *    - effective_duration_minutes
 *    - elapsed_work_time
 * 
 * 6. Auto-pause/resume is handled automatically by the backend
 *    during photo uploads and QC completion - no frontend changes needed!
 */
