import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('GigBoard error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          textAlign: 'center',
        }}>
          <div style={{fontSize: 32, marginBottom: 16}}>⚠️</div>
          <div style={{fontSize: 16, fontWeight: 600, color: '#e8e8f0', marginBottom: 8}}>
            Something went wrong
          </div>
          <div style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 400}}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn btn-primary"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
