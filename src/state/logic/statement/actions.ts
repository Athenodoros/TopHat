import {
    cloneDeep,
    debounce,
    escapeRegExp,
    get,
    isEqual,
    keys,
    max,
    min,
    pick,
    range,
    reverse,
    set,
    takeWhile,
    uniq,
    uniqBy,
    unzip,
    values,
    zipObject,
} from "lodash";
import { batch } from "react-redux";
import { TopHatDispatch, TopHatStore } from "../..";
import { updateListSelection } from "../../../utilities/data";
import { AppSlice, DefaultPages } from "../../app";
import { DialogFileState, DialogStatementMappingState, DialogStatementParseState } from "../../app/statementTypes";
import { DataSlice, Statement, Transaction } from "../../data";
import { getNextID, PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID } from "../../data/utilities";
import { getTodayString, ID, SDate } from "../../utilities/values";
import {
    getCombinedColumnProperties,
    getFileColumnProperties,
    getStatementExclusions,
    guessStatementColumnMapping,
    guessStatementTransfers,
    StatementMappingColumns,
} from "./parsing";
import {
    DialogColumnCurrencyColumnMapping,
    DialogColumnParseResult,
    DialogFileDescription,
    DialogParseSpecification,
} from "./types";

const setStatementState = (state: DialogFileState) =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "import", import: state }));
const getDialogState = () => TopHatStore.getState().app.dialog;
const getDataState = () => TopHatStore.getState().data;

// TODO: All of these should almost certainly just be async actions

export const removeAllStatementFiles = () => setStatementState({ page: "file", rejections: [] });
export const goBackToStatementParsing = () => {
    const dialog = getDialogState();
    if (dialog.id === "import" && dialog.import.page === "mapping")
        setStatementState({
            page: "parse",
            account: dialog.import.account,
            parse: dialog.import.parse,
            files: dialog.import.files,
            columns: {
                // TS gets confused unless this is broken out
                all: dialog.import.columns.all,
                common: dialog.import.columns.common,
            },
            file: dialog.import.file,
        });
};
export const goBackToStatementMapping = () => {
    const dialog = getDialogState();
    if (dialog.id === "import" && dialog.import.page === "import")
        setStatementState({ ...dialog.import, page: "mapping" });
};

export const changeFileSelection = (file: string) => {
    const dialog = getDialogState();
    if (dialog.id === "import" && dialog.import.page !== "file") setStatementState({ ...dialog.import, file });
};

export const addStatementFilesToDialog = (files: DialogFileDescription[]) => {
    const dialog = getDialogState();
    const data = getDataState();

    if (dialog.id === "import" && dialog.import.page === "parse") {
        const current = dialog.import;
        const newColumns = getCombinedColumnProperties(
            files.map(({ id, contents }) => ({ id, columns: getFileColumnProperties(contents, current.parse) })),
            current.columns.common
        ).columns.all;

        setStatementState({
            ...current,
            columns: {
                common: current.columns.common,
                all: { ...current.columns.all, ...newColumns },
            },
            files: current.files.concat(files),
        });
    } else {
        let account = dialog.import.account;
        if (account === undefined) {
            account = data.account.ids
                .map((id) => data.account.entities[id]!)
                .find(({ statementFilePattern, statementFilePatternManual }) => {
                    if (!(statementFilePatternManual || statementFilePattern)) return false;
                    const regex = new RegExp(statementFilePatternManual || statementFilePattern!);
                    return files.filter(({ name }) => regex.test(name)).length > files.length / 2;
                });
        }

        const parse: DialogParseSpecification = account?.lastStatementFormat?.parse || {
            header: uniqBy(files, (file) => file.contents.split("\n")[0]).length <= 1,
        };

        const { columns, allMatch } = getCombinedColumnProperties(
            files.map((file) => ({
                id: file.id,
                columns: getFileColumnProperties(file.contents, parse),
            }))
        );

        if (allMatch && account?.lastStatementFormat) {
            const newState = {
                page: "import" as const,
                account,
                parse,
                files,
                columns: columns as unknown as DialogColumnParseResult,
                file: files[0].id,
                mapping: account.lastStatementFormat.mapping,
            };
            const exclude = getStatementExclusions(newState);
            setStatementState({
                ...newState,
                exclude,
                transfers: guessStatementTransfers(newState, exclude),
            });
        } else {
            setStatementState({ page: "parse", account, parse, files, columns, file: files[0].id });
        }
    }
};

