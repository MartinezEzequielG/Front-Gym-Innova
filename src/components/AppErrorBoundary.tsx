import * as React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown) {
    // Dejar log para producción (si después agregan Sentry/LogRocket, engancha acá)
    // eslint-disable-next-line no-console
    console.error('UI crashed:', err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
          <h2 style={{ margin: 0, marginBottom: 8 }}>Ocurrió un error</h2>
          <p style={{ margin: 0, marginBottom: 12, color: '#666' }}>
            La pantalla se recuperó con un fallback. Podés recargar.
          </p>

          {this.state.message && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#444', margin: 0, marginBottom: 12 }}>
              {this.state.message}
            </pre>
          )}

          <button onClick={() => window.location.reload()} style={{ padding: '10px 14px' }}>
            Recargar
          </button>
        </div>
      </div>
    );
  }
}