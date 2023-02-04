import { debounce } from "lodash";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatNumber } from "./data";
import { handleTextFieldChange } from "./events";

// export const useStateWithRef = <T>(initial: T) => {
//     const [state, setState] = useState(initial);
//     const ref = useRef(state);
//     useEffect(() => {
//         ref.current = state;
//     }, [state]);

//     return [ref, setState, state] as const;
// };

// export const useStateWithEqualityBuffer = <T>(initial: T, buffer: (t1: T, t2: T) => boolean = isEqual) => {
//     const [ref, setStateRaw, state] = useStateWithRef(initial);

//     const setState = useCallback(
//         (newState: T) => {
//             if (!buffer(newState, ref.current)) setStateRaw(newState);
//         },
//         [buffer, setStateRaw, ref]
//     );

//     return [state, setState] as const;
// };

export const useDivBoundingRect = <T extends Element = HTMLDivElement>(
    inputRef?: React.MutableRefObject<T> | React.LegacyRef<T>
) => {
    const [rect, setRect] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    const observer = useMemo(() => new ResizeObserver((entries) => setRect(entries[0].contentRect)), [setRect]);
    useEffect(() => () => observer.disconnect(), [observer]);

    const ref = useMemo<React.Ref<T>>(
        () => (node) => {
            if (node) {
                setRect(node.getBoundingClientRect());
                observer.observe(node);
            }

            if (inputRef) {
                if (typeof inputRef === "function") {
                    inputRef(node);
                } else {
                    (inputRef as React.MutableRefObject<T | null>).current = node;
                }
            }
        },
        [observer, setRect, inputRef]
    );

    return [rect, ref] as const;
};

export const usePopoverProps = <T extends Element = HTMLButtonElement>() => {
    const ref = useRef<T>(null);
    const [isOpen, setIsOpen] = useState(false);

    return {
        buttonProps: {
            ref: ref,
            onClick: useCallback(() => setIsOpen(true), [setIsOpen]),
        },
        popoverProps: {
            open: isOpen,
            anchorEl: ref.current,
            onClose: useCallback(() => setIsOpen(false), [setIsOpen]),
            anchorOrigin: {
                vertical: "bottom",
                horizontal: "center",
            } as const,
            transformOrigin: {
                vertical: "top",
                horizontal: "center",
            } as const,
        },
        setIsOpen,
    };
};

// eslint-disable-next-line react-hooks/exhaustive-deps
export const useFirstValue = <T>(value: T) => useMemo(() => value, []);

const NumberRegex = /^-?\d*\.?\d?\d?$/;
const FormatNumber = (value: number | null) => (value !== null ? formatNumber(value, { separator: "" }) : "");
export const useNumericInputHandler = (
    initial: number | null,
    onChange: (value: number | null) => void,
    id: any = ""
) => {
    const [text, setText] = useState(FormatNumber(initial));
    const { onTextChange, setValue } = useMemo(
        () => ({
            onTextChange: handleTextFieldChange((value) => {
                if (NumberRegex.test(value.replace(",", ""))) {
                    setText(value.replace(",", ""));
                    onChange(value.replace(",", "") === "" ? null : +value.replace(",", ""));
                }
            }),
            setValue: (value: number | null) => setText(FormatNumber(value)),
        }),
        [setText, onChange]
    );
    useEffect(() => {
        if (FormatNumber(initial) !== text) setText(FormatNumber(initial));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);
    return { text, setText, setValue, onTextChange };
};

export const useRefToValue = <T>(t: T) => {
    const ref = useRef(t);
    useEffect(() => {
        ref.current = t;
    }, [t]);
    return ref;
};

export const useDebounced = <Args extends Array<any>, Return>(fn: (...args: Args) => Return, wait: number = 0) =>
    useMemo(() => debounce(fn, wait), [fn, wait]);
