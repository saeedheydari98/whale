import Image from "next/image";
import { cx } from "../../variants/shared.variant";

type AppImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  draggable?: boolean;
};

function shouldUnoptimize(src: string) {
  return /^(data:|blob:|https?:)/i.test(src);
}

export function AppImage({
  src,
  alt,
  className,
  width = 800,
  height = 800,
  sizes,
  priority = false,
  draggable = false,
}: AppImageProps) {
  const imageSrc = String(src ?? "").trim();
  if (!imageSrc) return null;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      draggable={draggable}
      unoptimized={shouldUnoptimize(imageSrc)}
      className={cx("h-full w-full", className)}
    />
  );
}
