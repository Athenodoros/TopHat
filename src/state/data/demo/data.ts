import chroma from "chroma-js";
import { random as randomInt, range, values } from "lodash";
import { DurationLike } from "luxon";
import { takeWithDefault, zipObject } from "../../../shared/data";
import {
    BaseTransactionHistory,
    BaseTransactionHistoryWithLocalisation,
    ID,
    SDate,
    formatDate,
    getCurrentMonthString,
    getToday,
    getTodayString,
    parseDate,
} from "../../shared/values";
import {
    DEFAULT_CURRENCY,
    DEFAULT_USER_VALUE,
    PLACEHOLDER_CATEGORY_ID,
    PLACEHOLDER_INSTITUTION_ID,
    PLACEHOLDER_STATEMENT_ID,
    TRANSFER_CATEGORY_ID,
    compareTransactionsDescendingDates,
} from "../shared";
import { Account, Category, Currency, CurrencySyncType, Institution, Rule, Statement, Transaction } from "../types";
import { ING_DIRECT_DEMO_ICON, NATWEST_DEMO_ICON, ST_GEORGE_DEMO_ICON, TRANSFERWISE_DEMO_ICON } from "./icons";

const today = getToday();

const random = (x: number, y: number) => randomInt(x * 100, y * 100) / 100;

type CurrencyArgs = [string, string, string, number, string, CurrencySyncType | undefined];
const currencyFields = ["symbol", "name", "ticker"] as const;
const makeCurrency = (args: CurrencyArgs, id: number) =>
    ({
        id: id + 2,
        transactions: BaseTransactionHistoryWithLocalisation(),
        start: getCurrentMonthString(),
        rates: [{ month: getCurrentMonthString(), value: args[3] }],
        sync: args[5],
        colour: args[4],
        ...zipObject(currencyFields, args),
    } as Currency);
const currencies = (
    [
        ["£", "Pounds Sterling", "GBP", 1.35, "#00B3A4"],
        ["€", "Euros", "EUR", 1.15, "#96622D", { type: "currency", ticker: "EUR" }],
        ["US$", "US Dollars", "USD", 1, "#DB2C6F", { type: "currency", ticker: "USD" }],
    ] as CurrencyArgs[]
).map(makeCurrency);

// currencies[1].rates.push({ date: formatDate(today.minus({ months: 8 })), value: 1.02 });
// currencies[1].rates.push({ date: formatDate(today.minus({ months: 12, days: 7 })), value: 0.78 });

let cateogryColourScale = chroma.scale("set1").domain([0, 6]);
const makeCategory = (
    { name, hierarchy, budgets }: { name: string; hierarchy?: ID[]; budgets?: Category["budgets"] },
    id: number
) =>
    ({
        id: id + 1,
        name,
        colour: cateogryColourScale(id).hex(),
        hierarchy: hierarchy || [],
        transactions: BaseTransactionHistory(),
        budgets,
    } as Category);
const start = getTodayString();
const getBaseBudget = (base: number, length: number = 28) => ({
    start,
    values: takeWithDefault(
        range(length).map((_) => base),
        Math.max(24, length),
        0
    ),
    strategy: "base" as const,
    base,
});
const categories = [
    { name: "Social", budgets: getBaseBudget(-700) }, // 1
    { name: "Groceries", budgets: getBaseBudget(-700) }, // 2
    { name: "Transport" }, // 3
    { name: "Travel" }, // 4
    {
        name: "Housing",
        budgets: {
            start,
            strategy: "base" as const,
            base: -560,
            values: range(18)
                .map((_) => -560)
                .concat(range(6).map((_) => -70)),
        },
    }, // 5
    { name: "Income" }, // 6
    { name: "Super", hierarchy: [6] }, // 7
    { name: "Salary", hierarchy: [6] }, // 8
    { name: "Trip to Europe", hierarchy: [4] }, // 9
    { name: "Trip to Melbourne", hierarchy: [4] }, // 10
    { name: "Mortgage Interest", hierarchy: [5] }, // 11
    { name: "Bills", hierarchy: [5] }, // 12
    { name: "Electricity Bill", hierarchy: [12, 5] }, // 13
    { name: "Gas Bill", hierarchy: [12, 5] }, // 14
    { name: "Internet", hierarchy: [12, 5] }, // 15
].map(makeCategory);

