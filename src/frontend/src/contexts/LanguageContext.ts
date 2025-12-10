import { createContext } from "react";
import { ELanguages } from "../types";
import { TranslationKey } from "../translations";

export interface LanguageContextProps {
  language: ELanguages;
  setLanguage: (lang: ELanguages) => void;
  t: (key: TranslationKey) => string;
}

export const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined
);
