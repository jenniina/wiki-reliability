import styles from "../app.module.css";
import InfoTip from "./InfoTip";
import { SliderRowProps } from "../types";

/* Helppolukuinen liuku selitteillä molemmissa päissä ja InfoTipillä */
function SliderRow(props: SliderRowProps) {
  const {
    label,
    help,
    value,
    onChange,
    min = 0,
    max = 40,
    step = 5,
    leftNote,
    rightNote,
    suffix,
  } = props;
  return (
    <div className={styles["slider-row"]}>
      <div className={styles["slider-row-header"]}>
        <label className={styles["slider-row-label"]}>
          {label}
          <InfoTip text={help} />
        </label>
        {/* <div className={styles["slider-row-value-container"]}>
          <input
            aria-label={`${label} arvo`}
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className={styles["slider-row-input"]}
          />
          <span className={styles["slider-row-suffix"]}>
            {suffix ?? "pistettä"}
          </span>
        </div> */}
      </div>

      <div className={styles["slider-row-slider-container"]}>
        <small className={styles["slider-row-note"]}>{leftNote}</small>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className={styles["slider-row-slider"]}
        />
        <small className={styles["slider-row-note-right"]}>{rightNote}</small>
      </div>
    </div>
  );
}

export default SliderRow;
