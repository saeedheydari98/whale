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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const returnPathRef = useRef("/");
  const INPUT_ID = "global-search-input";
  const isOpen = !isMobile || expanded;

  const submit = (q?: string) => {
    const v = (q ?? value).trim();
    const currentQuery = searchParams.get("q") ?? "";
    if (!v) {
      router.push(returnPathRef.current);
      return;
    }
    if (pathname === "/search" && currentQuery === v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const updateSearchValue = (nextValue: string) => {
    setValue(nextValue);
    if (!nextValue.trim() && pathname === "/search") {
      router.push(returnPathRef.current);
    }
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
      return;
    }
    setValue("");
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isSearchFocused) return;

    const trimmed = value.trim();
    const timer = window.setTimeout(() => {
      const currentQuery = searchParams.get("q") ?? "";
      if (!trimmed && pathname === "/search") {
        router.push(returnPathRef.current);
        return;
      }
      if (trimmed && (pathname !== "/search" || currentQuery !== trimmed)) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [isSearchFocused, pathname, router, searchParams, value]);

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
            name="site-global-search"
            type="text"
            value={value}
            onChange={(e) => updateSearchValue(e.target.value)}
            placeholder=" search products ..."
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            showLabel={false}
            fullWidth={isOpen}
            rounded="full"
            border="none"
            className={
              isOpen
                ? "h-10 px-7 text-sm"
                : "h-6 w-10 min-w-10 p-0 text-center text-transparent caret-transparent placeholder:text-transparent md:h-10 md:w-full md:px-7 md:text-sm md:text-primary-text md:caret-auto md:placeholder:text-secondary-text"
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
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
