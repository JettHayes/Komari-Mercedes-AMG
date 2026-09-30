import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import zh_CN from "./locales/zh_CN.json";
import zh_TW from "./locales/zh_TW.json";

// not adding the name field will hide the language from the language switcher menu
const resources = {
  en: {
    translation: en,
    name: "English",
  },
  "en-US": {
    translation: en,
  },
  "en-GB": {
    translation: en,
  },
  zh: {
    translation: zh_CN,
  },
  zh_CN: {
    translation: zh_CN,
  },
  "zh-CN": {
    translation: zh_CN,
    name: "简体中文",
  },
  "zh-SG": {
    translation: zh_CN,  // Singapore uses Simplified Chinese
  },
  "zh-TW": {
    translation: zh_TW,
    name: "繁體中文",
  },
  zh_TW: {
    translation: zh_TW,
  },
  "zh-HK": {
    translation: zh_TW,  // Hong Kong uses Traditional Chinese
  },
  "zh-MO": {
    translation: zh_TW,  // Macau uses Traditional Chinese
  },
};

const supportedLanguages = Object.keys(resources);

export function normalizeLanguage(language: string | null | undefined): string | undefined {
  if (!language) {
    return undefined;
  }

  let decodedLanguage = language;
  try {
    decodedLanguage = decodeURIComponent(language);
  } catch {
    decodedLanguage = language;
  }
  decodedLanguage = decodedLanguage.replace("_", "-");
  if (supportedLanguages.includes(decodedLanguage)) {
    return decodedLanguage;
  }

  const lowerLanguage = decodedLanguage.toLowerCase();
  const exactMatch = supportedLanguages.find((code) => code.toLowerCase() === lowerLanguage);
  if (exactMatch) {
    return exactMatch;
  }

  const baseLanguage = lowerLanguage.split("-")[0];
  if (baseLanguage === "zh") {
    return "zh-CN";
  }

  return supportedLanguages.find((code) => code.toLowerCase() === baseLanguage);
}

export const DEFAULT_LANGUAGE = "zh-CN";

export function detectClientLanguage(): string {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const queryLanguage = new URLSearchParams(window.location.search).get("lng");
  let managedOverrideLanguage: string | null = null;
  try {
    managedOverrideLanguage = window.localStorage?.getItem("komari-language") || null;
  } catch {
    managedOverrideLanguage = null;
  }

  // Explicit choice only; otherwise always Simplified Chinese.
  return (
    normalizeLanguage(queryLanguage) ||
    normalizeLanguage(managedOverrideLanguage) ||
    DEFAULT_LANGUAGE
  );
}

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    lng: DEFAULT_LANGUAGE,
    supportedLngs: supportedLanguages,
    load: "currentOnly",
    interpolation: {
      escapeValue: false, // React handles XSS
    },
    detection: {
      order: ["querystring", "localStorage", "cookie", "navigator", "htmlTag"],
      // ThemeContext persists explicit local choices in komari-language.
      caches: [],
    },
  });

export default i18next;
export { resources };
