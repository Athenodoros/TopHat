import { range, rangeRight } from "lodash";
import { DataState } from "..";
import { DEMO_NOTIFICATION_ID } from "../../logic/notifications/types";
import { getTodayString } from "../../shared/values";

const start = getTodayString();
export const finishDemoInitialisation = (state: DataState, download: string) => {
    // Travel budget
    const travelCategory = state.category.entities[4]!;
    const travelBudget = -250;
    const travelBudgetHistory: number[] = [];
    rangeRight(24).forEach((idx) => {
        const previous = travelCategory.transactions.debits[idx + 1] || 0;
        const budget = travelBudget + (travelBudgetHistory[0] || 0) - previous;
        travelBudgetHistory[0] = previous;
        travelBudgetHistory.unshift(budget);
    });
    travelCategory.budgets = { start, values: travelBudgetHistory, strategy: "rollover", base: travelBudget };

    // Income budget
    const incomeCategory = state.category.entities[6]!;
    incomeCategory.budgets = {
        start,
        values: range(24).map(
            (i) => (incomeCategory.transactions.credits[i] || incomeCategory.transactions.credits[1]) - 10
        ),
        strategy: "copy",
        base: 0,
    };

    // This leads to too many notifications on startup
    // state.account.ids.forEach((id) => {
    //     const account = state.account.entities[id]!;
    //     account.lastUpdate = account.lastTransactionDate || getTodayString();
    //     if (account.openDate > account.lastUpdate) account.openDate = account.lastUpdate;
    // });

    state.notification.ids = [DEMO_NOTIFICATION_ID].concat(state.notification.ids as string[]);
    state.notification.entities[DEMO_NOTIFICATION_ID] = {
        id: DEMO_NOTIFICATION_ID,
        contents: download,
    };

    // Add some recordedBalances to demo
    state.transaction.ids.forEach((id) => {
        const tx = state.transaction.entities[id]!;

        // Transaction Account
        if (tx.account === 6) tx.recordedBalance = tx.balance;
    });
};
