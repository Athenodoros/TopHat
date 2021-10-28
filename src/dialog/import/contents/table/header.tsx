import styled from "@emotion/styled";
import { ArrowDropDown, Event, Exposure, Filter1, Translate } from "@mui/icons-material";
import { Button, buttonClasses, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { get, toPairs, upperFirst } from "lodash";
import React from "react";
import { usePopoverProps } from "../../../../shared/hooks";
import {
    DialogStatementImportState,
    DialogStatementMappingState,
    DialogStatementParseState,
} from "../../../../state/app/statementTypes";
import {
    changeStatementMappingValue,
    ColumnProperties,
    flipStatementMappingFlipValue,
    removeStatementMappingForColumn,
} from "../../../../state/logic/statement";
import { StatementMappingColumns } from "../../../../state/logic/statement/parsing";
import { Greys } from "../../../../styles/colours";
import { TopHatTheme } from "../../../../styles/theme";
import { DIALOG_IMPORT_TABLE_HEADER_STYLES, DIALOG_IMPORT_TABLE_ICON_BUTTON_STYLES } from "./shared";

export const DialogImportTableColumnHeader: React.FC<{
    column: ColumnProperties;
    state: DialogStatementParseState | DialogStatementMappingState | DialogStatementImportState;
}> = ({ column, state }) => {
    const popover = usePopoverProps();

    let subtitle: React.ReactNode = undefined;
    if (state.page !== "parse") {
        const { mapping } = state;
        const field = (toPairs(StatementMappingColumns).find(([_, path]) => get(mapping, path) === column.id) || [])[0];

        const options = getColumnOptions(column, state.mapping.value.type === "split");

        subtitle = (
            <MappingBox>
                <SubtitleButton
                    size="small"
                    endIcon={<ArrowDropDown />}
                    sx={field ? undefined : EmptyButtonSx}
                    disabled={state.page !== "mapping"}
                    {...popover.buttonProps}
                    color="inherit"
                >
                    {field ? upperFirst(field) : "(none)"}
                </SubtitleButton>
                <Menu {...popover.popoverProps}>
                    <PlaceholderOptionMenuItem
                        dense={true}
                        selected={field === undefined}
                        disabled={field === "date"}
                        onClick={() => removeStatementMappingForColumn(column.id)}
                    >
                        <ListItemText>(None)</ListItemText>
                    </PlaceholderOptionMenuItem>
                    {options.map((option) => (
                        <MappingOptionMenuItem
                            key={option}
                            dense={true}
                            selected={option === field}
                            onClick={() => {
                                changeStatementMappingValue(option, column.id);
                                popover.setIsOpen(false);
                            }}
                        >
                            <ListItemText>{upperFirst(option)}</ListItemText>
                        </MappingOptionMenuItem>
                    ))}
                </Menu>
                {field === "value" || field === "debit" ? (
                    <SubtitleIconButton
                        size="small"
                        endIcon={<Exposure />}
                        color={mapping.value.flip ? "error" : "inherit"}
                        sx={mapping.value.flip ? IconButtonFlippedSx : undefined}
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

const getColumnOptions = (column: ColumnProperties, splitValues: boolean): (keyof typeof StatementMappingColumns)[] => {
    if (column.type === "date") return column.nullable === false ? ["date"] : [];
    if (column.type === "number")
        return ["balance"].concat(
            splitValues ? ["credit", "debit"] : ["value"]
        ) as (keyof typeof StatementMappingColumns)[];
    return column.nullable === false ? ["currency", "reference"] : ["reference"];
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

        [`& .${buttonClasses.endIcon}`]: {
            opacity: 0.6,
            marginTop: -2,
            marginLeft: 3,
        },
    },
});
const SubtitleButton = styled(Button)(TopHatTheme.typography.caption as any);
const EmptyButtonSx = { color: Greys[600], fontStyle: "italic" };
const SubtitleIconButton = styled(SubtitleButton)({ minWidth: 20, ...DIALOG_IMPORT_TABLE_ICON_BUTTON_STYLES });
const IconButtonFlippedSx = { [`& .${buttonClasses.endIcon}`]: { opacity: "1 !important" } };
const MappingOptionMenuItem = styled(MenuItem)({ paddingLeft: 20, paddingRight: 30 });
const PlaceholderOptionMenuItem = styled(MappingOptionMenuItem)({ color: Greys[600], fontStyle: "italic" });
