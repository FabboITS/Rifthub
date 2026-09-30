import { Component } from "react";
import { ErrorBox } from "./ui";

/** Keeps a crashing page from blanking the whole app (navbar included). */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="space-y-3">
        <ErrorBox error={`Si è verificato un errore in questa pagina: ${this.state.error.message}`} />
        <button className="btn-ghost" onClick={() => this.setState({ error: null })}>Riprova</button>
      </div>
    );
  }
}
