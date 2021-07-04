import { LegacyRef, useEffect, useMemo, useState } from "react";

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
