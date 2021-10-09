import { dropRightWhile, identity, mapValues, mean, range, sum, sumBy, unzip, values } from "lodash";
import { TopHatStore } from "../../state";
import { Account, getDateBucket } from "../../state/data";
import { formatDate, getToday } from "../../state/shared/values";

const getAccountBalances = (account: Account) =>
    unzip(values(account.balances).map((balance) => balance.localised)).map((values) => sum(values.filter(identity)));
const getAccountBalance = (account: Account) => getAccountBalances(account)[0];
const getDataState = () => TopHatStore.getState().data;
const getAccounts = () => {
    const { account } = getDataState();
    return account.ids.map((id) => account.entities[id]!);
};
const sumAccounts = (getValue: (account: Account) => number) => sumBy(getAccounts(), getValue);
const sample = (values: number[]) => mean(range(1, 4).map((i) => values[i] || 0));

export const CalculatorEstimates = {
    constant: (value: number) => () => value,
    netWorth: () => sumAccounts(getAccountBalance),
    debt: () => {
        const debtAccounts = getAccounts().filter((account) => getAccountBalance(account) < 0);
        return -sumBy(debtAccounts, getAccountBalance);
    },
    repayments: () => {
        const repayments = range(12).map((_) => 0);
        const previous = formatDate(getToday().startOf("month").minus({ months: 1 }));

        const accounts = mapValues(getDataState().account.entities, (account) => getAccountBalances(account!));

        const transactions = getDataState().transaction.entities;
        for (let id of getDataState().transaction.ids) {
            const tx = transactions[id]!;
            const bucket = getDateBucket(tx.date, previous);
            if (bucket < 0) continue;
            if (bucket > 11) break;

            if (tx.value! > 0 && accounts[tx.account][bucket] < 0) {
                repayments[bucket] += tx.value!;
            }
        }

        return mean(dropRightWhile(repayments, (x) => !x)) || 0;
    },
    income: () => sumAccounts(({ transactions }) => sample(transactions.credits)),
    expenses: () => sumAccounts(({ transactions }) => -sample(transactions.debits)),
    savings: () => sumAccounts(({ transactions }) => sample(transactions.credits) + sample(transactions.debits)),
    interest: () => {
        // Estimate negative interest by looking at negative transactions in debt accounts in the previous 12 months
        // This works reasonably well for a cost-averaged rate on large loans (eg. mortgages)
        // When the transactions might actually be payments (eg. an overdrawn transaction account) this
        //     doesn't estimate the actual interest rate, but still produces a reasonable number for calculations
        let debtIncreasingTransactionTotal = 0;
        let negativeBalanceTotals = 0;
        getAccounts().forEach((account) => {
            const balances = getAccountBalances(account);
            const { debits } = account.transactions;

            range(1, 13).forEach((i) => {
                if (balances[i] < 0 && debits[i] !== undefined) {
                    debtIncreasingTransactionTotal += debits[i];
                    negativeBalanceTotals += balances[i];
                }
            });
        });
        return negativeBalanceTotals ? (debtIncreasingTransactionTotal / (negativeBalanceTotals / 12)) * 100 : 3;
    },
};
