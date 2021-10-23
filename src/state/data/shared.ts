import { EntityId } from "@reduxjs/toolkit";
import chroma from "chroma-js";
import { chunk, countBy, last, max, maxBy, toPairs } from "lodash";
import { BLACK, Greys } from "../../styles/colours";
import { BaseTransactionHistory, getTodayString, SDate } from "../shared/values";
import { Category, Currency, Institution, Statement, StubUserID, Transaction, User } from "./types";

export const DEFAULT_USER_VALUE: User = {
    id: StubUserID,
    currency: 1,
    isDemo: false,
    tutorial: false,
    start: getTodayString(),
    alphavantage: "demo",

    disabled: [],
    milestone: 0,
    // milestoneInSight: 0,
    debt: 0,
    accountOutOfDate: [],
    uncategorisedTransactionsAlerted: false,
};

export const PLACEHOLDER_CATEGORY_ID = 0;
export const PLACEHOLDER_CATEGORY: Category = {
    id: PLACEHOLDER_CATEGORY_ID,
    name: "No Category",
    hierarchy: [],
    colour: Greys[500],
    transactions: BaseTransactionHistory(),
};
export const TRANSFER_CATEGORY_ID = -1;
export const TRANSFER_CATEGORY: Category = {
    id: TRANSFER_CATEGORY_ID,
    name: "Transfer",
    hierarchy: [],
    colour: Greys[500],
    transactions: BaseTransactionHistory(),
};

export const PLACEHOLDER_INSTITUTION_ID = 0;
export const PLACEHOLDER_INSTITUTION: Institution = {
    id: PLACEHOLDER_INSTITUTION_ID,
    name: "No Institution",
    colour: Greys[600],
};

export const PLACEHOLDER_STATEMENT_ID = 0;
export const PLACEHOLDER_STATEMENT: Statement = {
    id: PLACEHOLDER_STATEMENT_ID,
    name: "No Statement",
    contents: "",
    date: "",
    account: -1,
};

const getCurrencyValue = (currency: Currency, date: SDate) =>
    (currency.rates.find((rate) => rate.month <= date) || last(currency.rates))?.value || 1;

export const changeCurrencyValue = (to: Currency, from: Currency, value: number, date: SDate) =>
    (value * getCurrencyValue(from, date)) / getCurrencyValue(to, date);

export const compareTransactionsDescendingDates = (a: Transaction, b: Transaction) => -a.date.localeCompare(b.date);

export const getNextID = (ids: EntityId[]) => {
    const maximum = max(ids.map((i) => Number(i)));
    return (maximum ?? 0) + 1;
};

const coarse = (value: number, grain: number = 16) => Math.floor(value / grain) * grain;
export const getColourFromIcon = (icon: string, current?: string): Promise<string> => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return new Promise((resolve) => resolve(BLACK));

    return new Promise((resolve) => {
        if (!context) return resolve(BLACK);

        const image = new Image();
        image.onload = () => {
            context.drawImage(image, 0, 0);
            const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
            const colours = chunk(data, 4).map(([r, g, b]) => chroma(coarse(r), coarse(g), coarse(b)).hex());
            const mode = maxBy(
                toPairs(countBy(colours)).filter(
                    ([colour, _]) => colour !== "#000000" && colour !== "#FFFFFF" && colour !== current
                ),
                ([_, count]) => count
            );

            resolve(mode ? mode[0] : BLACK);
        };
        image.src = icon;
    });
};