export const removeStatementFileFromDialog = (id: string) => {
    const dialog = getDialogState();

    if (dialog.id !== "import") return;

    const current = dialog.import as DialogStatementParseState;
    if (current.files.length === 1 && current.files[0].id === id) {
        setStatementState({ page: "file", account: current.account, rejections: [] });
    } else {
        const files = current.files.filter((file) => file.id !== id);
        setStatementState({
            ...current,
            files,
            columns: getCombinedColumnProperties(
                files.map((file) => ({
                    id: file.id,
                    columns: current.columns.all[file.id].columns,
                }))
            ).columns,
            file: current.file === id ? files[0].id : current.file,
        } as DialogStatementParseState);
    }
};

export const toggleStatementHasHeader = () =>
    changeStatementParsing({ header: !(getDialogState().import as DialogStatementParseState).parse.header });
export const changeStatementParsing = (parse: Partial<DialogParseSpecification>) => {
    const current = getDialogState().import as DialogStatementParseState;
    if (current.page !== "parse" || isEqual({ ...current.parse, ...parse }, current.parse)) return;

    setStatementState({ ...current, parse: { ...current.parse, ...parse } });
    recalculateStatementParsing();
};
const recalculateStatementParsing = debounce(() => {
    const current = getDialogState().import as DialogStatementParseState;
    if (current.page !== "parse") return;

    const { columns } = getCombinedColumnProperties(
        current.files.map((file) => ({
            id: file.id,
            columns: getFileColumnProperties(file.contents, current.parse),
        }))
    );
    setStatementState({ ...current, columns });
}, 500);

export const canGoToStatementMappingScreen = (current: DialogStatementParseState) => {
    if (current.page !== "parse") return "Wrong page";
    if (current.columns.common === undefined) return "There are files without matching columns";
    if (values(current.columns.all).some((file) => file.matches === false))
        return "There are files without matching columns";
    if (
        values(current.columns.all).some(
            (file) => !file.columns || uniqBy(file.columns, (column) => column.values.length).length !== 1
        )
    )
        return "There are files with mismatched column lengths";

    // There must be a common non-null date column in each file
    return current.columns.common.some((column) => column.type === "date" && column.nullable === false)
        ? null
        : "There is no valid date column";
};
export const goToStatementMappingScreen = () => {
    const current = getDialogState().import as DialogStatementParseState;
    if (canGoToStatementMappingScreen(current) !== null) return;

    const columns = current.columns as unknown as DialogColumnParseResult;
    const currency = (current.account && Number(keys(current.account.balances)[0])) || getDataState().user.currency;
    setStatementState({
        ...current,
        page: "mapping",
        columns,
        mapping: guessStatementColumnMapping(columns, currency),
    });
};

