// Mirrors backend/src/controllers/auth.controller.js.
// Signup: all three fields present, then password length, then this email pattern.
// Login: email and password present only. The format check is also applied here
// so a mistyped email is explained before the request.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

export function loginFieldErrors({ email, password }) {
  const errors = {};
  if (!email) errors.email = "Enter your email.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter an email like name@example.com.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

export function signupFieldErrors({ fullName, email, password }) {
  const errors = {};
  if (!fullName) errors.fullName = "Enter your full name.";
  if (!email) errors.email = "Enter your email.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter an email like name@example.com.";
  if (!password) errors.password = "Enter a password.";
  else if (password.length < MIN_PASSWORD_LENGTH) errors.password = "Use at least 6 characters.";
  return errors;
}

export function passwordHint(password) {
  if (password.length >= MIN_PASSWORD_LENGTH) return "Long enough.";
  if (password.length === 0) return "At least 6 characters.";
  const left = MIN_PASSWORD_LENGTH - password.length;
  return left === 1 ? "1 more character." : `${left} more characters.`;
}

export function shownErrors(all, touched, submitted) {
  const shown = {};
  for (const key of Object.keys(all)) {
    if (submitted || touched[key]) shown[key] = all[key];
  }
  return shown;
}

export function firstError(order, errors) {
  return order.find((key) => errors[key]) || "";
}
