import { useEffect, useState, useRef } from "react";

const Alert = ({
  type = "info",
  message,
  title,
  onClose,
  duration = 5000,
  showProgress = true,
}) => {
  const [visible, setVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (duration <= 0) return;

    const startTimer = () => {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setTimeRemaining(prev => {
            const newTime = prev - 100;
            if (newTime <= 0) {
              handleClose();
              return 0;
            }
            return newTime;
          });
        }
      }, 100);
    };

    startTimer();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [duration, isPaused]);

  const handleClose = () => {
    setVisible(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (onClose) onClose();
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  if (!visible) return null;

  const typeStyles = {
    success: {
      container: "bg-green-50 border-green-200 text-green-800",
      icon: "text-green-500",
      title: title || "Success",
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    danger: {
      container: "bg-red-50 border-red-200 text-red-800",
      icon: "text-red-500",
      title: title || "Success",
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    error: {
      container: "bg-red-50 border-red-200 text-red-800",
      icon: "text-red-500",
      title: "Error",
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200 text-yellow-800",
      icon: "text-yellow-500",
      title: "Warning",
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      ),
    },
    info: {
      container: "bg-blue-50 border-blue-200 text-blue-800",
      icon: "text-blue-500",
      title: "Info",
      iconPath: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
  };

  const style = typeStyles[type] || typeStyles.info;
  const progressPercentage = duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
      <div
        className={`rounded-lg border p-4 backdrop-blur-sm shadow-md transition-all duration-300 ${style.container}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-start gap-3">
          {/* ICON */}
          <div className={`mt-0.5 ${style.icon}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {style.iconPath}
            </svg>
          </div>

          {/* TEXT */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{style.title}</h3>
            <p className="text-sm mt-0.5">{message}</p>
          </div>

          {/* CLOSE BUTTON */}
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-black/10 transition"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* SMOOTH PROGRESS BAR */}
        {showProgress && duration > 0 && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-gray-200">
            <div
              className={`h-full rounded-full ${type === "success"
                  ? "bg-green-500"
                  : type === "error"
                    ? "bg-red-500"
                    : type === "warning"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                }`}
              style={{
                width: `${progressPercentage}%`,
                transition: 'width 0.1s linear'
              }}
            ></div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Alert;