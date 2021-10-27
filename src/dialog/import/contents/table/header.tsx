import styled from "@emotion/styled";
import { ArrowDropDown, Event, Exposure, Filter1, Translate } from "@mui/icons-material";
import { Button, Menu, Typography, useTheme } from "@mui/material";
import { Box } from "@mui/system";
import { get, toPairs, upperFirst } from "lodash";
import React from "react";
import { usePopoverProps } from "../../../../shared/hooks";
import {
    DialogStatementImportState,
    DialogStatementMappingState,
    DialogStatementParseState,
} from "../../../../state/app/statementTypes";
import { ColumnProperties, flipStatementMappingFlipValue } from "../../../../state/logic/statement";
import { StatementMappingColumns } from "../../../../state/logic/statement/parsing";
import { Greys } from "../../../../styles/colours";
import { DIALOG_IMPORT_TABLE_HEADER_STYLES, DIALOG_IMPORT_TABLE_ICON_BUTTON_STYLES } from "./shared";

export const DialogImportTableColumnHeader: React.FC<{
    column: ColumnProperties;
    state: DialogStatementParseState | DialogStatementMappingState | DialogStatementImportState;
}> = ({ column, state }) => {
    const theme = useTheme();
    const popover = usePopoverProps();

    let subtitle: React.ReactNode = undefined;
    if (state.page !== "parse") {
        const { mapping } = state;
        const field = (toPairs(StatementMappingColumns).find(([_, path]) => get(mapping, path) === column.id) || [])[0];

        subtitle = (
            <MappingBox>
                <Button
                    size="small"
                    endIcon={<ArrowDropDown />}
                    sx={{
                        ...theme.typography.caption,
                        ...(field ? undefined : EmptyButtonSx),
                    }}
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
                        sx={{
                            ...theme.typography.caption,
                            ...IconButtonSx,
                            ...(mapping.value.flip ? IconButtonFlippedSx : undefined),
                        }}
                        disabled={state.page !== "mapping"}
                        onClick={flipStatementMappingFlipValue}
                    />
                ) : undefined}
            </MappingBox>
        );
    }

    return (
        <HeaderBox key={column.id}>
            <TitleBox>
                {COLUMN_TYPE_ICONS[column.type]}
                <Typography variant="subtitle2" noWrap={true}>
                    {column.name}
                </Typography>
            </TitleBox>
            {subtitle}
        </HeaderBox>
    );
};

const COLUMN_TYPE_ICONS = {
    date: <Event />,
    number: <Filter1 />,
    string: <Translate />,
};

const HeaderBox = styled(Box)({
    ...DIALOG_IMPORT_TABLE_HEADER_STYLES,
    padding: "7px 20px 3px 10px",
});
const TitleBox = styled(Box)({
    display: "flex",
    alignItems: "center",
    maxWidth: 300,

    "& > svg": {
        fontSize: 16,
        marginRight: 8,
        color: Greys[700],
    },
});
const MappingBox = styled(Box)({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    "& > button": {
        height: 20,
        paddingTop: 0,
        paddingBottom: 0,
        // ...theme.typography.caption,

        "& .MuiButton-endIcon": {
            opacity: 0.6,
            marginTop: -2,
            marginLeft: 3,
        },
    },
});
const EmptyButtonSx = { color: Greys[600], fontStyle: "italic" };
const IconButtonSx = { minWidth: 20, ...DIALOG_IMPORT_TABLE_ICON_BUTTON_STYLES };
const IconButtonFlippedSx = { [`& .MuiButton-endIcon`]: { opacity: "1 !important" } };
