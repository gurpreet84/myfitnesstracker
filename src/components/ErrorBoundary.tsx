import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FitTracker crash]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0d1117', color: '#e6edf3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', padding: 24,
        }}>
          <div style={{ maxWidth: 560, width: '100%' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💥</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#ef4444' }}>
              Something went wrong
            </div>
            <div style={{
              background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
              padding: 16, fontSize: 13, color: '#8b949e', fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16,
            }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </div>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}
            >
              Reload app
            </button>
            <p style={{ fontSize: 12, color: '#484f58', marginTop: 10 }}>
              Open DevTools → Console for full details. Screenshot this error and share it.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
