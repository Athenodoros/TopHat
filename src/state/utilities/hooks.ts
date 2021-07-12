import { useSelector as useSelectorRaw } from "react-redux";
import { TopHatState } from "..";

export const useSelector = useSelectorRaw as <T>(
    selector: (state: TopHatState) => T,
    equalityFn?: ((left: T, right: T) => boolean) | undefined
) => T;