export const changeStatementMappingValue = (key: keyof typeof StatementMappingColumns, value: string | undefined) => {
    const state = getDialogState();
    if (state.id !== "import" || state.import.page !== "mapping") return;

    // Consistency checks, should be disallowed by UI
    if (
        ["date", "currency"].includes(key) &&
        state.import.columns.common.find((column) => column.id === value)!.nullable === true
    )
        return;

    const current = cloneDeep(state.import.mapping);
    if (value && get(current, StatementMappingColumns[key]) === value) return;
    values(StatementMappingColumns).forEach(
        (column) => get(current, column) === value && set(current, column, undefined)
    );

    if (
        value &&
        key === "date" &&
        state.import.mapping.currency.type === "column" &&
        state.import.mapping.currency.column === value
    )
        current.currency = { type: "constant", currency: getDataState().user.currency };

    if (["date", "reference", "balance"].includes(key)) {
        set(current, key, value);
    } else if (key === "value") {
        current.value =
            current.value.type === "value" ? { ...current.value, value } : { type: "value", value, flip: false };
    } else if (["credit", "debit"].includes(key)) {
        current.value =
            current.value.type === "split"
                ? { ...current.value, [key]: value }
                : { type: "split", [key]: value, flip: false };
    } else {
        current.currency = { type: "column", column: value!, field: "ticker" };
    }

    setStatementState({ ...state.import, mapping: current });
};
export const changeStatementMappingCurrencyField = (field: DialogColumnCurrencyColumnMapping["field"]) => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "mapping" || state.mapping.currency.type !== "column") return;

    setStatementState({
        ...state,
        mapping: {
            ...state.mapping,
            currency: { ...state.mapping.currency, field },
        },
    });
};
export const changeStatementMappingCurrencyValue = (currency: number) => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "mapping" || state.mapping.currency.type !== "constant") return;

    setStatementState({
        ...state,
        mapping: {
            ...state.mapping,
            currency: { ...state.mapping.currency, currency },
        },
    });
};
export const changeStatementMappingFlipValue = (flip: boolean) => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "mapping") return;

    setStatementState({ ...state, mapping: { ...state.mapping, value: { ...state.mapping.value, flip } } });
};
export const flipStatementMappingFlipValue = () => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "mapping") return;

    setStatementState({
        ...state,
        mapping: { ...state.mapping, value: { ...state.mapping.value, flip: !state.mapping.value.flip } },
    });
};
export const toggleStatementRowTransfer = (file: string, row: number) => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "import") return;

    const next = cloneDeep(state);
    next.transfers[file][row] = {
        transaction: state.transfers[file][row]?.transaction,
        excluded: !state.transfers[file][row]?.excluded,
    };

    setStatementState(next);
};

export const toggleStatementExclusion = (rowID: number) => () => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "import") return;

    const { file, exclude } = state;
    setStatementState({
        ...state,
        exclude: {
            ...exclude,
            [file]: updateListSelection(rowID, exclude[file]),
        },
    });
};
export const toggleAllStatementExclusions = () => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "import") return;

    const { file, exclude } = state;
    const rows = max(state.columns.all[file].columns!.map(({ values }) => values.length)) || 0;

    setStatementState({
        ...state,
        exclude: {
            ...exclude,
            [file]: exclude[file].length === 0 ? range(rows) : [],
        },
    });
};

const getFirstAvailableStringColumn = (state: DialogStatementMappingState) =>
    state.columns.common.find(
        (col) =>
            col.type === "string" &&
            values(StatementMappingColumns).every((path) => get(state.mapping, path) !== col.id)
    );
export const canChangeStatementMappingCurrencyType = () => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "mapping") return false;
    if (state.mapping.currency.type === "column") return true;

    return !!getFirstAvailableStringColumn(state);
};
export const changeStatementMappingCurrencyType = (isColumn: boolean) => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "mapping") return;

    setStatementState({
        ...state,
        mapping: {
            ...state.mapping,
            currency: isColumn
                ? {
                      type: "column",
                      field: "ticker",
                      column: getFirstAvailableStringColumn(state)!.id,
                  }
                : {
                      type: "constant",
                      currency: getDataState().user.currency,
                  },
        },
    });
};
export const goToStatementImportScreen = () => {
    const current = getDialogState().import as DialogStatementMappingState;
    const exclude = getStatementExclusions(current);

    setStatementState({
        ...current,
        page: "import",
        exclude,
        transfers: guessStatementTransfers(current, exclude),
    });
};

export const changeStatementDialogAccount = (id?: ID) => {
    const current = getDialogState().import;
    const account = TopHatStore.getState().data.account.entities[id!];

    if (
        current.page === "parse" &&
        current.columns.common === undefined &&
        account?.lastStatementFormat !== undefined &&
        !isEqual(current.parse, account.lastStatementFormat.parse)
    )
        return setStatementState({
            page: "parse",
            files: current.files,
            account,
            parse: account.lastStatementFormat.parse,
            columns: getCombinedColumnProperties(
                current.files.map((file) => ({
                    id: file.id,
                    columns: getFileColumnProperties(file.contents, account.lastStatementFormat!.parse),
                }))
            ).columns,
            file: current.file,
        });

    if (current.page === "import" && account)
        return setStatementState({ ...current, exclude: getStatementExclusions({ ...current, account }) });

    setStatementState({ ...current, account });
};

