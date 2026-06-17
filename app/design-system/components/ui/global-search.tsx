"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { CustomInput } from "./input";
import { useIsMobile } from "@/hooks/useIsMobile";

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [value, setValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const returnPathRef = useRef("/");
  const INPUT_ID = "global-search-input";
  const isOpen = !isMobile || expanded;

  const submit = (q?: string) => {
    const v = (q ?? value).trim();
    if (!v) {
      router.push(returnPathRef.current);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  useEffect(() => {
    if (pathname !== "/search") {
      const params = searchParams.toString();
      returnPathRef.current = params ? `${pathname}?${params}` : pathname;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const nextValue = searchParams.get("q") ?? "";
    if (pathname === "/search") {
      setValue(nextValue);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const trimmed = value.trim();
    const timer = window.setTimeout(() => {
      if (!trimmed && pathname === "/search") {
        router.push(returnPathRef.current);
        return;
      }
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [pathname, router, value]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobile && expanded) {
        close();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, isMobile]);

  useEffect(() => {
    if (isMobile) {
      close();
    }
  }, [isMobile]);

  const open = () => {
    setExpanded(true);
    setTimeout(() => (document.getElementById(INPUT_ID) as HTMLInputElement | null)?.focus(), 60);
  };

  const close = () => {
    setExpanded(false);
  };

  return (
    <div className="relative min-w-0 flex-1 md:flex-none">
      <div className="flex min-w-0 items-center">
        <div
          className={`relative flex items-center transition-all duration-200 ease-out md:static md:h-auto md:w-72 ${
            expanded
              ? "h-10 w-full min-w-0"
              : "h-6 w-10 min-w-10 shrink-0 justify-center"
          }`}
        >
          <CustomInput
            id={INPUT_ID}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder=" search products ..."
            fullWidth={isOpen}
            rounded="full"
            border="none"
            className={
              isOpen
                ? "h-10 px-7 text-sm"
                : "h-6 w-10 min-w-10 p-0 text-center text-transparent caret-transparent placeholder:text-transparent md:h-10 md:w-full md:px-7 md:text-sm md:text-primary-text md:caret-auto md:placeholder:text-secondary-text"
            }
            style={{ backgroundColor: "color-mix(in srgb, var(--primary) 58%, var(--bg-base))" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            aria-label="global-search"
          />

          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                if (!expanded) {
                  open();
                  return;
                }
              }

              submit();
            }}
            aria-label="submit-search"
            className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center text-secondary-text md:right-1.5 md:p-0.5 ${isOpen ? "right-1.5 p-0.5" : "left-1/2 -translate-x-1/2 p-0.5 md:left-auto md:translate-x-0"}`}
          >
            <FiSearch />
          </button>

          {isMobile && expanded && (
            <button
              type="button"
              onClick={close}
              aria-label="close-search"
              className="absolute left-1.5 top-1/2 flex -translate-y-1/2 items-center justify-center p-0.5 text-secondary-text"
            >
              <IoClose />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalSearch;