type InstitutionArgs = [string, string, string];
const makeInstitution = (args: InstitutionArgs, id: number) =>
    ({
        id: id + 1,
        name: args[0],
        icon: "data:image/jpeg;base64," + args[1],
        colour: args[2],
    } as Institution);
const rawInstitutions: InstitutionArgs[] = [
    ["ING Direct", ING_DIRECT_DEMO_ICON, "#f07000"],
    ["Natwest International", NATWEST_DEMO_ICON, "#401050"],
    ["Transferwise", TRANSFERWISE_DEMO_ICON, "#305070"],
    ["St. George", ST_GEORGE_DEMO_ICON, "#b0d050"],
];
const institutions = rawInstitutions.map(makeInstitution);

type AccountArgs = [
    string,
    boolean,
    Account["category"],
    number | undefined,
    string | undefined,
    string | undefined,
    Account["lastStatementFormat"]
];
const accountFields = [
    "name",
    "isInactive",
    "category",
    "institution",
    "website",
    "statementFilePattern",
    "lastStatementFormat",
] as const;
const makeAccount = (args: AccountArgs, id: number): Account =>
    ({
        id: id + 1,
        // colour: args[3] !== undefined ? rawInstitutions[args[3]][2] : greys[500],
        openDate: formatDate(today.minus({ months: 7 })),
        lastUpdate: formatDate(today),
        transactions: BaseTransactionHistory(),
        balances: {},
        ...zipObject(accountFields, args),
    } as Account);
const accounts = (
    [
        ["Orange Everyday", false, 1, 1, "https://www.ing.com.au/securebanking/", "Orange Everyday - .*.csv"],
        ["Super", false, 3, 1, "https://www.ing.com.au/securebanking/"],
        ["Transaction Account", false, 1, 2, "https://www.onlinebanking.natwestinternational.com/default.aspx"],
        ["Investment Account", false, 3, 2, "https://www.onlinebanking.natwestinternational.com/default.aspx"],
        [
            "International Account",
            false,
            1,
            3,
            "https://wise.com/user/account",
            "transactions.csv",
            {
                parse: { header: true },
                columns: [
                    { id: "0", name: "DAT", type: "date" },
                    { id: "1", name: "DES", type: "string" },
                    { id: "2", name: "VAL", type: "number" },
                    { id: "3", name: "CUR", type: "string" },
                ],
                mapping: {
                    date: "0",
                    reference: "1",
                    value: {
                        type: "value",
                        value: "2",
                        flip: false,
                    },
                    currency: {
                        type: "column",
                        column: "3",
                        field: "ticker",
                    },
                },
                date: formatDate(getToday().minus({ months: 8 })),
            } as Account["lastStatementFormat"],
        ],
        ["Transaction Account", false, 1, 4, "https://ibanking.stgeorge.com.au/ibank/loginPage.action"],
        ["Mortgage", false, 1, 4, "https://ibanking.stgeorge.com.au/ibank/loginPage.action", "Mortgage Statement.csv"],
        ["Apartment", false, 2, PLACEHOLDER_INSTITUTION_ID],
        ["Euro Account", false, 1, 2, "https://www.onlinebanking.natwestinternational.com/default.aspx"],
    ] as AccountArgs[]
).map(makeAccount);

const RuleDefaults = {
    regex: false,
    isInactive: false,
    accounts: [],
    category: PLACEHOLDER_CATEGORY_ID,
    min: null,
    max: null,
};
const makeRule = (input: Omit<Rule, keyof typeof RuleDefaults | "id" | "index"> & Partial<Rule>, id: number) => ({
    id: id + 1,
    index: id + 1,
    ...RuleDefaults,
    ...input,
});
const rules: Rule[] = [
    {
        name: "Weekly Shop",
        reference: ["WOOLWORTHS"],
        min: -200,
        max: 0,
        category: 2,
        descriptions: "Weekly shop - groceries, toiletries, and basic necessities",
    },
    { name: "State Transit", reference: ["State\\sTransit.*"], regex: true, category: 3 },
    { name: "Income", reference: ["SALARY-EMPLOYER-INC.", "SUPER-EMPLOYER-INC."], category: 6, isInactive: true },
    { name: "Travel", reference: [], accounts: [3, 5, 9], category: 4 },
].map(makeRule);

