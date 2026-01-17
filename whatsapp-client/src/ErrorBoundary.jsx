// ErrorBoundary.jsx - React Error Boundary Component
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-[100dvh] w-full flex items-center justify-center p-4 bg-gray-100">
                    <div className="bg-white border-4 border-black shadow-neo max-w-md p-8 text-center">
                        <div className="bg-red-500 border-2 border-black w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h1 className="text-2xl font-black mb-4 uppercase">Something Went Wrong</h1>
                        <p className="font-mono text-sm mb-6 text-gray-600">
                            The app encountered an error. Please refresh the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-black text-white font-bold border-4 border-black py-3 px-6 shadow-neo active:shadow-none active:translate-x-[5px] active:translate-y-[5px] transition-all"
                        >
                            REFRESH PAGE
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
