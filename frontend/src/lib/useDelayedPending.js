import { useEffect, useState } from "react";

export function useDelayedPending(pending) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const delay = pending ? 150 : 300;
    const timer = setTimeout(() => setShow(pending), delay);
    return () => clearTimeout(timer);
  }, [pending]);

  return show;
}
