import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../../lib/cn.js";
import { Input } from "../../../components/ui/Field.jsx";
import { IconButton } from "../../../components/ui/IconButton.jsx";

export function PasswordControl({ id, invalid, className, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        invalid={invalid}
        type={visible ? "text" : "password"}
        spellCheck={false}
        autoCapitalize="off"
        className={cn("pr-12", className)}
      />
      <IconButton
        className="absolute right-0 top-0"
        aria-pressed={visible}
        aria-controls={id}
        aria-label={visible ? "Hide password" : "Show password"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </IconButton>
    </div>
  );
}
