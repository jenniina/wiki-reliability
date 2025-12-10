import { useState } from "react";
import styles from "../app.module.css";
import { InfoTipProps } from "../types";

/* Accessible info tip with keyboard support */
function InfoTip({ text, before, vertical, horizontal }: InfoTipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className={styles["tooltip-wrap"]}>
      <button
        type="button"
        className={`${styles["info-tip-btn"]} ${before ? styles.before : ""}`}
        aria-label={`Information: ${text}`}
        aria-expanded={isVisible}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          setIsVisible(!isVisible);
        }}
      >
        ?
      </button>
      <span
        className={`${styles.tooltip} ${styles.narrow} ${vertical ? styles[`${vertical}`] : styles.above} ${horizontal ? styles[`${horizontal}`] : styles.center} ${
          isVisible ? "" : styles.hide
        }`}
        role="tooltip"
        aria-hidden={!isVisible}
      >
        {text}
      </span>
    </span>
  );
}

export default InfoTip;
