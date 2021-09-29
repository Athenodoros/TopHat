import { ArrowDropDown, Event, Exposure, Filter1, ImportExport, Translate } from "@mui/icons-material";
import { Button, ButtonBase, Card, Checkbox, Collapse, Menu, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { get, inRange, toPairs, unzip, upperFirst } from "lodash";
import React, { useMemo } from "react";
import { withSuppressEvent } from "../../../shared/events";
import { usePopoverProps } from "../../../shared/hooks";
import { useDialogState } from "../../../state/app/hooks";
import {
    DialogStatementImportState,
    DialogStatementMappingState,
    DialogStatementParseState,
} from "../../../state/app/statementTypes";
import { Transaction } from "../../../state/data";
import {
    ColumnProperties,
    flipStatementMappingFlipValue,
    toggleAllStatementExclusions,
    toggleStatementExclusion,
    toggleStatementRowTransfer,
} from "../../../state/logic/statement";
import { StatementMappingColumns } from "../../../state/logic/statement/parsing";
import { Greys } from "../../../styles/colours";

const HEADER_STYLES = {
    background: Greys[200],
    borderBottom: "2px solid " + Greys[400],

    position: "sticky",
    top: 0,
    zIndex: 2,
} as const;
const ROW_STYLES = {
    borderTop: "1px solid " + Greys[300],
} as const;

const ICON_BUTTON_STYLES = {
    padding: 0,

    "& .MuiButton-endIcon": {
        marginLeft: "-1px !important",
    },
} as const;

const useStyles = makeStyles({
    container: {
        margin: "20px 20px 0 20px",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",
    },
    grid: {
        margin: "10px 15px",
        overflow: "auto",
        minHeight: 0,
        maxHeight: "100%",

        display: "grid",
        gridAutoRows: "min-content",
    },
    value: {
        maxWidth: 300,
        padding: "2px 20px 2px 10px",
        ...ROW_STYLES,
    },
    number: {
        textAlign: "right",
    },
    checkboxHeader: {
        ...HEADER_STYLES,
        display: "flex",
        justifyContent: "center",
        padding: "6px 0 22px 0",

        "& > .MuiButtonBase-root": {
            padding: 2,
        },
    },
    checkbox: {
        ...ROW_STYLES,
        display: "flex",
        justifyContent: "center",

        "& > .MuiButtonBase-root": {
            padding: 2,
            transform: "scale(0.8)",
            transformOrigin: "center center",
        },
    },
    excluded: {
        opacity: 0.5,
    },
    transfer: {
        gridColumnStart: "start",
        gridColumnEnd: "end",
    },
});
export const FileImportTableViewGrid: React.FC<{ transfers?: boolean }> = ({ transfers }) => {
    const classes = useStyles();

    const state = useDialogState("import") as
        | DialogStatementParseState
        | DialogStatementMappingState
        | DialogStatementImportState;

    const columns = state.columns.all[state.file].columns || [];

    const flipped =
        state.page === "parse" || !state.mapping.value.flip
            ? undefined
            : columns.findIndex(
                  ({ id }) =>
                      (state.mapping.value.type === "value" ? state.mapping.value.value : state.mapping.value.debit) ===
                      id
              );

    const rows = unzip(columns.map((column) => column.values as (string | number | null)[]));

    return (
        <Card variant="outlined" className={classes.container}>
            <div
                className={classes.grid}
                style={{
                    gridTemplateColumns: `[start] 26px [content] repeat(${columns.length}, minmax(min-content, 1fr)) [end]`,
                }}
            >
                <div className={classes.checkboxHeader}>
                    {state.page === "import" ? (
                        <Checkbox
                            checked={state.exclude[state.file].length !== rows.length}
                            onClick={toggleAllStatementExclusions}
                            indeterminate={inRange(state.exclude[state.file].length, 1, rows.length)}
                            size="small"
                            color="primary"
                        />
                    ) : undefined}
                </div>
                {columns.map((column) => (
                    <ColumnHeader column={column} state={state} key={column.id} />
                ))}
                {rows.map((row, rowID) => [
                    <div className={classes.checkbox} key={rowID}>
                        {state.page === "import" ? (
                            <Checkbox
                                checked={!state.exclude[state.file].includes(rowID)}
                                onClick={toggleStatementExclusion(rowID)}
                                size="small"
                                color="default"
                            />
                        ) : undefined}
                    </div>,
                    row.map((value, columnID) => (
                        <div key={rowID + "_" + columnID} className={classes.value}>
                            <Typography
                                variant="body2"
                                noWrap={true}
                                className={clsx({
                                    [classes.number]: columns[columnID]?.type === "number",
                                    [classes.excluded]:
                                        state.page === "import" && state.exclude[state.file].includes(rowID),
                                })}
                            >
                                {flipped === columnID ? -(value as number) : value}
                            </Typography>
                        </div>
                    )),
                    state.page === "import" && state.transfers[state.file][rowID]?.transaction ? (
                        <TransferTransactionDisplay
                            transfers={transfers}
                            disabled={state.exclude[state.file].includes(rowID)}
                            transfer={state.transfers[state.file][rowID]!}
                            file={state.file}
                            row={rowID}
                            key={rowID + "_transfer"}
                        />
                    ) : undefined,
                ])}
            </div>
        </Card>
    );
};

const useTransferStyles = makeStyles({
    container: {
        gridColumnStart: "start",
        gridColumnEnd: "end",
    },
    transfer: {
        display: "flex",
        alignItems: "center",
        marginBottom: 2,
        width: "max-content",
        padding: "0 5px",
        borderRadius: 2,
        marginLeft: 28,
    },
    disabled: { opacity: 0.5 },
    excluded: {
        "&:not(:hover)": { opacity: 0.5 },
    },
    button: {
        ...ICON_BUTTON_STYLES,
        minWidth: 14,

        "& .MuiSvgIcon-root": {
            fontSize: "14px !important",
        },
    },
    text: {
        marginLeft: 20,
        maxWidth: 200,
    },
});
const TransferTransactionDisplay: React.FC<{
    transfer: {
        transaction?: Transaction;
        excluded?: boolean;
    };
    disabled: boolean;
    transfers?: boolean;
    file: string;
    row: number;
}> = ({ disabled, transfer: { transaction, excluded }, transfers, file, row }) => {
    const classes = useTransferStyles();
    const onClick = useMemo(() => withSuppressEvent(() => toggleStatementRowTransfer(file, row)), [file, row]);
    if (!transaction) return null;

    return (
        <Collapse className={classes.container} in={transfers}>
            <ButtonBase
                className={clsx({
                    [classes.transfer]: true,
                    [classes.disabled]: disabled,
                    [classes.excluded]: excluded,
                })}
                onClick={onClick}
                disabled={disabled}
                component="div"
            >
                <Button
                    size="small"
                    endIcon={<ImportExport />}
                    color={excluded || disabled ? "inherit" : undefined}
                    className={classes.button}
                    onClick={onClick}
                />
                <Typography variant="caption" className={classes.text}>
                    {transaction.date}
                </Typography>
                <Typography variant="caption" className={classes.text} noWrap={true}>
                    {transaction.summary || transaction.reference}
                </Typography>
                <Typography variant="caption" className={classes.text}>
                    {transaction.value}
                </Typography>
            </ButtonBase>
        </Collapse>
    );
};

const useColumnHeaderStyles = makeStyles((theme) => ({
    header: {
        ...HEADER_STYLES,
        padding: "7px 20px 3px 10px",
    },
    title: {
        display: "flex",
        alignItems: "center",
        maxWidth: 300,

        "& > svg": {
            fontSize: 16,
            marginRight: 8,
            color: Greys[700],
        },
    },
    mapping: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",

        "& > button": {
            height: 20,
            paddingTop: 0,
            paddingBottom: 0,
            ...theme.typography.caption,

            "& .MuiButton-endIcon": {
                opacity: 0.6,
                marginTop: -2,
                marginLeft: 3,
            },
        },
    },
    empty: {
        color: Greys[600],
        fontStyle: "italic",
    },
    iconButton: {
        minWidth: 20,
        ...ICON_BUTTON_STYLES,
    },
    flipped: {
        "& .MuiButton-endIcon": {
            opacity: "1 !important",
        },
    },
}));
const ColumnHeader: React.FC<{
    column: ColumnProperties;
    state: DialogStatementParseState | DialogStatementMappingState | DialogStatementImportState;
}> = ({ column, state }) => {
    const classes = useColumnHeaderStyles();
    const popover = usePopoverProps();

    let subtitle: React.ReactNode = undefined;
    if (state.page !== "parse") {
        const { mapping } = state;
        const field = (toPairs(StatementMappingColumns).find(([_, path]) => get(mapping, path) === column.id) || [])[0];

        subtitle = (
            <div className={classes.mapping}>
                <Button
                    size="small"
                    endIcon={<ArrowDropDown />}
                    className={field ? undefined : classes.empty}
                    disabled={state.page !== "mapping"}
                    {...popover.buttonProps}
                    color="inherit"
                >
                    {field ? upperFirst(field) : "(none)"}
                </Button>
                <Menu {...popover.popoverProps}></Menu>
                {field === "value" || field === "debit" ? (
                    <Button
                        size="small"
                        endIcon={<Exposure />}
                        color={mapping.value.flip ? "error" : "inherit"}
                        className={clsx(classes.iconButton, mapping.value.flip && classes.flipped)}
                        disabled={state.page !== "mapping"}
                        onClick={flipStatementMappingFlipValue}
                    />
                ) : undefined}
            </div>
        );
    }

    return (
        <div className={classes.header} key={column.id}>
            <div className={classes.title}>
                {COLUMN_TYPE_ICONS[column.type]}
                <Typography variant="subtitle2" noWrap={true}>
                    {column.name}
                </Typography>
            </div>
            {subtitle}
        </div>
    );
};

const COLUMN_TYPE_ICONS = {
    date: <Event />,
    number: <Filter1 />,
    string: <Translate />,
};

// const COLUMN_TYPE_OPTIONS = {
//     date: []
// }
