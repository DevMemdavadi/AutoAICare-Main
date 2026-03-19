import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Chart Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-red-50 rounded-lg p-6">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <p className="text-lg font-semibold text-red-700 mb-2">
                        {this.props.title || 'Chart Error'}
                    </p>
                    <p className="text-sm text-gray-600 text-center">
                        Unable to display this chart. Please try refreshing the page.
                    </p>
                    {this.state.error && (
                        <p className="text-xs text-gray-500 mt-2">
                            {this.state.error.message}
                        </p>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
