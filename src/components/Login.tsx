import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Flex } from "@/components/ui/flex";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Box } from "@/components/ui/box";
import { useTranslation } from "react-i18next";
import { TablerSettings } from "./Icones/Tabler";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useMounted } from "@/hooks/useMounted";

type LoginDialogProps = {
  trigger?: React.ReactNode | string;
  autoOpen?: boolean;
  showSettings?: boolean;
  info?: string | React.ReactNode;
  onLoginSuccess?: () => void;
};

const startOAuthLogin = () => {
  window.location.assign("/api/oauth");
};

const LoginDialogContent = ({
  trigger,
  autoOpen = false,
  showSettings = true,
  info,
  onLoginSuccess,
}: LoginDialogProps) => {
  const { account, loading, error, refresh } = useAccount();
  const {
    publicInfo,
    isLoading: publicInfoLoading,
    error: publicInfoError,
  } = usePublicInfo();
  const [t] = useTranslation();
  const mounted = useMounted();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [twoFac, setTwoFac] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [require2FA, setRequire2FA] = React.useState(false);
  const [open, setOpen] = React.useState(autoOpen);
  const oauthRedirectStarted = React.useRef(false);

  const publicInfoReady = publicInfo !== null;
  const passwordLoginEnabled = publicInfoReady
    ? !publicInfo.disable_password_login
    : false;
  const oauthEnabled = publicInfoReady && publicInfo.oauth_enable;
  const onlyOAuthLogin = oauthEnabled && !passwordLoginEnabled;
  const isFormValid =
    passwordLoginEnabled &&
    username.trim() !== "" &&
    password.trim() !== "";
  const shouldAutoRedirectToOAuth = Boolean(
    autoOpen &&
    !loading &&
    !error &&
    !publicInfoLoading &&
    !publicInfoError &&
    onlyOAuthLogin &&
    account?.logged_in === false
  );

  React.useEffect(() => {
    if (autoOpen && !onlyOAuthLogin) {
      setOpen(true);
    }
  }, [autoOpen, onlyOAuthLogin]);

  React.useEffect(() => {
    if (!shouldAutoRedirectToOAuth || oauthRedirectStarted.current) {
      return;
    }

    oauthRedirectStarted.current = true;
    startOAuthLogin();
  }, [shouldAutoRedirectToOAuth]);

  const handleLogin = async () => {
    if (!isFormValid) {
      setErrorMsg("Username and password are required");
      return;
    }

    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          ...(twoFac && !account?.["2fa_enabled"]
            ? { "2fa_code": twoFac }
            : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 200) {
        refresh();
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess();
          return;
        }
        window.open("/admin", "_self");
      } else {
        if (data.message === "2FA code is required") {
          setRequire2FA(true);
          return;
        }
        setErrorMsg(data.message || "Login failed");
      }
    } catch (err) {
      setErrorMsg("Network error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && isFormValid) {
      e.preventDefault();
      handleLogin();
    }
  };

  const authStateLoading =
    loading ||
    publicInfoLoading ||
    (!publicInfoReady && !publicInfoError);

  if (authStateLoading || shouldAutoRedirectToOAuth) {
    return <Button disabled>{mounted ? t("loading") : "Loading..."}</Button>;
  }
  if (error || publicInfoError || !account || !publicInfoReady) {
    return (
      <Button disabled className="text-destructive">
        Error
      </Button>
    );
  }
  if (account.logged_in) {
    if (!showSettings) {
      return null;
    }
    return (
      <a href="/admin" target="_blank">
        <Button variant="ghost" size="icon">
          <TablerSettings />
        </Button>
      </a>
    );
  }

  if (onlyOAuthLogin && !autoOpen) {
    if (trigger) {
      if (typeof trigger === "string") {
        return <Button onClick={startOAuthLogin}>{trigger}</Button>;
      }
      return (
        <span
          onClick={startOAuthLogin}
          style={{ cursor: "pointer", display: "inline-flex" }}
        >
          {trigger}
        </span>
      );
    }
    return <Button onClick={startOAuthLogin}>{t("login.title")}</Button>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button>{t("login.title")}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-[450px]">
        <DialogTitle>{t("login.title")}</DialogTitle>
        <DialogDescription className="mb-4">
          <div className="flex justify-center flex-col gap-2">
            <label>{t("login.desc")}</label>
            {info && <label>{info}</label>}
          </div>
        </DialogDescription>
        <Box
          onSubmit={(e) => {
            e.preventDefault();
            if (isFormValid && !isLoading) {
              handleLogin();
            }
          }}
        >
          <Flex direction="column" gap="3">
            {passwordLoginEnabled && (
              <>
                <label>
                  <Text as="div" size="2" weight="bold">
                    {t("login.username")}
                  </Text>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="admin"
                    disabled={isLoading}
                    autoFocus
                  />
                </label>
                <label>
                  <Text as="div" size="2" weight="bold">
                    {t("login.password")}
                  </Text>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    type="password"
                    placeholder={t("login.password_placeholder")}
                    disabled={isLoading}
                  />
                </label>
                <label hidden={!require2FA}>
                  <Text as="div" size="2" weight="bold">
                    {t("login.two_factor")}
                  </Text>
                  <Input
                    value={twoFac}
                    onChange={(e) => setTwoFac(e.target.value)}
                    onKeyDown={handleKeyDown}
                    type="text"
                    placeholder="000000"
                    disabled={isLoading}
                  />
                </label>
                {errorMsg && (
                  <Text as="div" size="2" className="text-destructive">
                    {errorMsg}
                  </Text>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  style={{ opacity: isLoading || !isFormValid ? 0.6 : 1 }}
                  onClick={handleLogin}
                >
                  {isLoading ? "Logging in..." : t("login.title")}
                </Button>
              </>
            )}
            {oauthEnabled && (
              <Button
                onClick={startOAuthLogin}
                variant={passwordLoginEnabled ? "outline" : "default"}
                disabled={isLoading}
                type="button"
              >
                {t("login.login_with", {
                  provider:
                    publicInfo.oauth_provider === "generic"
                      ? "OAuth"
                      : publicInfo.oauth_provider
                      ? publicInfo.oauth_provider.charAt(0).toUpperCase() +
                        publicInfo.oauth_provider.slice(1)
                      : "",
                })}
              </Button>
            )}
          </Flex>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const LoginDialog = (props: LoginDialogProps) => {
  return (
    <AccountProvider>
      <LoginDialogContent {...props} />
    </AccountProvider>
  );
};

export default LoginDialog;
