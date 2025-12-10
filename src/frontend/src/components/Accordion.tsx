import {
  useState,
  useImperativeHandle,
  forwardRef,
  Ref,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import styles from "../app.module.css";
import { LanguageContext } from "../contexts/LanguageContext";

interface accordionProps {
  text: string | ReactNode;
  className: string;
  children?: ReactNode;
  isOpen?: boolean;
  setIsFormOpen?: (isFormOpen: boolean) => void;
  onClick?: () => void;
  id?: string;
  hideBrackets?: boolean;
  showButton?: boolean;
  tooltip?: string;
  y?: "above" | "below";
  x?: "left" | "right";
  wrapperClass: string;
  closeClass?: string;
}

const Accordion = forwardRef(
  (props: accordionProps, ref: Ref<unknown> | undefined) => {
    const { t } = useContext(LanguageContext)!;

    // Destructure props to avoid dependency warnings
    const { isOpen, setIsFormOpen, onClick } = props;

    // Use props.isOpen as the source of truth, with internal state for user interactions
    const [internalVisible, setInternalVisible] = useState<boolean | null>(
      null
    );
    const [isAnimating, setIsAnimating] = useState(false);

    // Determine actual visibility: use internal state if set, otherwise fall back to props
    const visible =
      internalVisible !== null ? internalVisible : isOpen || false;

    // Notify parent when visibility changes
    useEffect(() => {
      if (setIsFormOpen) {
        setIsFormOpen(visible);
      }
    }, [visible, setIsFormOpen]);

    // Trigger onClick when becoming visible
    useEffect(() => {
      if (visible && onClick) {
        onClick();
      }
    }, [visible, onClick]);

    const toggleVisibility = () => {
      if (visible) {
        setIsAnimating(true);
        setTimeout(() => {
          setInternalVisible(false);
          setIsAnimating(false);
        }, 300);
      } else {
        setIsAnimating(true);
        setInternalVisible(true);
        setTimeout(() => {
          setIsAnimating(false);
        });
      }
    };

    useImperativeHandle(ref, () => {
      return {
        toggleVisibility,
      };
    });

    const scrollToOpenBtn = () => {
      const anchors = document.querySelectorAll(`.${props.wrapperClass}`);
      if (anchors.length > 0) {
        let closestAnchor: Element | null = null;
        let closestDistance = Infinity;

        anchors.forEach((anchor) => {
          const rect = anchor.getBoundingClientRect();
          const distance = rect.top;

          if (distance < 0 && Math.abs(distance) < closestDistance) {
            closestAnchor = anchor;
            closestDistance = Math.abs(distance);
          }
        });

        if (closestAnchor) {
          (closestAnchor as Element).scrollIntoView({ behavior: "smooth" });
        }
      }
      toggleVisibility();
    };

    return (
      <div
        id={`${props.id ?? props.className}-container`}
        className={`${
          visible ? styles.open : `${styles.closed} ${props.closeClass}`
        } ${styles["accordion-container"]} ${props.wrapperClass}`}
      >
        <button
          type="button"
          className={`${props.tooltip ? styles["tooltip-wrap"] : ""} ${
            styles["accordion-btn"]
          } ${styles.open} ${
            visible
              ? styles["accordion-btn-hidden"]
              : styles["accordion-btn-visible"]
          }`}
          onClick={toggleVisibility}
        >
          <span
            aria-hidden="true"
            className={props.hideBrackets ? styles.hide : ""}
          >
            &raquo;&nbsp;
          </span>
          {props.text}
          <span
            aria-hidden="true"
            className={props.hideBrackets ? styles.hide : ""}
          >
            &nbsp;&laquo;
          </span>
          <strong
            className={
              props.tooltip
                ? `${styles.tooltip} ${styles.narrow2} ${
                    styles[props.x || ""]
                  } ${styles[props.y || ""]}`
                : ""
            }
          >
            {props.tooltip}
          </strong>
        </button>

        <div
          className={`${styles["accordion-inner"]} ${props.className} ${
            isAnimating ? styles.animating : ""
          } ${visible ? styles.open : styles.closed}`}
          // style={visible ? { display: 'block' } : { display: 'none' }}
        >
          <button
            type="button"
            className={`${styles["accordion-btn"]} ${styles.close}`}
            onClick={toggleVisibility}
          >
            <span className={styles["accordion-btn-span"]}>&laquo;</span>
            {t("Close")}
          </button>

          {props.children}

          {props.showButton && (
            <button
              type="button"
              className={`${styles["accordion-btn"]} ${styles.close}`}
              onClick={scrollToOpenBtn}
            >
              <span className={styles["accordion-btn-span"]}>&laquo;</span>
              {t("Close")}
            </button>
          )}
        </div>
      </div>
    );
  }
);

export default Accordion;
