import styled from "@emotion/styled";
import { buttonBaseClasses, Card, Checkbox, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { inRange, unzip } from "lodash";
import React from "react";
import { toggleAllStatementExclusions, toggleStatementExclusion } from "../../../../state/logic/statement";
import { useNonFileDialogStatementState } from "../shared";
import { DialogImportTableColumnHeader } from "./header";
import { DIALOG_IMPORT_TABLE_HEADER_STYLES, DIALOG_IMPORT_TABLE_ROW_STYLES } from "./shared";
import { DialogImportTableTransferDisplay } from "./transfer";

export const FileImportTableView: React.FC<{ transfers?: boolean }> = ({ transfers }) => {
    const state = useNonFileDialogStatementState();

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
        <ContainerCard variant="outlined">
            <GridBox
                style={{
                    gridTemplateColumns: `[start] 26px [content] repeat(${columns.length}, minmax(min-content, 1fr)) [end]`,
                }}
            >
                <CheckboxHeaderBox>
                    {state.page === "import" ? (
                        <Checkbox
                            checked={state.exclude[state.file].length !== rows.length}
                            onClick={toggleAllStatementExclusions}
                            indeterminate={inRange(state.exclude[state.file].length, 1, rows.length)}
                            size="small"
                            color="primary"
                        />
                    ) : undefined}
                </CheckboxHeaderBox>
                {columns.map((column) => (
                    <DialogImportTableColumnHeader column={column} state={state} key={column.id} />
                ))}
                {rows.map((row, rowID) => [
                    <CheckboxBox key={rowID}>
                        {state.page === "import" ? (
                            <Checkbox
                                checked={!state.exclude[state.file].includes(rowID)}
                                onClick={toggleStatementExclusion(rowID)}
                                size="small"
                                color="default"
                            />
                        ) : undefined}
                    </CheckboxBox>,
                    row.map((value, columnID) => (
                        <ValueBox key={rowID + "_" + columnID}>
                            <Typography
                                variant="body2"
                                noWrap={true}
                                sx={{
                                    ...(columns[columnID]?.type === "number" ? NumberDisplaySx : undefined),
                                    ...(state.page === "import" && state.exclude[state.file].includes(rowID)
                                        ? ExcludedDisplaySx
                                        : undefined),
                                }}
                            >
                                {flipped === columnID ? -(value as number) : value}
                            </Typography>
                        </ValueBox>
                    )),
                    state.page === "import" && state.transfers[state.file][rowID]?.transaction ? (
                        <DialogImportTableTransferDisplay
                            transfers={transfers}
                            disabled={state.exclude[state.file].includes(rowID)}
                            transfer={state.transfers[state.file][rowID]!}
                            file={state.file}
                            row={rowID}
                            key={rowID + "_transfer"}
                        />
                    ) : undefined,
                ])}
            </GridBox>
        </ContainerCard>
    );
};

const GridBox = styled(Box)({
    margin: "10px 15px",
    overflow: "auto",
    minHeight: 0,
    maxHeight: "100%",

    display: "grid",
    gridAutoRows: "min-content",
});
const CheckboxHeaderBox = styled(Box)({
    ...DIALOG_IMPORT_TABLE_HEADER_STYLES,
    display: "flex",
    justifyContent: "center",
    padding: "6px 0 22px 0",

    [`& > .${buttonBaseClasses.root}`]: {
        padding: 2,
    },
});
const ContainerCard = styled(Card)({
    margin: "20px 20px 0 20px",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
});
const CheckboxBox = styled(Box)({
    ...DIALOG_IMPORT_TABLE_ROW_STYLES,
    display: "flex",
    justifyContent: "center",

    [`& > .${buttonBaseClasses.root}`]: {
        padding: 2,
        transform: "scale(0.8)",
        transformOrigin: "center center",
    },
});
const ValueBox = styled(Box)({
    maxWidth: 300,
    padding: "2px 20px 2px 10px",
    ...DIALOG_IMPORT_TABLE_ROW_STYLES,
});
const NumberDisplaySx = { textAlign: "right" as const };
const ExcludedDisplaySx = { opacity: 0.5 };
