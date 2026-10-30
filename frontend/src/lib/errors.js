export function getErrorMessage(error) {
  const message = error?.response?.data?.message;
  if (typeof message === "string" && message.length > 0) return message;
  if (error?.response) return "Something went wrong. Please try again.";
  return "Can't reach the server";
}
