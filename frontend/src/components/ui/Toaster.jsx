import { Toaster as HotToaster } from "react-hot-toast";

const toastStyle = {
  background: "rgb(var(--raised))",
  color: "rgb(var(--fg))",
  border: "1px solid rgb(var(--line) / var(--line-strength))",
  borderRadius: "var(--radius-control)",
  boxShadow: "none",
  fontFamily: "var(--font-sans)",
  fontSize: "0.875rem",
  maxWidth: "24rem",
};

const polite = { role: "status", "aria-live": "polite" };

export function Toaster() {
  return (
    <HotToaster
      position="bottom-center"
      containerClassName="linguae-toaster"
      toastOptions={{
        ariaProps: polite,
        style: toastStyle,
        success: {
          ariaProps: polite,
          style: { ...toastStyle, borderColor: "rgb(var(--success))" },
          iconTheme: {
            primary: "rgb(var(--success))",
            secondary: "rgb(var(--raised))",
          },
        },
        error: {
          ariaProps: polite,
          style: { ...toastStyle, borderColor: "rgb(var(--danger))" },
          iconTheme: {
            primary: "rgb(var(--danger))",
            secondary: "rgb(var(--raised))",
          },
        },
      }}
    />
  );
}