export const canImportStatementsAndClearDialog = () => {
    const state = getDialogState().import;
    if (state.page !== "import") return "Wrong page";
    if (state.account === undefined) return "No account selected";
    if (state.files.some(({ id }) => state.exclude[id].length === state.columns.all[id].columns![0].values.length))
        return state.files.length > 1
            ? "All files must have included transactions"
            : "No transactions included for import";

    return null;
};
export const importStatementsAndClearDialog = (shouldRunRules: boolean, shouldDetectTransfers: boolean) =>
    batch(() => {
        const state = getDialogState().import;
        const data = getDataState();
        if (state.page !== "import" || state.account === undefined || canImportStatementsAndClearDialog() !== null)
            return;

        // Create statement objects and add them
        const nextStatementID = getNextID(data.statement.ids);
        const statements: Statement[] = state.files.map((file, idx) => ({
            id: nextStatementID + idx,
            name: file.name,
            contents: file.contents,
            date: getTodayString(),
            account: state.account!.id,
        }));
        TopHatDispatch(DataSlice.actions.createSimpleObjects({ type: "statement", objects: statements }));

        // Create transaction objects
        let nextTransactionID = getNextID(data.transaction.ids);
        const flipValue = (value?: number) =>
            value !== undefined ? (state.mapping.value.flip ? -1 : 1) * value : undefined;
        const getColumnValue = <T extends number | string | undefined>(
            field: keyof typeof StatementMappingColumns,
            rowID: number,
            fileID: string
        ) => {
            const column = state.columns.all[fileID].columns?.find(
                ({ id }) => id === get(state.mapping, StatementMappingColumns[field])
            );
            return (column ? column.values[rowID] : undefined) as T;
        };
        const currencies = zipObject(
            data.currency.ids.map(
                (id) => data.currency.entities[id]![(state.mapping.currency as DialogColumnCurrencyColumnMapping).field]
            ),
            data.currency.ids as ID[]
        );

        const transferTransactionUpdates: ID[] = [];
        const transactions = state.files.flatMap(({ id: fileID }, fileIndex) =>
            ((state.columns.all[fileID].columns || [])[0].values as (string | null | null)[])
                .map((_, rowID) => rowID)
                .filter((rowID) => !state.exclude[fileID].includes(rowID))
                .map((rowID) => {
                    let category = PLACEHOLDER_CATEGORY_ID;
                    if (
                        shouldDetectTransfers &&
                        state.transfers[fileID][rowID]?.transaction &&
                        !state.transfers[fileID][rowID]!.excluded
                    ) {
                        category = TRANSFER_CATEGORY_ID;
                        transferTransactionUpdates.push(state.transfers[fileID][rowID]!.transaction!.id);
                    }

                    const transaction: Transaction = {
                        id: nextTransactionID,
                        account: state.account!.id,
                        statement: statements[fileIndex].id,
                        category,

                        summary: null,
                        description: null,
                        balance: null,

                        date: getColumnValue<SDate>("date", rowID, fileID),
                        reference: getColumnValue<string | undefined>("reference", rowID, fileID),
                        recordedBalance: getColumnValue<number | undefined>("balance", rowID, fileID) ?? null,
                        value:
                            flipValue(getColumnValue<number | undefined>("value", rowID, fileID)) ??
                            getColumnValue<number | undefined>("credit", rowID, fileID) ??
                            flipValue(getColumnValue<number | undefined>("debit", rowID, fileID)) ??
                            null,
                        currency:
                            state.mapping.currency.type === "constant"
                                ? state.mapping.currency.currency
                                : currencies[getColumnValue<string>("currency", rowID, fileID)],
                    };
                    nextTransactionID++;

                    return transaction;
                })
        );

        // Run import rules
        if (shouldRunRules) {
            data.rule.ids.forEach((id) => {
                const rule = data.rule.entities[id]!;
                if (rule.isInactive) return;

                const testReference = !rule.reference.length
                    ? (_: string) => true
                    : rule.regex
                    ? getTestRegex(rule.reference)
                    : (reference: string) => rule.reference.some((option) => reference.includes(option));

                transactions
                    .filter(({ category }) => category === PLACEHOLDER_CATEGORY_ID)
                    .forEach((transaction) => {
                        if (
                            (!rule.accounts.length || rule.accounts.includes(transaction.account)) &&
                            (rule.min === null || rule.min <= transaction.value!) &&
                            (rule.max === null || rule.max >= transaction.value!) &&
                            (!rule.reference.length || testReference(transaction.reference || ""))
                        ) {
                            if (rule.summary !== undefined) transaction.summary = rule.summary;
                            if (rule.description !== undefined) transaction.description = rule.description;
                            if (rule.category !== PLACEHOLDER_CATEGORY_ID) transaction.category = rule.category;
                        }
                    });
            });
        }

        // Add transactions to data store (Including category & balance updates)
        TopHatDispatch(DataSlice.actions.addNewTransactions({ transactions, transfers: transferTransactionUpdates }));

        // Update account statement fields
        TopHatDispatch(
            DataSlice.actions.updateAccount({
                id: state.account!.id,
                changes: {
                    statementFilePattern: combineStatementFileNamesToEstimateRegex(
                        statements
                            .map(({ name }) => name)
                            .concat(
                                values(data.statement.entities)
                                    .filter((statement) => statement!.account === state.account!.id)
                                    .map((statement) => statement!.name)
                            )
                    ),
                    lastStatementFormat: {
                        parse: state.parse,
                        columns: state.columns.common,
                        mapping: state.mapping,
                        date: max(transactions.map(({ date }) => date)) || getTodayString(),
                    },
                },
            })
        );

        // Close dialog and go to Transactions page with filter
        const page = TopHatStore.getState().app.page;
        TopHatDispatch(
            AppSlice.actions.closeDialogAndGoToPage({
                ...DefaultPages.transactions,
                ...(page.id === "transactions" ? pick(page, "chartSign", "chartAggregation") : {}),
                statement: statements.map(({ id }) => id),
            })
        );
    });

