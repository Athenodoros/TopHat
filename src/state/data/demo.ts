import chroma from "chroma-js";
import { random as randomInt, range, zipObject } from "lodash";
import { DurationObject } from "luxon";
import { formatDate, getToday } from "../utilities/values";
import { Account, Category, Condition, Currency, Institution, Rule, Transaction } from "./types";

const today = getToday();
const lastUpdate = formatDate(today);

const random = (x: number, y: number) => randomInt(x * 100, y * 100) / 100;

const currencyColourScale = chroma.scale("set1").domain([0, 4]);
type CurrencyArgs = [string, string, number, string];
const currencyFields = ["symbol", "longName", "exchangeRate", "name"] as const;
const makeCurrency = (args: CurrencyArgs, id: number) =>
    ({
        id: id,
        index: id,
        colour: currencyColourScale(id + 1).hex(),
        transactions: {
            credits: [] as number[],
            debits: [] as number[],
        },
        ...zipObject(currencyFields, args),
    } as Currency);
const currencies = (
    [
        // ["AU$", "Australian Dollars", 0.5, "AUD"],
        ["£", "Pounds Sterling", 0.92, "GBP"],
        ["€", "Euros", 0.83, "EUR"],
        ["US$", "US Dollars", 0.73, "USD"],
    ] as CurrencyArgs[]
).map(makeCurrency);

let cateogryColourScale = chroma.scale("set1").domain([0, 6]);
const makeCategory = (name: string, id: number) =>
    ({
        id: id + 1,
        index: id,
        budget: 0,
        name,
        colour: cateogryColourScale(id).hex(),
        transactions: {
            credits: [] as number[],
            debits: [] as number[],
        },
    } as Category);
const categories = ["Social", "Groceries", "Transport", "Travel", "Mortgage", "Income"].map(makeCategory);

type InstitutionArgs = [string, string, string];
const makeInstitution = (args: InstitutionArgs, id: number) =>
    ({ id, index: id, ...zipObject(["name", "icon", "colour"], args) } as Institution);
const rawInstitutions: InstitutionArgs[] = [
    [
        "ING Direct",
        "https://lh3.googleusercontent.com/DHHUT-r31cBXY6UNNVbtUaoqctU_2wzMkaP1XrSRzKcZxNM5oRMRIr47jn_TcRnVxw",
        "#f26822",
    ],
    [
        "Natwest International",
        "https://lh3.googleusercontent.com/qSEKoBR98OwFvr5Dos-yGo7GObcV-WWLRvhje_dV0rfabAKz-h_WnFSb2pjMWCd4IA",
        "#c9282e",
    ],
    [
        "Transferwise",
        "https://lh3.googleusercontent.com/Ou6BVGWnEeNI0ylsrAbal3cCnWNXJX14HJDkuouoZRpqBWmfqJV5LOXHrNEQhYmQOyXa",
        "#37517e",
    ],
    [
        "St. George",
        "https://play-lh.googleusercontent.com/mapn6QYQnqu1bugpn5aCxxw-5CY4Wp-9Sc6Aq5IXhSukX_2z94Y5WHcWONvYKwFnMg",
        "#a9d153",
    ],
];
const institutions = rawInstitutions.map(makeInstitution);

type AccountArgs = [string, boolean, Account["category"], number | undefined];
const accountFields = ["name", "isActive", "category", "institution"] as const;
const makeAccount = (args: AccountArgs, id: number) =>
    ({
        id,
        index: id,
        // colour: args[3] !== undefined ? rawInstitutions[args[3]][2] : greys[500],
        lastUpdate,
        currencies: [] as number[],
        transactions: {
            credits: [] as number[],
            debits: [] as number[],
        },
        ...zipObject(accountFields, args),
    } as Account);
const accounts = (
    [
        ["Orange Everyday", true, 0, 0],
        ["Super", true, 2, 0],
        ["Transaction Account", true, 0, 1],
        ["Investment Account", true, 2, 1],
        ["International Account", true, 0, 2],
        ["Transaction Account", false, 0, 3],
        ["Mortgage", true, 0, 3],
        ["Apartment", true, 1, undefined],
    ] as AccountArgs[]
).map(makeAccount);

type RuleArgs = [string, Condition[], string | undefined, string | undefined, number | undefined];
const ruleFields = ["name", "conditions", "newSummary", "newDescription", "newCategory"];
const makeRule = (args: RuleArgs, id: number) =>
    ({ id, index: id, isActive: true, ...zipObject(ruleFields, args) } as Rule);
