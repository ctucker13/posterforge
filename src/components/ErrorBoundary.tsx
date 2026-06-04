import React from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div role="alert" style={{ padding: "2rem", fontFamily: "sans-serif" }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#c0392b", fontSize: "0.85rem" }}>{error.message}</pre>
          <button type="button" onClick={() => this.setState({ error: null })}>
            Dismiss and try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
