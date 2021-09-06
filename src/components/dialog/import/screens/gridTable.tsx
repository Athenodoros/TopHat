import { Button, Card, Checkbox, makeStyles, Menu, Typography } from "@material-ui/core";
import { ArrowDropDown, Event, Exposure, Filter1, Translate } from "@material-ui/icons";
import clsx from "clsx";
import { get, inRange, noop, toPairs, unzip, upperFirst } from "lodash";
import React from "react";
import { useDialogState } from "../../../../state/app/hooks";
import {
    DialogStatementImportState,
    DialogStatementMappingState,
    DialogStatementParseState,
} from "../../../../state/app/statementTypes";
import {
    ColumnProperties,
    flipStatementMappingFlipValue,
    StatementMappingColumns,
    toggleAllStatementExclusions,
    toggleStatementExclusion,
} from "../../../../state/logic/statement";
import { Greys } from "../../../../styles/colours";
import { usePopoverProps } from "../../../../utilities/hooks";

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

        "& > .MuiIconButton-root": {
            padding: 2,
        },
    },
    checkbox: {
        ...ROW_STYLES,
        display: "flex",
        justifyContent: "center",

        "& > .MuiIconButton-root": {
            padding: 2,
            transform: "scale(0.8)",
            transformOrigin: "center center",
        },
    },
    excluded: {
        color: Greys[500],
    },
    transfer: {
        gridColumnStart: "start",
        gridColumnEnd: "end",
    },
});
export const FileImportTableViewGrid: React.FC = () => {
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
                        <div className={classes.transfer} key={rowID + "_transfer"}>
                            <Checkbox
                                checked={!state.transfers[state.file][rowID]!.excluded}
                                onClick={noop}
                                size="small"
                                color="default"
                            />
                        </div>
                    ) : undefined,
                ])}
            </div>
        </Card>
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
        padding: 0,

        "& .MuiButton-endIcon": {
            marginLeft: "-1px !important",
        },
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
                >
                    {field ? upperFirst(field) : "(none)"}
                </Button>
                <Menu {...popover.popoverProps}></Menu>
                {field === "value" || field === "debit" ? (
                    <Button
                        size="small"
                        endIcon={<Exposure />}
                        color={mapping.value.flip ? "secondary" : undefined}
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