const NumberRegex = /\d/;
const LowerCharRegex = /[a-z]/;
const UpperCharRegex = /[A-Z]/;
const OverallCharRegex = /[a-zA-Z\d]/g;
const combineStatementFileNamesToEstimateRegex = (names: string[]) => {
    const start = takeWhile(unzip(names.map((name) => name.split(""))), (row) => uniq(row).length === 1)
        .map((row) => row[0])
        .join("");

    const end = reverse(
        takeWhile(
            unzip(names.map((name) => reverse(name.slice(start.length).split("")))),
            (row) => uniq(row).length === 1
        ).map((row) => row[0])
    ).join("");

    const middles = names.map((name) => name.slice(start.length, name.length - end.length));
    const minLength = min(middles.map((middle) => middle.length));
    const maxLength = max(middles.map((middle) => middle.length));
    const characters = `${middles.some((middle) => middle.match(NumberRegex)) ? "\\d" : ""}${
        middles.some((middle) => middle.match(LowerCharRegex)) ? "a-z" : ""
    }${middles.some((middle) => middle.match(UpperCharRegex)) ? "A-Z" : ""}${escapeRegExp(
        uniq(middles.flatMap((middle) => middle.replaceAll(OverallCharRegex, "").split(""))).join("")
    ).replace("-", "\\-")}`;

    const final = `${escapeRegExp(start)}[${characters}]{${minLength},${maxLength}}${escapeRegExp(end)}`;

    // Rough benchmark for adequate "specificity", to stop ".*"-style stub regexes being returned
    if (start.length + end.length > 5 || characters.length <= 3) return final;
};

const getTestRegex = (regexes: string[]) => {
    const master = new RegExp(regexes.join("|"));
    return (reference: string) => reference.match(master) !== null;
};
