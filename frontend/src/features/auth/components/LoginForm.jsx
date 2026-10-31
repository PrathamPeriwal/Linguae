import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../../components/ui/Button.jsx";
import { Field, Input } from "../../../components/ui/Field.jsx";
import { getErrorMessage } from "../../../lib/errors.js";
import useLogin from "../hooks/useLogin.js";
import { AuthLayout } from "./AuthLayout.jsx";
import { FormAlert } from "./FormAlert.jsx";
import { PasswordControl } from "./PasswordControl.jsx";
import { firstError, loginFieldErrors, shownErrors } from "../validation.js";

const ORDER = ["email", "password"];

const textLink =
  "inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline";

function RequiredLabel({ children }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      {children}
      <span className="text-caption font-normal text-fg-muted">Required</span>
    </span>
  );
}

const LoginForm = () => {
  const { isPending, loginMutation } = useLogin();
  const busy = useRef(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const previous = document.title;
    document.title = "Sign in — Linguae";
    return () => {
      document.title = previous;
    };
  }, []);

  const errors = shownErrors(loginFieldErrors(values), touched, submitted);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setFormError("");
  }

  function touch(name) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function onSubmit(event) {
    event.preventDefault();
    if (busy.current || isPending) return;
    setSubmitted(true);
    const all = loginFieldErrors(values);
    const invalid = firstError(ORDER, all);
    if (invalid) {
      setFormError("");
      document.getElementById(invalid)?.focus();
      return;
    }
    setFormError("");
    busy.current = true;
    loginMutation(
      { email: values.email, password: values.password },
      {
        onError: (error) => setFormError(getErrorMessage(error)),
        onSettled: () => {
          busy.current = false;
        },
      },
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <div className="grid gap-2">
          <h1>Sign in</h1>
          <p className="max-w-[65ch] text-small text-fg-muted">
            Use the email and password for your account.
          </p>
        </div>
        <FormAlert message={formError} />
        <Field label={<RequiredLabel>Email</RequiredLabel>} error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            aria-required="true"
            placeholder="name@example.com"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            onBlur={() => touch("email")}
          />
        </Field>
        <Field label={<RequiredLabel>Password</RequiredLabel>} error={errors.password}>
          <PasswordControl
            id="password"
            name="password"
            autoComplete="current-password"
            aria-required="true"
            value={values.password}
            onChange={(event) => update("password", event.target.value)}
            onBlur={() => touch("password")}
          />
        </Field>
        <Button type="submit" className="w-full" loading={isPending} disabled={isPending}>
          Sign in
        </Button>
        <p className="flex flex-wrap items-center gap-x-2 text-small text-fg-muted">
          <span>New here?</span>
          <Link to="/signup" className={textLink}>
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginForm;
