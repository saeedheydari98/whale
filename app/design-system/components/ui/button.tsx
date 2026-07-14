"use client";

import Link from "next/link";
import React from "react";

import { useTheme } from "../../theme/provider";
import { resolveDynamicColor } from "../../theme/theme";
import { resolveTokenTextColor, resolveVariantCssVars, strengthenBorderColor, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cursorVariants, cx, interactionStates, motionVariants, radiusVariants, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import Loading, { LoadingVariant } from "../loading/loading";


type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>;

type CustomButtonProps = BaseProps & {
  children?: React.ReactNode;

  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  cursor?: keyof typeof cursorVariants;
  fullWidth?: boolean;
  loading?: LoadingVariant;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  hover?: keyof typeof interactionStates.hover;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  token?: string;
  className?: string;
  unstyled?: boolean;
  href?: string;
};

export const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "borderB",
  shadow = "none",
  cursor = "pointer",
  fullWidth = false,
  loading = "spinner",
  isLoading = false,
  loadingText,
  disabled = false,
  hover = "darken",
  icon,
  iconAfter,
  token,
  onClick,
  className,
  unstyled = false,
  style,
  href,
  ...rest
}) => {
  const { theme } = useTheme();
  const variantStyle = resolveVariantCssVars(variant);
  const isDisabled = disabled || isLoading;

  const tokenStyle: React.CSSProperties = {};

  if (token) {
    const resolvedColor = resolveDynamicColor({
      token,
      state: theme.state,
      admin: theme.admin,
    });

    if (token.startsWith("bg-")) {
      tokenStyle.backgroundColor = resolvedColor;
      tokenStyle.borderColor = strengthenBorderColor(resolvedColor);
      tokenStyle.color = resolveTokenTextColor(theme, token, 50);
    }

    if (token.startsWith("text-")) {
      tokenStyle.color = resolvedColor;
    }
  }

  const classes = cx(
    "inline-flex items-center justify-center gap-2 font-medium ",
    (fullWidth) && "w-full",
    sizeVariants[size],
    radiusVariants[rounded],
    borderVariants[border],
    cursorVariants[cursor],
    shadowVariants[shadow],
    motionVariants.smooth,
    !isDisabled && interactionStates.hover[hover],
    !isDisabled && interactionStates.active.press,
    isDisabled && interactionStates.disabled.base,
    className
  );

  const content = (
    <>
      {isLoading && <Loading loading={loading} size={size} />}
      {!isLoading && icon}
      <span>{isLoading ? loadingText ?? children : children}</span>
      {!isLoading && iconAfter}
    </>
  );

  if (href) {
    const isExternalHref = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);
    const anchorProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    const commonLinkProps = {
      ...anchorProps,
      onClick: onClick as any,
      style: {
        ...(unstyled
          ? {}
          : {
              backgroundColor: variantStyle.backgroundColor,
              color: variantStyle.color,
              borderColor: variantStyle.borderColor,
            }),
        ...style,
        ...tokenStyle,
      },
      className: classes,
    };

    if (!isExternalHref && !anchorProps.target) {
      return (
        <Link href={href} {...commonLinkProps}>
          {content}
        </Link>
      );
    }

    return (
      <a
        {...anchorProps}
        href={href}
        {...commonLinkProps}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      disabled={isDisabled}
      onClick={onClick}
      style={{
        ...(unstyled
          ? {}
          : {
              backgroundColor: variantStyle.backgroundColor,
              color: variantStyle.color,
              borderColor: variantStyle.borderColor,
            }),
        ...style,
        ...tokenStyle,
      }}
      className={classes}
    >
      {content}
    </button>
  );
};