let id = 0;
const make = (
    diff: DurationLike,
    reference: string,
    account: ID,
    partial?: Partial<Omit<Transaction, "id" | "date" | "reference" | "account">>
): Transaction => ({
    id: ++id, // Increments first, so first ID is 1
    date: formatDate(today.minus(diff)),
    reference,
    summary: null,
    value: null,
    recordedBalance: null,
    balance: null,
    account,
    category: PLACEHOLDER_CATEGORY_ID,
    currency: DEFAULT_CURRENCY.id,
    description: null,
    statement: PLACEHOLDER_STATEMENT_ID,
    ...partial,
});
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
let transactions = [
    ...range(24).flatMap((i) => [
        make({ months: i, days: 8 }, "SALARY-EMPLOYER-INC.", 1, { value: i > 15 ? 3020 : 3680, category: 8 }),
        make({ months: i, days: 7 }, "SUPER-EMPLOYER-INC.", 2, { value: i > 15 ? 490 : 580, category: 7 }),
        make({ months: i, days: 7 }, "Super Contribution", 1, { value: -300, category: TRANSFER_CATEGORY_ID }),
        make({ months: i, days: 7 }, "Super Contribution", 2, { value: 300, category: TRANSFER_CATEGORY_ID }),
    ]),
    ...range(1, 730)
        .filter((i) => today.minus({ days: i }).toFormat("c") < "6" && i % 5 && i % 7)
        .map((days) =>
            make({ days }, `State Transit - ${today.minus({ days }).toISODate()}`, 1, { value: -4.8, category: 3 })
        ),
    ...range(104).map((i) =>
        make({ weeks: i, days: Number(today.toFormat("c")) }, "WOOLWORTHS", 1, {
            value: -random(80, 200),
            category: 2, // Groceries
            description: "Weekly shop - groceries, toiletries, and basic necessities",
        })
    ),
    ...range(1, 730)
        .filter((i) => i % 5 && i % 7 && i % 3 && i % 2)
        .map((i) =>
            make({ days: i }, descriptions[i % 7] + " " + types[i % 6], 1, {
                category: i > 30 ? 1 : PLACEHOLDER_CATEGORY_ID, // Social
                value: random(5, 80) * (i % 11 === 0 ? 1 : -1), // Proxy for getting paid back for previous time
            })
        ),
    ...range(1, 730)
        .map((i) => i + 9999)
        .filter((i) => i % 7 && i % 5 && i % 7 && i % 3 && i % 2)
        .map((i) =>
            make({ days: i - 9999 }, descriptions[i % 7] + " " + types[i % 6], 1, {
                value: -random(5, 80),
                category: 1, // Social
            })
        ),
    ...range(103)
        .filter((i) => i % 9 && i % 5)
        .map((i) =>
            make({ weeks: i, days: today.day + 2 }, "CINEMAXERS-FRI SPECIAL", 1, {
                value: -15,
                category: 1, // Social
                description: "Movie night with the school gang.",
            })
        ),
    ...range(18).map((i) =>
        make({ months: i, days: 8 }, "SYDNEY ELECTRIC", 1, {
            value: -20,
            category: 13,
        })
    ),
    ...range(18).map((i) =>
        make({ months: i, days: 8 }, "SYDNEY GAS", 1, {
            value: -7.8,
            category: 14,
        })
    ),
    ...range(24).map((i) =>
        make({ months: i, days: 10 }, "My Local ISP", 1, {
            value: -70,
            category: 15,
        })
    ),

    // Travel
    make({ months: 10, days: 5 }, "Transfer to GBP", 1, { value: -4500, category: TRANSFER_CATEGORY_ID }),
    make({ months: 10, days: 3 }, "Transfer to GBP", 3, {
        value: 2484.73,
        category: TRANSFER_CATEGORY_ID,
        currency: 2,
    }),
    make({ months: 10 }, "BRITISH-AIRWAYS-SYD-LHR", 3, { value: -1749.5, currency: 2, category: 9 }),
    make({ months: 9, days: 25 }, "London Hotels", 3, { value: -297, currency: 2, category: 9 }),

    make({ months: 8, days: 20 }, "Transfer to Transferwise", 1, { category: TRANSFER_CATEGORY_ID, value: -2000 }),
    make({ months: 8, days: 19 }, "Transfer to Transferwise", 5, { category: TRANSFER_CATEGORY_ID, value: 2000 }),
    make({ months: 8, days: 18 }, "Transfer to EUR", 5, { category: TRANSFER_CATEGORY_ID, value: -2000 }),
    make({ months: 8, days: 18 }, "Transfer to EUR", 5, {
        category: TRANSFER_CATEGORY_ID,
        value: 1207.61,
        currency: 3,
    }),
    make({ months: 8, days: 13 }, "*EUROSTAR", 5, { value: -150.0, category: 9, currency: 3 }),
    make({ months: 8, days: 10 }, "Paris Hotels", 5, { value: -500.0, category: 9, currency: 3 }),
    make({ months: 7, days: 8 }, "Chateau Rue de Gaul", 5, { value: -43.75, category: 9, currency: 3 }),
    make({ months: 7, days: 7 }, "Eiffel Tower Restaurant", 5, { value: -36.0, category: 9, currency: 3 }),
    make({ months: 7, days: 6 }, "RESTAURANT DE LA TOUR", 5, { value: -84.5, category: 9, currency: 3 }),
    make({ months: 7, days: 6 }, "Catacombes de Paris", 5, { value: -30.0, category: 9, currency: 3 }),
    make({ months: 7, days: 5 }, "VERY BRITISH LUNCHES", 3, { value: -45.6, category: 9, currency: 2 }),
    make({ months: 7, days: 5 }, "THE TOWER BAR", 3, { value: -14.9, category: 9, currency: 2 }),

    make({ months: 2, days: 15 }, "QANTAS AIRWAYS", 1, { value: -325.0, category: 10 }),
    make({ months: 2, days: 15 }, "YHA Melbourne", 1, { value: -150.0, category: 10 }),

    make({ months: 1, days: 11 }, "Load Euro Account", 5, { category: TRANSFER_CATEGORY_ID, value: -250, currency: 3 }),
    make({ months: 1, days: 10 }, "Load Euro Account", 9, { category: TRANSFER_CATEGORY_ID, value: 250, currency: 3 }),

    // Balances
    make({ months: 18, days: 17 }, "Balance Reading", 1, { recordedBalance: 11240.79 }),
    ...range(24).map((i) =>
        make({ months: i, days: 4 }, "SUPER VALUATION", 2, { recordedBalance: 53715.89 - random(750, 1250) * i })
    ),
    ...range(24).map((i) =>
        make({ months: i, days: today.day }, "Value Update", 4, {
            recordedBalance: 24311.25 - random(150, 25) * i,
            currency: 2,
        })
    ),

    // Mortgage
    make({ months: 18, days: 18 }, "Apartment Downpayment", 1, { category: TRANSFER_CATEGORY_ID, value: -100000 }),
    make({ months: 18, days: 18 }, "Apartment Downpayment", 6, { category: TRANSFER_CATEGORY_ID, value: 100000 }),

    make({ months: 18, days: 15 }, "Buy Apartment", 6, { category: TRANSFER_CATEGORY_ID, value: -100000 }),
    make({ months: 18, days: 15 }, "Buy Apartment", 7, { category: TRANSFER_CATEGORY_ID, value: -350000 }),
    make({ months: 18, days: 15 }, "Buy Apartment", 8, { category: TRANSFER_CATEGORY_ID, value: 450000 }),
    make({ months: 4, days: 25 }, "Apartment Valuation", 8, { recordedBalance: 460000.0 }),

    ...range(18).map((i) =>
        make({ months: i, days: 5 }, "Mortgage Transfer", 6, { value: 1712.76, category: TRANSFER_CATEGORY_ID })
    ),
    ...range(18).map((i) =>
        make({ months: i, days: 5 }, "Mortgage Transfer", 1, { value: -1712.76, category: TRANSFER_CATEGORY_ID })
    ),
    ...range(18).map((i) =>
        make({ months: i, days: 3 }, "Mortgage Payment", 7, { value: 1712.76, category: TRANSFER_CATEGORY_ID })
    ),
    ...range(18).map((i) =>
        make({ months: i, days: 3 }, "Mortgage Payment", 6, { value: -1712.76, category: TRANSFER_CATEGORY_ID })
    ),
    ...range(18).map((i) =>
        make({ months: i, days: 3 }, "Mortgage Interest", 7, {
            value: -466.87 * (1 - (0.06 / 18) * (17 - i)),
            category: 11,
        })
    ),
];
transactions.sort(compareTransactionsDescendingDates).reverse();

