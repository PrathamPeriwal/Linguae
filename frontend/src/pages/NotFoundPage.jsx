import { useEffect } from "react";
import { Button } from "../components/ui/Button";
import { Gate } from "../components/ui/Gate";
import { Logo } from "../components/ui/Logo";

export default function NotFoundPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Page not found — Linguae";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <Gate>
      <Logo />
      <h1 tabIndex={-1}>Page not found</h1>
      <p className="text-body text-fg-muted">That page does not exist.</p>
      <Button to="/">Go home</Button>
    </Gate>
  );
}
