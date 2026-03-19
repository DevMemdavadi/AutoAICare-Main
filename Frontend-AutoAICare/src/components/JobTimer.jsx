import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, XCircle, Pause } from 'lucide-react';

/**
 * JobTimer Component - Shows live timer with remaining time, warning, and overdue status
 * Now includes buffer time and pause status support
 * 
 * @param {string} jobStartedAt - ISO timestamp when job started
 * @param {number} allowedDurationMinutes - Base allocated time for the job in minutes
 * @param {number} effectiveDurationMinutes - Total time including buffer (base + buffer)
 * @param {number} elapsedWorkTime - Actual work time excluding pauses
 * @param {boolean} isTimerPaused - Whether timer is currently paused
 * @param {string} pauseReason - Reason for pause (if paused)
 * @param {string} status - Current job status ('started', 'in_progress', 'completed')
 * @param {string} className - Additional CSS classes
 * @param {boolean} showElapsed - Whether to show elapsed time (default: false, shows remaining)
 */
const JobTimer = ({
  jobStartedAt,
  allowedDurationMinutes,
  effectiveDurationMinutes,
  elapsedWorkTime: initialElapsedWorkTime,
  isTimerPaused = false,
  pauseStartedAt,
  totalPauseDurationSeconds = 0,
  status,
  className = '',
  showElapsed = false,
  reflectPause = true
}) => {
  const [displayTime, setDisplayTime] = useState('');
  const [timerStatus, setTimerStatus] = useState('normal'); // 'normal', 'warning', 'overdue'
  const [remainingMinutes, setRemainingMinutes] = useState(null);

  useEffect(() => {
    if (!jobStartedAt || !['started', 'in_progress', 'work_in_progress', 'assigned_to_applicator'].includes(status)) {
      setDisplayTime('');
      setTimerStatus('normal');
      return;
    }

    const calculateTime = () => {
      try {
        const start = new Date(jobStartedAt);
        const now = new Date();
        const diffMs = now - start;

        if (diffMs < 0) {
          setDisplayTime(showElapsed ? '0m' : 'Not started');
          setTimerStatus('normal');
          return;
        }

        // Calculate dynamic elapsed time
        let elapsedSeconds;
        const totalElapsedSeconds = Math.floor(diffMs / 1000);

        if (reflectPause) {
          // Subtract accumulated pause time
          elapsedSeconds = totalElapsedSeconds - (totalPauseDurationSeconds || 0);

          // If currently paused, subtract the current pause session duration
          if (isTimerPaused && pauseStartedAt) {
            const pauseStart = new Date(pauseStartedAt);
            const currentPauseSeconds = Math.floor((now - pauseStart) / 1000);
            elapsedSeconds -= currentPauseSeconds;
          }
        } else {
          // Ignore pauses, just show total clock time since start
          elapsedSeconds = totalElapsedSeconds;
        }

        // Ensure we don't have negative elapsed time due to clock drift
        elapsedSeconds = Math.max(0, elapsedSeconds);

        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        const elapsedSecsInMin = elapsedSeconds % 60;

        if (showElapsed) {
          // Show elapsed time
          const hours = Math.floor(elapsedMinutes / 60);
          const mins = elapsedMinutes % 60;

          if (hours > 0) {
            setDisplayTime(`${hours}h ${mins}m`);
          } else if (mins > 0) {
            setDisplayTime(`${mins}m ${elapsedSecsInMin}s`);
          } else {
            setDisplayTime(`${elapsedSecsInMin}s`);
          }
        } else {
          // Show remaining time
          // Use effective duration (includes buffer) if available
          const duration = effectiveDurationMinutes || allowedDurationMinutes;

          if (!duration || duration <= 0) {
            setDisplayTime('No limit');
            setTimerStatus('normal');
            return;
          }

          const remainingSeconds = (duration * 60) - elapsedSeconds;
          const remainingMins = Math.ceil(remainingSeconds / 60);
          setRemainingMinutes(remainingMins);

          if (remainingSeconds <= 0) {
            // Overdue
            const overdueSeconds = Math.abs(remainingSeconds);
            const overdueMins = Math.floor(overdueSeconds / 60);
            const overdueSecs = overdueSeconds % 60;

            if (overdueMins > 0) {
              setDisplayTime(`Overdue by ${overdueMins}m ${overdueSecs}s`);
            } else {
              setDisplayTime(`Overdue by ${overdueSecs}s`);
            }
            setTimerStatus('overdue');
          } else if (remainingSeconds <= 600) { // last 10 minutes
            // Warning zone
            const remMins = Math.floor(remainingSeconds / 60);
            const remSecs = remainingSeconds % 60;
            setDisplayTime(`${remMins}m ${remSecs}s left`);
            setTimerStatus('warning');
          } else {
            // Normal
            const remMins = Math.floor(remainingSeconds / 60);
            const remSecs = remainingSeconds % 60;
            const hours = Math.floor(remMins / 60);
            const mins = remMins % 60;

            if (hours > 0) {
              setDisplayTime(`${hours}h ${mins}m ${remSecs}s left`);
            } else {
              setDisplayTime(`${remMins}m ${remSecs}s left`);
            }
            setTimerStatus('normal');
          }
        }
      } catch (error) {
        console.error('Error calculating time:', error);
        setDisplayTime('');
        setTimerStatus('normal');
      }
    };

    // Calculate immediately
    calculateTime();

    // Update every second
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [jobStartedAt, allowedDurationMinutes, effectiveDurationMinutes, totalPauseDurationSeconds, isTimerPaused, pauseStartedAt, status, showElapsed, reflectPause]);

  if (!displayTime || !['started', 'in_progress', 'work_in_progress', 'assigned_to_applicator'].includes(status)) {
    return null;
  }

  const getStatusStyles = () => {
    switch (timerStatus) {
      case 'warning':
        return {
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: AlertTriangle,
        };
      case 'overdue':
        return {
          iconColor: 'text-red-600',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: XCircle,
        };
      default:
        return {
          iconColor: 'text-blue-600',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: Clock,
        };
    }
  };

  const styles = getStatusStyles();
  const Icon = styles.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${styles.bgColor} ${styles.borderColor} ${className}`}
    >
      <Icon
        size={16}
        className={`${styles.iconColor} ${timerStatus === 'warning' || timerStatus === 'overdue' ? 'animate-pulse' : ''}`}
      />
      <div className="flex items-center gap-1">
        {!showElapsed && (
          <span className={`text-xs font-semibold ${styles.textColor}`}>
            {timerStatus === 'warning' ? 'Warning:' : timerStatus === 'overdue' ? 'Overdue:' : 'Remaining:'}
          </span>
        )}
        <span className={`text-sm font-mono font-bold ${styles.textColor}`}>
          {displayTime}
        </span>
      </div>

      {/* Pause Indicator */}
      {isTimerPaused && (
        <div className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-yellow-100 border border-yellow-300 rounded">
          <Pause size={12} className="text-yellow-700" />
          <span className="text-xs font-medium text-yellow-700">
            Paused
          </span>
        </div>
      )}
    </div>
  );
};

export default JobTimer;

