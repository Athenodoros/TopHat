import produce from "immer";
import { cloneDeep, keys, mapValues, sortBy } from "lodash";
import { DataSlice, DataState, refreshCaches } from ".";
import { TopHatDispatch, TopHatStore } from "..";
import { ID } from "../shared/values";
import { DemoData } from "./demo/data";
import { DataKeys, StubUserID } from "./types";

test("State remains valid during transformations", () => {
    TopHatDispatch(DataSlice.actions.setUpDemo(DemoData));
    const { data } = TopHatStore.getState();
    validateStateIntegrity(data);

    // Update transaction
    TopHatDispatch(
        DataSlice.actions.updateTransactions([
            { id: data.transaction.ids[0], changes: { account: data.account.ids[0] as ID } },
            { id: data.transaction.ids[1], changes: { currency: data.account.ids[1] as ID } },
            { id: data.transaction.ids[2], changes: { currency: data.currency.ids[0] as ID } },
            { id: data.transaction.ids[3], changes: { currency: data.currency.ids[1] as ID } },
        ])
    );
    validateStateIntegrity(TopHatStore.getState().data);

    // Update transactions
    const currency = cloneDeep(data.currency.entities[data.user.entities[StubUserID]!.currency]!);
    currency.rates[0].value = 10;
    TopHatDispatch(DataSlice.actions.updateCurrencyRates([currency]));
    validateStateIntegrity(TopHatStore.getState().data);
});

const validateStateIntegrity = (state: DataState) => {
    // Check valid entity states
    expect(
        DataKeys.map((key) => [
            key,
            sortBy(
                state[key].ids.map((x) => "" + x),
                (x) => x
            ),
        ])
    ).toEqual(
        DataKeys.map((key) => [
            key,
            sortBy(
                keys(state[key].entities).map((x) => "" + x),
                (x) => x
            ),
        ])
    );

    // Check user IDs are correct
    expect(state.user.ids).toEqual([StubUserID]);

    // Check caches
    const refreshed = produce(state, (draft) => void refreshCaches(draft));
    expect(truncateForTesting(state)).toEqual(truncateForTesting(refreshed));
};

const truncateForTesting = <T>(value: T): T => {
    if (!value) return value;
    if (Array.isArray(value)) return value.map(truncateForTesting) as unknown as T;

    switch (typeof value) {
        case "object":
            return mapValues(value as any as object, truncateForTesting) as unknown as T;
        case "number":
            return (Math.round(value * 100) / 100) as unknown as T;
        default:
            return value;
    }
};
