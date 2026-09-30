"use client";

import LanguageSwitch from "./Language";
import LoginDialog from "./Login";
import ThemeSwitcher from "./ThemeSwitcher";
import DarkModeToggle from "./DarkModeToggle";
import SpaLink from "./SpaLink";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import { dispatchOpenRemainingValueCalculatorEvent } from "@/lib/remainingValueEvents";

const AMG_LOGO_URL = "/assets/Mercedes-Benz.png";

const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  const { guestDisplay } = useTheme();
  const { live_data } = useLiveData();
  const { t } = useTranslation();
  const online = live_data?.data?.online?.length ?? 0;

  return (
    <nav className="rc-nav sticky top-0 z-50 w-full">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <SpaLink href="/" className="rc-brand">
            <img src={AMG_LOGO_URL} alt="Mercedes-Benz" />
            <span className="rc-brand-title rc-brand-title--full">
              Mercedes-AMG PETRONAS F1 Team
            </span>
            <span className="rc-brand-title rc-brand-title--compact">AMG PETRONAS</span>
          </SpaLink>
          <div className="hidden sm:flex items-center gap-2">
            <span className="rc-live-dot" />
            <span className="rc-mono text-xs text-muted-foreground">
              {t("raceControl.onlineCount", { count: online })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <DarkModeToggle />
          {guestDisplay.showPrice && guestDisplay.showExpiredAt && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={dispatchOpenRemainingValueCalculatorEvent}
            >
              <Calculator className="h-4 w-4" />
              <span className="sr-only">
                {t("remainingValue.title", { defaultValue: "Remaining Value Calculator" })}
              </span>
            </Button>
          )}
          <LanguageSwitch />
          <ThemeSwitcher />
          {publicInfo?.private_site ? (
            <LoginDialog
              autoOpen={publicInfo?.private_site}
              info={t("common.private_site")}
              onLoginSuccess={() => {
                window.location.reload();
              }}
            />
          ) : (
            <LoginDialog />
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
