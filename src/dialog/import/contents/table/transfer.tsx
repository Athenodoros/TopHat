import styled from "@emotion/styled";
import { ImportExport } from "@mui/icons-material";
import { Button, ButtonBase, Collapse, svgIconClasses, Typography } from "@mui/material";
import React, { useMemo } from "react";
import { withSuppressEvent } from "../../../../shared/events";
import { Transaction } from "../../../../state/data";
import { toggleStatementRowTransfer } from "../../../../state/logic/statement";
import { DIALOG_IMPORT_TABLE_ICON_BUTTON_STYLES } from "./shared";

export const DialogImportTableTransferDisplay: React.FC<{
    transfer: {
        transaction?: Transaction;
        excluded?: boolean;
    };
    disabled: boolean;
    transfers?: boolean;
    file: string;
    row: number;
}> = ({ disabled, transfer: { transaction, excluded }, transfers, file, row }) => {
    const onClick = useMemo(() => withSuppressEvent(() => toggleStatementRowTransfer(file, row)), [file, row]);
    if (!transaction) return null;

    return (
        <ContainerCollapse in={transfers}>
            <ButtonBase
                sx={{
                    ...ButtonBaseSx.transfer,
                    ...(disabled ? ButtonBaseSx.disabled : undefined),
                    ...(excluded ? ButtonBaseSx.excluded : undefined),
                }}
                onClick={onClick}
                disabled={disabled}
                component="div"
            >
                <TransferButton
                    size="small"
                    endIcon={<ImportExport />}
                    color={excluded || disabled ? "inherit" : undefined}
                    onClick={onClick}
                />
                <TextTypography variant="caption">{transaction.date}</TextTypography>
                <TextTypography variant="caption" noWrap={true}>
                    {transaction.summary || transaction.reference}
                </TextTypography>
                <TextTypography variant="caption" noWrap={true}>
                    {transaction.value}
                </TextTypography>
            </ButtonBase>
        </ContainerCollapse>
    );
};

const ContainerCollapse = styled(Collapse)({ gridColumnStart: "start", gridColumnEnd: "end" });
const ButtonBaseSx = {
    transfer: {
        display: "flex",
        alignItems: "center",
        marginBottom: 2,
        width: "max-content",
        padding: "0 5px",
        borderRadius: "2px",
        marginLeft: 28,
    },
    disabled: { opacity: 0.5 },
    excluded: { "&:not(:hover)": { opacity: 0.5 } },
};
const TransferButton = styled(Button)({
    ...DIALOG_IMPORT_TABLE_ICON_BUTTON_STYLES,
    minWidth: 14,

    [`& .${svgIconClasses.root}`]: {
        fontSize: "14px !important",
    },
});
const TextTypography = styled(Typography)({ marginLeft: 20, maxWidth: 200 });
