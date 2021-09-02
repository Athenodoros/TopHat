import { cloneDeep, debounce, get, isEqual, keys, set, uniqBy, values } from "lodash";
import { TopHatDispatch, TopHatStore } from "../..";
import { AppSlice } from "../../app";
import { DialogFileState, DialogStatementMappingState, DialogStatementParseState } from "../../app/statementTypes";
import { ID } from "../../utilities/values";
import {
    getCombinedColumnProperties,
    getFileColumnProperties,
    getStatementExclusions,
    guessStatementColumnMapping,
    guessStatementTransfers,
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
            setStatementState({
                ...newState,
                exclude: getStatementExclusions(newState),
                transfers: guessStatementTransfers(newState),
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
    if (current.page !== "parse") return false; // Wrong page
    if (current.columns.common === undefined) return false; // Files don't have common columns
    if (values(current.columns.all).some((file) => file.matches === false)) return false; // Some files don't match

    // There must be a common non-null date column in each file
    return current.columns.common.some((column) => column.type === "date" && column.nullable === false);
};
export const goToStatementMappingScreen = () => {
    const current = getDialogState().import as DialogStatementParseState;
    if (!canGoToStatementMappingScreen(current)) return;

    const columns = current.columns as unknown as DialogColumnParseResult;
    const currency = (current.account && Number(keys(current.account.balances)[0])) || getDataState().user.currency;
    setStatementState({
        ...current,
        page: "mapping",
        columns,
        mapping: guessStatementColumnMapping(columns, currency),
    });
};

export const StatementMappingColumns = {
    date: "date",
    reference: "reference",
    balance: "balance",
    value: "value.value",
    credit: "value.credit",
    debit: "value.debit",
    currency: "currency.column",
} as const;
export const changeStatementMappingValue = (key: keyof typeof StatementMappingColumns, value: string | undefined) => {
    const state = getDialogState();
    if (state.id !== "import" || state.import.page !== "mapping") return;

    if (
        ["date", "currency"].includes(key) &&
        state.import.columns.common.find((column) => column.id === value)!.nullable === true
    )
        return;

    const current = cloneDeep(state.import.mapping);
    if (get(current, StatementMappingColumns[key]) === value) return;
    values(StatementMappingColumns).forEach(
        (column) => get(current, column) === value && set(current, column, undefined)
    );

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
    if (id !== "import" || state.page !== "mapping") return;

    setStatementState({
        ...state,
        mapping: {
            ...state.mapping,
            currency: { ...(state.mapping.currency as DialogColumnCurrencyColumnMapping), field },
        },
    });
};
export const changeStatementMappingFlipValue = (flip: boolean) => {
    const { id, import: state } = getDialogState();
    if (id !== "import" || state.page !== "mapping") return;

    setStatementState({ ...state, mapping: { ...state.mapping, value: { ...state.mapping.value, flip } } });
};

export const goToStatementImportScreen = () => {
    const current = getDialogState().import as DialogStatementMappingState;

    setStatementState({
        ...current,
        page: "import",
        exclude: getStatementExclusions(current),
        transfers: guessStatementTransfers(current),
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
