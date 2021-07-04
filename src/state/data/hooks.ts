import { shallowEqual, useSelector } from "react-redux";
import { TopHatState } from "..";

export const useDefaultCurrency = () =>
    useSelector(({ data }: TopHatState) => data.currency.entities[data.user.currency]!, shallowEqual);

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
