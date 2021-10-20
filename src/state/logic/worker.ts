import * as Comlink from "comlink";
import { IDatabaseChange, IUpdateChange } from "dexie-observable/api";
import { isEqual, keys, range, reverse, round, sortBy, toPairs, zipObject } from "lodash";
import { Category, changeCurrencyValue, Currency } from "../data";
import { PLACEHOLDER_STATEMENT_ID } from "../data/shared";
import { StubUserID } from "../data/types";
import {
    formatDate,
    getCurrentMonth,
    getCurrentMonthString,
    ID,
    parseDate,
    TransactionHistory,
    TransactionHistoryWithLocalisation,
} from "../shared/values";
import { TopHatDexie } from "./database";

export interface TopHatWorkerService {
    run: (persistent?: boolean) => Promise<void>;
}

let db: TopHatDexie;

export const TopHatWorker: TopHatWorkerService = {
    run: async (idb: boolean = true) => {
        if (idb) {
            db = new TopHatDexie();
        } else {
            db = new TopHatDexie({
                indexedDB: require("fake-indexeddb"),
                IDBKeyRange: require("fake-indexeddb/lib/FDBKeyRange"),
            });
        }

        await db.open();
        // attachIDBChangeHandler(db, handleIDBChanges);
    },
};

// Copied from Dexie's DatabaseChangeType
const ChangeType = {
    CREATE: 1,
    UPDATE: 2,
    DELETE: 3,
} as const;

const handleIDBChanges = async (changes: IDatabaseChange[]) => {
    const deletedStatements = changes
        .filter((change) => change.table === "statement" && change.type === ChangeType.DELETE)
        .map((change) => change.key);
    if (deletedStatements.length) {
        db.transaction_.where("statement").anyOf(deletedStatements).modify({ statement: PLACEHOLDER_STATEMENT_ID });
    }

    if (changes.some((change) => change.table === "rule" && change.type === ChangeType.DELETE)) {
        db.rule.toArray().then((rules) => {
            rules = sortBy(rules, (rule) => rule.index);
            rules.forEach((_, idx) => {
                rules[idx].index = idx;
            });
            db.rule.bulkPut(rules);
        });
    }

    // Deal with changed category hierarchies
    const categoryHierarchyUpdates = changes.filter(
        (change) =>
            change.table === "category" &&
            change.type === ChangeType.UPDATE &&
            !isEqual((change.oldObj as Category).hierarchy, (change.obj as Category).hierarchy)
    );
    if (categoryHierarchyUpdates.length) {
        const allCategories = await db.category.toArray();
        updateTransactionSummaryStartDates(allCategories);
        const categories = zipObject(
            allCategories.map(({ id }) => id),
            allCategories
        );

        categoryHierarchyUpdates.forEach((change) => {
            const original = (change as IUpdateChange).oldObj as Category;
            const update = allCategories[change.key];

            original.hierarchy.forEach((id) => {
                modifyTransactionHistory(original, categories[id], true);
            });
            update.hierarchy.forEach((id) => {
                modifyTransactionHistory(original, categories[id]);
            });
            allCategories
                .filter((category) => category.hierarchy.includes(change.key))
                .forEach((category) => {
                    category.hierarchy = category.hierarchy
                        .slice(0, category.hierarchy.indexOf(change.key) + 1)
                        .concat(update.hierarchy);
                });
        });

        await db.category.bulkPut(allCategories);
    }

    const currencyRateUpdates = changes.filter(
        (change) =>
            change.table === "currency" &&
            change.type === ChangeType.UPDATE &&
            !isEqual((change.oldObj as Currency).rates, (change.obj as Currency).rates)
    ) as IUpdateChange[];
    if (currencyRateUpdates.length) {
        const base = (await db.user.get(StubUserID).then((user) => db.currency.get(user!.currency))) as Currency;
        currencyRateUpdates.forEach((dbUpdate) => {
            const previous = dbUpdate.oldObj as Currency;
            const currency = dbUpdate.obj as Currency;

            db.account.toCollection().modify((account) =>
                toPairs(account.balances).forEach(([currencyID, balances]) => {
                    if (Number(currencyID) === currency.id) {
                        balances.original.forEach((balance, idx) => {
                            balances.localised[idx] = changeCurrencyValue(
                                base,
                                currency,
                                balance,
                                formatDate(parseDate(balances.start).plus({ months: idx }))
                            );
                        });
                    }
                })
            );

            // updateTransactionSummaries(
            //     db.transaction_.where("currency").equals(currency.id),
            //     true,
            //     previous.rates,
            // );
        });
    }

    // Deal with new/updated/deleted transactions
    //  Recalculate balances
    //  Update summaries without old values
    //  Update summaries with new value
};

