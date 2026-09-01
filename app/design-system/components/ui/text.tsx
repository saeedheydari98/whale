import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../variants/shared.variant";

export type AppHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const HEADING_TAG = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

type AppHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level: AppHeadingLevel;
  className: string;
  children: ReactNode;
};

/** Semantic heading with the same visual classes previously used on div/span. One h1 per page. */
export function AppHeading({ level, className, children, ...rest }: AppHeadingProps) {
  const Tag = HEADING_TAG[level];
  return (
    <Tag className={cx("m-0", className)} {...rest}>
      {children}
    </Tag>
  );
}
