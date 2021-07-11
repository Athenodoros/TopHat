import numeral from "numeral";
import { useCallback } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { TopHatState } from "..";
import { ID } from "../utilities/values";
import { Account, Institution } from "./types";

export const useDefaultCurrency = () =>
    useSelector(({ data }: TopHatState) => data.currency.entities[data.user.currency]!, shallowEqual);
export const useFormatValue = (format: string) => {
    const { symbol } = useDefaultCurrency();
    return useCallback((value: number) => symbol + " " + numeral(value).format(format), [symbol, format]);
};

export function useAccountByID(id: ID): Account;
export function useAccountByID(id: ID | undefined): Account | undefined;
export function useAccountByID(id: ID | undefined): Account | undefined {
    return useSelector((state: TopHatState) => state.data.account.entities[id as ID]);
}
export const useAccountIDs = () => useSelector((state: TopHatState) => state.data.account.ids);
export const useAccountMap = () => useSelector((state: TopHatState) => state.data.account.entities);
export const useAllAccounts = () =>
    useSelector(
        (state: TopHatState) => state.data.account.ids.map((id) => state.data.account.entities[id]!),
        shallowEqual
    );

export const useAllCategories = () =>
    useSelector(
        (state: TopHatState) => state.data.category.ids.map((id) => state.data.category.entities[id]!),
        shallowEqual
    );

export const useCurrencyMap = () => useSelector((state: TopHatState) => state.data.currency.entities);
export const useAllCurrencies = () =>
    useSelector(
        (state: TopHatState) => state.data.currency.ids.map((id) => state.data.currency.entities[id]!),
        shallowEqual
    );

export function useInstitutionByID(id: ID): Institution;
export function useInstitutionByID(id: ID | undefined): Institution | undefined;
export function useInstitutionByID(id: ID | undefined): Institution | undefined {
    return useSelector((state: TopHatState) => state.data.institution.entities[id as ID]);
}
export const useInstitutionMap = () => useSelector((state: TopHatState) => state.data.institution.entities);
export const useAllInstitutions = () =>
    useSelector(
        (state: TopHatState) => state.data.institution.ids.map((id) => state.data.institution.entities[id]!),
        shallowEqual
    );

export const useAllNotifications = () =>
    useSelector(
        (state: TopHatState) => state.data.notifications.ids.map((id) => state.data.notifications.entities[id]!),
        shallowEqual
    );