// const updateTransactionSummaries = (transactions: Collection<Transaction, number>, remove?: boolean, rates?: CurrencyExchangeRate[]) => {

// }

const updateBalanceSummaries = (
    balances?: Record<ID, ID[]> // Account -> Currency
) => {};

const updateAccountTransactionDates = (accounts?: ID[]) =>
    (accounts ? db.account.where("id").anyOf(accounts) : db.account.toCollection()).modify(async (account) => {
        account.firstTransactionDate = (await db.transaction_.orderBy("date").first())?.date;
        account.lastTransactionDate = (await db.transaction_.orderBy("date").last())?.date;
    });

const fillTransactionBalances = (
    balances?: Record<ID, ID[]> // Account -> Currency
) =>
    db.transaction("rw", db.transaction_, async () => {
        if (!balances) {
            const accounts = await db.account.toArray();
            balances = zipObject(
                accounts.map(({ id }) => id),
                accounts.map(({ balances }) => keys(balances).map((x) => Number(x)))
            );
        }

        await Promise.all(
            toPairs(balances).map(async ([account, currencies]) => {
                let transactions = await db.transaction_
                    .where("[account+currency]")
                    .anyOf(currencies.map((currency) => [account, currency]))
                    .toArray();
                transactions = reverse(sortBy(transactions, ["date", "id"]));

                transactions.forEach((tx) => (tx.balance = null));

                let accumulator: { balance: number | null; previous: number } = { balance: null, previous: 0 };
                transactions.forEach((transaction) => {
                    let balance =
                        transaction?.recordedBalance !== null
                            ? transaction.recordedBalance
                            : accumulator.balance === null
                            ? null
                            : accumulator.balance - accumulator.previous;
                    if (balance !== null) balance = round(balance, 2);
                    if (transaction.balance !== balance) transaction.balance = balance;

                    accumulator = { balance, previous: transaction.value || 0 };
                });

                transactions.reverse();
                accumulator = { balance: 0, previous: 0 };
                transactions.forEach((transaction) => {
                    let balance: number | null;
                    if (transaction.balance !== null) {
                        balance = transaction.balance;
                    } else {
                        balance =
                            transaction?.balance !== null
                                ? transaction.balance
                                : accumulator.balance === null
                                ? null
                                : accumulator.balance + (transaction.value || 0);
                        if (balance !== null) balance = round(balance, 2);
                        if (transaction.balance !== balance) transaction.balance = balance;
                    }

                    accumulator = { balance, previous: transaction.value || 0 };
                });
            })
        );
    });

const modifyTransactionHistory = ({ transactions }: Category, parent: Category, subtract?: boolean) => {
    const flip = subtract ? -1 : 1;

    transactions.credits.forEach((credit, idx) => {
        parent.transactions.credits[idx] += credit * flip;
    });
    transactions.debits.forEach((debit, idx) => {
        parent.transactions.debits[idx] += debit * flip;
    });
    parent.transactions.count += transactions.count * flip;
};

const updateTransactionSummaryStartDates = (
    values: { transactions: TransactionHistory | TransactionHistoryWithLocalisation }[]
) => {
    values.forEach((value) => {
        const history = value.transactions;
        const difference = getCurrentMonth().diff(parseDate(history.start), "months").months;
        if (difference !== 0) {
            const extend = (values: number[]) =>
                range(difference)
                    .map((_) => 0)
                    .concat(values);

            history.start = getCurrentMonthString();
            history.credits = extend(history.credits);
            history.debits = extend(history.debits);

            if ("localCredits" in history) {
                history.localCredits = extend(history.localCredits);
                history.localDebits = extend(history.localDebits);
            }
        }
    });
};

Comlink.expose(TopHatWorker);
