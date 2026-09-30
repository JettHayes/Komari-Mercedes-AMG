"use client";

import { useTranslation } from "react-i18next";

type LoadingProps = {
  text?: string;
  children?: React.ReactNode;
};

const Loading = ({ text, children }: LoadingProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center flex-col py-16 gap-4">
      <div className="rc-lights" aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="rc-label">{t("raceControl.lightsOut")}</p>
      <p className="text-sm text-muted-foreground">{text || t("raceControl.loadingFeed")}</p>
      {children}
    </div>
  );
};

export default Loading;