const rules = (
    [
        ["Weekly Shop", [{ type: "reference", values: ["WOOLWORTHS"], regex: false }], "Weekly Shop", undefined, 1],
        ["State Transit", [{ type: "reference", values: ["State\\sTransit.*"], regex: true }], undefined, undefined, 2],
        [
            "Income",
            [{ type: "reference", values: ["SALARY-EMPLOYER-INC.", "SUPER-EMPLOYER-INC."], regex: false }],
            undefined,
            undefined,
            5,
        ],
    ] as RuleArgs[]
).map(makeRule);

// const makeStatement = (date: DateTime) => "Everyday - " + date.startOf("month").toISODate().substring(0, 7) + ".csv";
// const statements: Statement[] = uniq(range(1, 730).map((i) => makeStatement(today.minus({ days: i })))).map(
//     (name, id) => ({ id, name })
// );
// const statementMap = zipObject(
//     statements.map(({ name }) => name),
//     statements.map(({ id }) => id)
// );

type TransactionArgs = [
    DurationObject,
    string | undefined,
    number,
    number,
    number,
    number | undefined,
    boolean | undefined,
    boolean | undefined,
    string | undefined,
    true | undefined
];
// ["days", "reference", "value", "account", "currency", "category", "transfer", "isBalance", "description", "statement"];
const makeTransaction = (args: TransactionArgs, id: number): Transaction => {
    const date = today.minus(args[0]);
    return {
        id,
        date: date.toISODate(),
        reference: args[1],
        transfer: !!args[6],
        [args[7] ? "recordedBalance" : "value"]: args[2],
        account: args[3],
        category: args[5] !== undefined ? args[5] + 1 : 0,
        currency: args[4],
        description: args[8],
        statement: args[9] || false, // && statementMap[makeStatement(date)],
    };
};
const descriptions = [
    "Larry's",
    "George Street",
    "Hotel",
    "The Final",
    "Elizabeth Street",
    "Underground",
    "The Parkside",
];
const types = ["Thai", "Italian", "Restaurant", "Bar", "Chinese", "Burgers"];
const transactions = (
    [
        // Regular Payments
        ...range(24).map((i) => [{ months: i, days: 8 }, "SALARY-EMPLOYER-INC.", i > 15 ? 3020 : 3680, 0, 0, 5]),
        ...range(24).map((i) => [{ months: i, days: 7 }, "SUPER-EMPLOYER-INC.", i > 15 ? 490 : 580, 1, 0, 5]),
        ...range(24).map((i) => [{ months: i, days: 7 }, "Super Contribution", -300, 0, 0, undefined, true]),
        ...range(24).map((i) => [{ months: i, days: 7 }, "Super Contribution", 300, 1, 0, undefined, true]),
        ...range(1, 730)
            .filter((i) => today.minus({ days: i }).toFormat("c") < "6" && i % 5 && i % 7)
            .map((i) => [
                { days: i },
                "State Transit - " + today.minus({ days: i }).toISODate(),
                -4.8,
                0,
                0,
                2,
                undefined,
                undefined,
                undefined,
                true,
            ]),
        ...range(104).map((i) => [
            { weeks: i, days: Number(today.toFormat("c")) },
            "WOOLWORTHS",
            -random(80, 200),
            0,
            0,
            1,
            false,
            false,
            "Weekly shop",
            true,
        ]),
        ...range(1, 730)
            .filter((i) => i % 5 && i % 7 && i % 3 && i % 2)
            .map((i) => [
                { days: i },
                descriptions[i % 7] + " " + types[i % 6],
                random(5, 80) * (i % 11 === 0 ? 1 : -1),
                0,
                0,
                i > 30 ? 0 : undefined,
                undefined,
                undefined,
                undefined,
                true,
            ]),
        ...range(1, 730)
            .map((i) => i + 9999)
            .filter((i) => i % 7 && i % 5 && i % 7 && i % 3 && i % 2)
            .map((i) => [
                { days: i - 9999 },
                descriptions[i % 7] + " " + types[i % 6],
                -random(5, 80),
                0,
                0,
                0,
                undefined,
                undefined,
                undefined,
                true,
            ]),
        ...range(103)
            .filter((i) => i % 9 && 1 % 5)
            .map((i) => [
                { weeks: i, days: today.day + 2 },
                "CINEMAXERS-FRI SPECIAL",
                -15,
                0,
                0,
                0,
                false,
                false,
                "Movie night with the school gang.",
                true,
            ]),

        // Travel
        [{ months: 10, days: 5 }, "Transfer to GBP", -4500, 0, 0, undefined, true],
        [{ months: 10, days: 3 }, "Transfer to GBP", 2484.73, 2, 1, undefined, true],
        [{ months: 10 }, "BRITISH-AIRWAYS-SYD-LHR", -1749.5, 2, 1, 3],
        [{ months: 9, days: 25 }, "London Hotels", -297, 2, 1, 3],

        [{ months: 8, days: 20 }, "Transfer to Transferwise", -1500, 0, 0, undefined, true],
        [{ months: 8, days: 19 }, "Transfer to Transferwise", 1500, 4, 0, undefined, true],
        [{ months: 8, days: 18 }, "Transfer to EUR", -1500, 4, 0, undefined, true],
        [{ months: 8, days: 18 }, "Transfer to EUR", 905.71, 4, 2, undefined, true],
        [{ months: 8, days: 13 }, "*EUROSTAR", -150.0, 4, 2, 3],
        [{ months: 8, days: 10 }, "Paris Hotels", -500.0, 4, 2, 3],
        [{ months: 7, days: 8 }, "Chateau Rue de Gaul", -43.75, 4, 2, 3],
        [{ months: 7, days: 7 }, "Eiffel Tower Restaurant", -36.0, 4, 2, 3],
        [{ months: 7, days: 6 }, "RESTAURANT DE LA TOUR", -84.5, 4, 2, 3],
        [{ months: 7, days: 6 }, "Catacombes de Paris", -30.0, 4, 2, 3],
        [{ months: 7, days: 5 }, "VERY BRITISH LUNCHES", -45.6, 2, 1, 3],
        [{ months: 7, days: 5 }, "THE TOWER BAR", -14.9, 2, 1, 3],

        [{ months: 2, days: 15 }, "QANTAS AIRWAYS", -325, 0, 0, 3],
        [{ months: 2, days: 15 }, "YHA Melbourne", -150, 0, 0, 3],

        // Balances
        [{ months: 18, days: 17 }, "Balance Reading", 11240.79, 0, 0, undefined, undefined, true],
        ...range(24).map((i) => [
            { months: i, days: 4 },
            "SUPER VALUATION",
            53715.89 - random(750, 1250) * i,
            1,
            0,
            undefined,
            false,
            true,
        ]),
        ...range(24).map((i) => [
            { months: i, days: today.day },
            "Value Update",
            24311.25 - random(150, 25) * i,
            3,
            1,
            undefined,
            false,
            true,
        ]),

        // Mortgage
        [{ months: 18, days: 18 }, "Apartment Downpayment", -100000, 0, 0, undefined, true],
        [{ months: 18, days: 18 }, "Apartment Downpayment", 100000, 5, 0, undefined, true],

        [{ months: 18, days: 15 }, "Buy Apartment", -100000, 5, 0, undefined, true],
        [{ months: 18, days: 15 }, "Buy Apartment", -350000, 6, 0, undefined, true],
        [{ months: 18, days: 15 }, "Buy Apartment", 450000, 7, 0, undefined, true],
        [{ months: 4, days: 25 }, "Apartment Valuation", 460000, 7, 0, undefined, undefined, true],

        ...range(18).map((i) => [{ months: i, days: 5 }, "Mortgage Transfer", -1712.76, 0, 0, undefined, true]),
        ...range(18).map((i) => [{ months: i, days: 5 }, "Mortgage Transfer", 1712.76, 5, 0, undefined, true]),
        ...range(18).map((i) => [{ months: i, days: 3 }, "Mortgage Payment", -1712.76, 5, 0, undefined, true]),
        ...range(18).map((i) => [{ months: i, days: 3 }, "Mortgage Payment", 1712.76, 6, 0, undefined, true]),
        ...range(18).map((i) => [
            { months: i, days: 3 },
            "Mortgage Interest",
            -466.87 * (1 - (0.06 / 18) * i),
            6,
            0,
            4,
        ]),
    ] as TransactionArgs[]
).map(makeTransaction);

// Initialise Demo
export const DemoObjects = {
    accounts,
    institutions,
    categories,
    currencies,
    rules,
    transactions,
};
