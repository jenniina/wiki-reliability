import { useContext, useState, useEffect, useRef } from "react";
import { LanguageContext } from "../contexts/LanguageContext";
import { ELanguages, ELanguagesLong } from "../types";
import styles from "../app.module.css";

export default function SetLanguage() {
  const { language, setLanguage, t } = useContext(LanguageContext)!;
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = Object.values(ELanguages);

  const handleLanguageChange = (newLanguage: ELanguages) => {
    setLanguage(newLanguage);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      const options = dropdownRef.current?.querySelectorAll("button");
      switch (event.key) {
        case "Escape":
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault();
          // Focus first/last option when dropdown opens
          if (options && options.length > 0) {
            if (event.key === "ArrowDown") {
              (options[0] as HTMLElement).focus();
            } else {
              (options[options.length - 1] as HTMLElement).focus();
            }
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={styles["language-switcher"]}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={styles["language-switcher-button"]}
        aria-label={t("SelectLanguage")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles["language-switcher-icon"]}>🌐</span>
        <span className={styles["language-switcher-text"]}>
          {ELanguagesLong[language]}
        </span>
        <span className={styles["language-switcher-arrow"]}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={styles["language-switcher-dropdown"]}
          role="listbox"
          aria-label={t("SelectLanguage")}
        >
          <div className={styles["language-switcher-list"]}>
            {languages.map((lang, index) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`${styles["language-switcher-option"]} ${
                  language === lang
                    ? styles["language-switcher-option-active"]
                    : ""
                }`}
                role="option"
                aria-selected={language === lang}
                onKeyDown={(e) => {
                  const options =
                    dropdownRef.current?.querySelectorAll("button");
                  if (!options) return;

                  let nextIndex = index;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    nextIndex = (index + 1) % options.length;
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    nextIndex = (index - 1 + options.length) % options.length;
                  } else if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLanguageChange(lang);
                    return;
                  }

                  (options[nextIndex] as HTMLElement).focus();
                }}
              >
                <span className={styles["language-switcher-option-code"]}>
                  {lang.toUpperCase()}
                </span>
                <span className={styles["language-switcher-option-name"]}>
                  {ELanguagesLong[lang]}
                </span>
                {language === lang && (
                  <span className={styles["language-switcher-option-check"]}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className={styles["language-switcher-overlay"]}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
