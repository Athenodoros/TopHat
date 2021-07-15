import { useCallback } from "react";
import { useSelector as useSelectorRaw } from "react-redux";
import { TopHatState } from "..";
import { changeCurrencyValue } from "../data";
import { useCurrencyMap, useDefaultCurrency } from "../data/hooks";
import { ID } from "./values";

export const useSelector = useSelectorRaw as <T>(
    selector: (state: TopHatState) => T,
    equalityFn?: ((left: T, right: T) => boolean) | undefined
) => T;

export const useLocaliseCurrencies = () => {
    const userDefaultCurrency = useDefaultCurrency();
    const currencies = useCurrencyMap();
    return useCallback(
        (value: number, currency: ID) => changeCurrencyValue(userDefaultCurrency, currencies[currency]!, value),
        [userDefaultCurrency, currencies]
    );
};