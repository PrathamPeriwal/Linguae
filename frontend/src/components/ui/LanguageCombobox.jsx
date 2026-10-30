import { useEffect, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { LANGUAGES } from "../../lib/languages";
import { cn } from "../../lib/cn";
import { languageLabel } from "../../lib/languageLabel";
import { controlClass } from "./Field";
import { Flag } from "./Flag";

export function LanguageCombobox({
  id,
  value = "",
  onChange,
  placeholder = "Search languages",
  invalid = false,
  disabled = false,
  container,
  className,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const listId = `${id}-listbox`;

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LANGUAGES.filter((language) => language.toLowerCase().includes(q));
  }, [query]);

  const activeIndex = options.length === 0 ? 0 : Math.min(active, options.length - 1);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const option = listRef.current.querySelector("[data-active='true']");
    if (!option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < listRef.current.scrollTop) listRef.current.scrollTop = top;
    else if (bottom > listRef.current.scrollTop + listRef.current.clientHeight) {
      listRef.current.scrollTop = bottom - listRef.current.clientHeight;
    }
  }, [open, activeIndex, options]);

  function commit(language) {
    onChange?.(language);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(event.key === "ArrowUp" ? Math.max(options.length - 1, 0) : 0);
        return;
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActive(Math.min(Math.max(activeIndex + delta, 0), Math.max(options.length - 1, 0)));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(options.length - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && options[activeIndex]) {
      event.preventDefault();
      commit(options[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (event.key === "Tab") setOpen(false);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && document.activeElement?.getAttribute("role") === "combobox") return;
        setOpen(next);
      }}
    >
      <Popover.Anchor asChild>
        <input
          {...props}
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={props["aria-invalid"] || invalid || undefined}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className={cn(controlClass, "h-11 px-3", invalid && "border-danger", className)}
          value={open ? query : languageLabel(value)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setActive(0);
            setOpen(true);
          }}
          onPointerDown={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </Popover.Anchor>
      <Popover.Portal container={container || undefined}>
        <Popover.Content
          role="presentation"
          sideOffset={6}
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            const target = event.target;
            if (target instanceof Element && target.closest("[role=combobox]")) event.preventDefault();
          }}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-control border border-line bg-raised p-1 text-fg"
        >
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label="Languages"
            className="relative grid max-h-60 overflow-auto"
          >
            {options.length === 0 ? (
              <li className="px-2 py-2 text-small text-fg-muted">
                No language has that name. Try a different spelling.
              </li>
            ) : (
              options.map((language, index) => {
                const selected = languageLabel(value) === language;
                return (
                  <li
                    key={language}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={selected}
                    data-active={index === activeIndex ? "true" : undefined}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-control px-2 py-2 text-small",
                      index === activeIndex && "bg-raised-hover",
                    )}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit(language)}
                  >
                    <Flag language={language} />
                    {language}
                  </li>
                );
              })
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
