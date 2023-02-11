import { Dictionary } from "@reduxjs/toolkit";
import { identity, last } from "lodash";
import { useCallback } from "react";
import { shallowEqual } from "react-redux";
import { formatNumber, NumberFormatConfig } from "../../shared/data";
import { useSelector } from "../shared/hooks";
import { ID } from "../shared/values";
import {
    Account,
    BasicObjectName,
    BasicObjectType,
    Category,
    Currency,
    Institution,
    Rule,
    Statement,
    StubUserID,
    User,
} from "./types";

export const useUserData = <T = User>(selector: (user: User) => T = identity, equality?: (t1: T, t2: T) => boolean) =>
    useSelector<T>((state) => selector(state.data.user.entities[StubUserID]!), equality);

export const useDefaultCurrency = () => useMaybeDefaultCurrency();
export const useMaybeDefaultCurrency = (currency?: ID) =>
    useSelector(
        ({ data }) => data.currency.entities[currency ?? data.user.entities[StubUserID]!.currency]!,
        shallowEqual
    );
export const useFormatValue = (config?: NumberFormatConfig, currency?: ID) => {
    const { symbol } = useMaybeDefaultCurrency(currency);
    return useCallback((value: number) => symbol + " " + formatNumber(value, config), [symbol, config]);
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
export const useAllCategories = (filter?: (category: Category) => boolean) =>
    useSelector((state) => {
        const results = state.data.category.ids.map((id) => state.data.category.entities[id]!);
        return filter ? results.filter(filter) : results;
    }, shallowEqual);

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

export function useRuleByID(id: ID): Rule;
export function useRuleByID(id: ID | undefined): Rule | undefined;
export function useRuleByID(id: ID | undefined): Rule | undefined {
    return useSelector((state) => state.data.rule.entities[id as ID]);
}

export const useAllStatements = (filter?: (statement: Statement) => boolean) =>
    useSelector((state) => {
        const results = state.data.statement.ids.map((id) => state.data.statement.entities[id]!);
        return filter ? results.filter(filter) : results;
    }, shallowEqual);

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
