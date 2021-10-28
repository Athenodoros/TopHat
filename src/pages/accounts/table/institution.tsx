import styled from "@emotion/styled";
import { AccountBalance } from "@mui/icons-material";
import { Avatar, Button, Card, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useCallback } from "react";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { PLACEHOLDER_INSTITUTION_ID } from "../../../state/data";
import { Greys } from "../../../styles/colours";
import { AccountTableEntry } from "./account";
import { AccountsInstitutionSummary } from "./data";
import { AccountsTableAccountsBox, AccountsTableIconSx, AccountsTableInstitutionBox } from "./styles";

const IconAvatar = styled(Avatar)(AccountsTableIconSx);

export const AccountsInstitutionDisplay: React.FC<{ institution: AccountsInstitutionSummary }> = ({ institution }) => {
    const onEditInstitution = useCallback(
        () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "institution", institution })),
        [institution]
    );

    return (
        <ContainerCard>
            <IconAvatar src={institution?.icon}>
                <AccountBalance style={{ height: "50%" }} />
            </IconAvatar>
            <AccountsTableInstitutionBox>
                <InstitutionNameTypography
                    variant="h5"
                    sx={institution.id === PLACEHOLDER_INSTITUTION_ID ? PlaceholderInstitutionNameSx : undefined}
                    noWrap={true}
                >
                    {institution.name}
                </InstitutionNameTypography>
                <InstitutionEditActionButton
                    size="small"
                    disabled={institution.id === PLACEHOLDER_INSTITUTION_ID}
                    color="inherit"
                    onClick={onEditInstitution}
                >
                    EDIT
                </InstitutionEditActionButton>
            </AccountsTableInstitutionBox>
            <InstitutionColourSquareBox sx={{ backgroundColor: institution.colour }} />
            <AccountsTableAccountsBox>
                {institution.accounts.map((account) => (
                    <AccountTableEntry account={account} key={account.id} />
                ))}
            </AccountsTableAccountsBox>
        </ContainerCard>
    );
};

const ContainerCard = styled(Card)({
    display: "flex",
    alignItems: "flex-start",
    position: "relative",
    marginTop: 27,
});
const InstitutionColourSquareBox = styled(Box)({
    position: "absolute",
    width: 320,
    height: 280,
    left: -37.66,
    top: -86.53,
    opacity: 0.1,
    borderRadius: "48px",
    transform: "rotate(-60deg)",
    pointerEvents: "none",
});
const InstitutionNameTypography = styled(Typography)({
    lineHeight: 1,
    marginTop: 2,
    width: "100%",
});
const PlaceholderInstitutionNameSx = {
    fontStyle: "italic",
    color: Greys[500],
};
const InstitutionEditActionButton = styled(Button)({
    color: Greys[600],
    height: 20,
    minWidth: 40,
    marginTop: 2,
    marginLeft: -5,
});
