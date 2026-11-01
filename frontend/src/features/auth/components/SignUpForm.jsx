import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../../components/ui/Button.jsx";
import { Field, Input } from "../../../components/ui/Field.jsx";
import { getErrorMessage } from "../../../lib/errors.js";
import useSignUp from "../hooks/useSignUp.js";
import { AuthLayout } from "./AuthLayout.jsx";
import { FormAlert } from "./FormAlert.jsx";
import { PasswordControl } from "./PasswordControl.jsx";
import { firstError, passwordHint, shownErrors, signupFieldErrors } from "../validation.js";

const ORDER = ["fullName", "email", "password"];

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

const SignUpForm = () => {
  const { isPending, signupMutation } = useSignUp();
  const busy = useRef(false);
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const previous = document.title;
    document.title = "Create an account — Linguae";
    return () => {
      document.title = previous;
    };
  }, []);

  const errors = shownErrors(signupFieldErrors(values), touched, submitted);

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
    const all = signupFieldErrors(values);
    const invalid = firstError(ORDER, all);
    if (invalid) {
      setFormError("");
      document.getElementById(invalid)?.focus();
      return;
    }
    setFormError("");
    busy.current = true;
    signupMutation(
      { fullName: values.fullName, email: values.email, password: values.password },
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
          <h1>Create an account</h1>
          <p className="max-w-[65ch] text-small text-fg-muted">
            Then you can set up your profile and find someone to talk with.
          </p>
        </div>
        <FormAlert message={formError} />
        <Field label={<RequiredLabel>Full name</RequiredLabel>} error={errors.fullName}>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            aria-required="true"
            value={values.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            onBlur={() => touch("fullName")}
          />
        </Field>
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
        <Field
          label={<RequiredLabel>Password</RequiredLabel>}
          hint={passwordHint(values.password)}
          error={errors.password}
        >
          <PasswordControl
            id="password"
            name="password"
            autoComplete="new-password"
            aria-required="true"
            value={values.password}
            onChange={(event) => update("password", event.target.value)}
            onBlur={() => touch("password")}
          />
        </Field>
        <p className="max-w-[65ch] text-caption text-fg-muted">
          By creating an account you agree to the terms of service and the privacy policy.
        </p>
        <Button type="submit" className="w-full" loading={isPending} disabled={isPending}>
          Create an account
        </Button>
        <p className="flex flex-wrap items-center gap-x-2 text-small text-fg-muted">
          <span>Already have an account?</span>
          <Link to="/login" className={textLink}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default SignUpForm;
