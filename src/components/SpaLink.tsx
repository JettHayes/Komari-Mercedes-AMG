"use client";

import React from "react";
import { isPlainLeftClick, navigateSpa } from "@/lib/spaNavigation";

type SpaLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

const SpaLink = React.forwardRef<HTMLAnchorElement, SpaLinkProps>(
  ({ href, onClick, target, download, rel, ...props }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (
        event.defaultPrevented ||
        target ||
        download ||
        !isPlainLeftClick(event)
      ) {
        return;
      }

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }

      event.preventDefault();
      navigateSpa(href);
    };

    return (
      <a
        ref={ref}
        href={href}
        onClick={handleClick}
        target={target}
        download={download}
        rel={rel}
        {...props}
      />
    );
  }
);

SpaLink.displayName = "SpaLink";

export default SpaLink;
