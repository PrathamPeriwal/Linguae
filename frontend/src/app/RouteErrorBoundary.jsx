import { Component } from "react";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { Gate } from "../components/ui/Gate.jsx";
import { Logo } from "../components/ui/Logo.jsx";

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  retry = () => {
    this.setState((state) => ({ error: null, resetKey: state.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <Gate>
          <Logo />
          <ErrorState
            className="justify-items-center py-0 text-center"
            title="Something went wrong"
            onRetry={this.retry}
          >
            This page failed to load. Try again.
          </ErrorState>
        </Gate>
      );
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
