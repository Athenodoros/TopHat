import { LegacyRef, useCallback, useEffect, useMemo, useRef, useState } from "react";

// export const useStateWithRef = <T>(initial: T) => {
//     const [state, setState] = useState(initial);
//     const ref = useRef(state);
//     useEffect(() => {
//         ref.current = state;
//     }, [state]);

//     return [ref, setState, state] as [React.MutableRefObject<T>, (t: T) => void, T];
// };

// export const useStateWithEqualityBuffer = <T>(initial: T, buffer: (t1: T, t2: T) => boolean = isEqual) => {
//     const [ref, setStateRaw, state] = useStateWithRef(initial);

//     const setState = useCallback(
//         (newState: T) => {
//             if (!buffer(newState, ref.current)) setStateRaw(newState);
//         },
//         [buffer, setStateRaw, ref]
//     );

//     return [state, setState] as [T, (t: T) => void];
// };

export const useDivBoundingRect = () => {
    const [rect, setRect] = useState<DOMRectReadOnly>(new DOMRectReadOnly(0, 0, 0, 0));

    const observer = useMemo(() => new ResizeObserver((entries) => setRect(entries[0].contentRect)), [setRect]);
    useEffect(() => () => observer.disconnect(), [observer]);

    const ref = useMemo<LegacyRef<HTMLDivElement>>(
        () => (node) => {
            if (node) {
                setRect(node.getBoundingClientRect());
                observer.observe(node);
            }
        },
        [observer, setRect]
    );

    return [rect, ref] as [DOMRectReadOnly, LegacyRef<HTMLDivElement>];
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
            getContentAnchorEl: null,
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
