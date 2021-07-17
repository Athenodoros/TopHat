import { Greys } from "../../styles/colours";
import { BaseTransactionHistory } from "../utilities/values";
import { Category, Currency, Institution } from "./types";

export const PLACEHOLDER_CATEGORY_ID = 0;
export const PLACEHOLDER_CATEGORY: Category = {
    id: PLACEHOLDER_CATEGORY_ID,
    index: -1,
    name: "No Category",
    colour: Greys[600],
    transactions: BaseTransactionHistory(),
};

export const PLACEHOLDER_INSTITUTION_ID = 0;
export const PLACEHOLDER_INSTITUTION: Institution = { id: 0, index: -1, name: "No Institution", colour: Greys[600] };

export const changeCurrencyValue = (to: Currency, from: Currency, value: number) =>
    (value * from.exchangeRate) / to.exchangeRate;
