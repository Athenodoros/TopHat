import { Dictionary } from "@reduxjs/toolkit";
import { last } from "lodash";
import numeral from "numeral";
import { useCallback } from "react";
import { shallowEqual } from "react-redux";
import { TopHatStore } from "..";
import { useSelector } from "../utilities/hooks";
import { ID } from "../utilities/values";
import { Account, BasicObjectName, BasicObjectType, Category, Currency, Institution, Statement } from "./types";

export const useDefaultCurrency = () =>
    useSelector(({ data }) => data.currency.entities[data.user.currency]!, shallowEqual);
export const useFormatValue = (format: string) => {
    const { symbol } = useDefaultCurrency();
    return useCallback((value: number) => symbol + " " + numeral(value).format(format), [symbol, format]);
};

export function useAccountByID(id: ID): Account;
export function useAccountByID(id: ID | undefined): Account | undefined;
export function useAccountByID(id: ID | undefined): Account | undefined {
    return useSelector((state) => state.data.account.entities[id as ID]);
}
export const useAccountIDs = () => useSelector((state) => state.data.account.ids);
export const useAccountMap = () => useSelector((state) => state.data.account.entities);
export const useAllAccounts = () =>
    useSelector((state) => state.data.account.ids.map((id) => state.data.account.entities[id]!), shallowEqual);

export function useCategoryByID(id: ID): Category;
export function useCategoryByID(id: ID | undefined): Category | undefined;
export function useCategoryByID(id: ID | undefined): Category | undefined {
    return useSelector((state) => state.data.category.entities[id as ID]);
}
export const useCategoryIDs = () => useSelector((state) => state.data.category.ids);
export const useCategoryMap = () => useSelector((state) => state.data.category.entities);
export const useAllCategories = () =>
    useSelector((state) => state.data.category.ids.map((id) => state.data.category.entities[id]!), shallowEqual);

export function useCurrencyByID(id: ID): Currency;
export function useCurrencyByID(id: ID | undefined): Currency | undefined;
export function useCurrencyByID(id: ID | undefined): Currency | undefined {
    return useSelector((state) => state.data.currency.entities[id as ID]);
}
export const useCurrencyMap = () => useSelector((state) => state.data.currency.entities);
export const useAllCurrencies = () =>
    useSelector((state) => state.data.currency.ids.map((id) => state.data.currency.entities[id]!), shallowEqual);

export function useInstitutionByID(id: ID): Institution;
export function useInstitutionByID(id: ID | undefined): Institution | undefined;
export function useInstitutionByID(id: ID | undefined): Institution | undefined {
    return useSelector((state) => state.data.institution.entities[id as ID]);
}
export const useInstitutionMap = () => useSelector((state) => state.data.institution.entities);
export const useAllInstitutions = () =>
    useSelector((state) => state.data.institution.ids.map((id) => state.data.institution.entities[id]!), shallowEqual);

export const useNotificationCount = () => useSelector((state) => state.data.notification.ids.length);
export const useAllNotifications = () =>
    useSelector(
        (state) => state.data.notification.ids.map((id) => state.data.notification.entities[id]!),
        shallowEqual
    );

export const useTransactionIDs = () => useSelector((state) => state.data.transaction.ids);
export const useTransactionMap = () => useSelector((state) => state.data.transaction.entities);
export const useTransactionByID = (id: ID) => useSelector((state) => state.data.transaction.entities[id]!);

export function useStatementByID(id: ID): Statement;
export function useStatementByID(id: ID | undefined): Statement | undefined;
export function useStatementByID(id: ID | undefined): Statement | undefined {
    return useSelector((state) => state.data.statement.entities[id as ID]);
}

export const useAllStatements = () =>
    useSelector((state) => state.data.statement.ids.map((id) => state.data.statement.entities[id]!), shallowEqual);

export function useObjectByID<Type extends BasicObjectName>(type: Type, id: ID): BasicObjectType[Type];
export function useObjectByID<Type extends BasicObjectName>(type: Type, id?: ID): BasicObjectType[Type] | undefined;
export function useObjectByID<Type extends BasicObjectName>(type: Type, id?: ID): BasicObjectType[Type] | undefined {
    return useSelector((state) => state.data[type].entities[id as ID] as BasicObjectType[Type] | undefined);
}

export const useAllRules = () =>
    useSelector((state) => state.data.rule.ids.map((id) => state.data.rule.entities[id]!), shallowEqual);

export const useObjectIDs = <T extends BasicObjectName>(type: T) => useSelector((state) => state.data[type].ids);
export const useObjectMap = <T extends BasicObjectName>(type: T) =>
    useSelector((state) => state.data[type].entities as Dictionary<BasicObjectType[T]>);
export const useAllObjects = <T extends BasicObjectName>(type: T) =>
    useSelector(
        (state) => state.data[type].ids.map((id) => state.data[type].entities[id]! as BasicObjectType[T]),
        shallowEqual
    );

export const useCategoryColour = (category: Category) => {
    const parent = last(category.hierarchy) || category.id;
    return useCategoryByID(parent).colour;
};
export const getCategoryColour = (id: ID, working?: Category) => {
    const { entities } = TopHatStore.getState().data.category;
    const { hierarchy } = working || entities[id]!;
    return hierarchy.length ? entities[last(hierarchy)!]!.colour : working?.colour || entities[id]!.colour;
};