// Account -> Statement Date -> contents
const statementMap = {
    everyday: {} as Record<SDate, Statement>,
    international: [
        {
            id: 1,
            name: "transactions.csv",
            contents: "DAT\tDES\tVAL\tCUR\n",
            date: formatDate(getToday().minus({ months: 8 })),
            account: 5,
        },
        {
            id: 2,
            name: "transactions.csv",
            contents: "DAT\tDES\tVAL\tCUR\n",
            date: formatDate(getToday().minus({ month: 1 })),
            account: 5,
        },
    ],
    mortgage: {} as Record<SDate, Statement>,
};
let mortgageBalance = 0;
let statementID = 2;
let lastEverydayStatements = [-1, -1];
transactions.forEach((tx) => {
    // "Orange Everyday"
    if (tx.account === 1) {
        const date = formatDate(parseDate(tx.date).startOf("quarter"));
        if (statementMap.everyday[date] === undefined) {
            statementID++;
            statementMap.everyday[date] = {
                id: statementID,
                name: `Orange Everyday - ${date}.csv`,
                contents: "",
                date: formatDate(parseDate(tx.date).endOf("quarter")),
                account: 1,
            };
            lastEverydayStatements = [lastEverydayStatements[1], statementID];
        }

        tx.statement = statementMap.everyday[date].id;
        statementMap.everyday[date].contents += `${tx.date},${tx.reference},${tx.value}\n`;
    }

    // "Mortgage"
    if (tx.account === 7) {
        const date = formatDate(parseDate(tx.date).startOf("quarter"));
        if (statementMap.mortgage[date] === undefined) {
            statementID++;
            statementMap.mortgage[date] = {
                id: statementID,
                name: `Mortgage Statement.csv`,
                contents: "Transaction Date\tTransaction Value\tDescription\tBalance\n",
                date: formatDate(parseDate(tx.date).endOf("quarter")),
                account: 7,
            };
        }

        const balance = (mortgageBalance += tx.value!);
        tx.statement = statementMap.mortgage[date].id;
        statementMap.mortgage[date].contents += `${parseDate(tx.date).toFormat("dd/LLL/yyyy")}\t${tx.value}\t${
            tx.reference
        }\t${balance}\n`;
    }

    // "International Account"
    if (tx.account === 5) {
        const line = `${tx.date}\t${tx.reference}\t${tx.value}\t${
            [DEFAULT_CURRENCY].concat(currencies)[tx.currency - 1].ticker
        }\n`;
        if (formatDate(getToday().minus({ months: 8 })) > tx.date) {
            tx.statement = statementMap.international[0].id;
            statementMap.international[0].contents += line;
            statementMap.international[1].contents += line;
        } else {
            tx.statement = statementMap.international[1].id;
            statementMap.international[1].contents += line;
        }
    }
});
const statements = values(statementMap.everyday)
    // .filter(({ id }) => !lastEverydayStatements.includes(id))
    .concat([statementMap.international[0]])
    .concat(values(statementMap.mortgage));
transactions = transactions.filter(
    (tx) => tx.statement !== statementMap.international[1].id
    // && !lastEverydayStatements.includes(tx.statement)
);
// .concat(
//     values(statementMap.everyday).filter(({ id }) => lastEverydayStatements.includes(id))
// );

// Initialise Demo
const DemoObjects = {
    user: [{ ...DEFAULT_USER_VALUE, isDemo: true, generation: 4 }],
    account: accounts,
    institution: institutions,
    category: categories,
    currency: currencies,
    rule: rules,
    transaction: transactions,
    statement: statements,
    notification: [],
};

const DemoStatementFile = JSON.stringify(statementMap.international[1]);

export const DemoData = {
    demo: DemoObjects,
    download: DemoStatementFile,
};
