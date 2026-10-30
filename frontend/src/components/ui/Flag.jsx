import { useEffect, useState } from "react";
import { LANGUAGE_TO_FLAG } from "../../lib/languages";
import { cn } from "../../lib/cn";

export function Flag({ language, className }) {
  const [failed, setFailed] = useState(false);
  const code = LANGUAGE_TO_FLAG[language?.toLowerCase()];

  useEffect(() => {
    setFailed(false);
  }, [language]);

  if (!code || failed) return null;

  return (
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      alt=""
      width={24}
      height={18}
      className={cn("inline-block h-[18px] w-6 shrink-0 object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
