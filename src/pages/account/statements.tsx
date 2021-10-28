import styled from "@emotion/styled";
import { ChevronRight, Description, Edit, FolderOpen, OpenInNew, Payment } from "@mui/icons-material";
import { Button, IconButton, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useCallback } from "react";
import { NonIdealState } from "../../components/display/NonIdealState";
import { Section } from "../../components/layout";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { DefaultDialogs } from "../../state/app/defaults";
import { useAccountPageAccount } from "../../state/app/hooks";
import { Account, Statement } from "../../state/data";
import { useAllStatements } from "../../state/data/hooks";
import { ID } from "../../state/shared/values";
import { Greys } from "../../styles/colours";

export const AccountStatementTable: React.FC = () => {
    const account = useAccountPageAccount();
    const statements = useAllStatements().filter((statement) => statement.account === account.id);

    const uploadStatementView = useCallback(
        () =>
            TopHatDispatch(
                AppSlice.actions.setDialogPartial({ id: "import", import: { ...DefaultDialogs.import, account } })
            ),
        [account]
    );

    if (statements.length === 0)
        return (
            <Section title="Budget" PaperSx={{ display: "flex", flexDirection: "column" }}>
                <NonIdealState
                    icon={FolderOpen}
                    title="No Statements Uploaded"
                    subtitle="This account has no statements imported - import files to start automatically tracking transactions"
                    action={
                        <Button onClick={uploadStatementView} startIcon={<OpenInNew />}>
                            Import Statement
                        </Button>
                    }
                />
            </Section>
        );

    return (
        <Section
            title="Statements"
            headers={
                <CreateButton
                    size="small"
                    endIcon={<ChevronRight />}
                    onClick={openUploadStatementDialog(account)}
                    key="create"
                >
                    Add New
                </CreateButton>
            }
        >
            <TableBox>
                {statements.map((statement) => (
                    <StatementBox key={statement.id}>
                        <DescriptionIcon />
                        <TextBox>
                            <Typography variant="subtitle2" noWrap={true}>
                                {statement.name}
                            </Typography>
                            <Typography variant="caption" noWrap={true} component="p">
                                {statement.date}
                            </Typography>
                        </TextBox>
                        <ActionsBox>
                            <IconButton size="small" onClick={filterTableToStatement(statement.id)}>
                                <PaymentIcon />
                            </IconButton>
                            <IconButton size="small" onClick={openEditStatementDialog(statement)}>
                                <EditIcon />
                            </IconButton>
                        </ActionsBox>
                    </StatementBox>
                ))}
            </TableBox>
        </Section>
    );
};

const openUploadStatementDialog = (account: Account) => () =>
    TopHatDispatch(
        AppSlice.actions.setDialogPartial({ id: "import", import: { page: "file", rejections: [], account } })
    );
const openEditStatementDialog = (statement: Statement) => () =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "statement", statement }));
const filterTableToStatement = (statement: ID) => () =>
    TopHatDispatch(AppSlice.actions.setAccountTableStatement(statement));

const CreateButton = styled(Button)({ color: Greys[700] });
const TableBox = styled(Box)({
    display: "flex",
    flexDirection: "column",
    height: 220,
    overflowY: "auto",
});
const StatementBox = styled(Box)({
    display: "flex",
    alignItems: "center",
    height: 40,
    "&:not(:last-child)": {
        marginBottom: 18,
    },
});
const DescriptionIcon = styled(Description)({
    color: Greys[100],
    background: Greys[600],
    borderRadius: "50%",
    padding: 7,
    marginRight: 10,
    height: 32,
    width: 32,
});
const TextBox = styled(Box)({
    flex: "1 1 0",
    width: 0,
    "& > *": {
        lineHeight: 1.2,
    },
});
const ActionsBox = styled(Box)({
    display: "flex",
    marginLeft: 30,
    "& > :not(:last-child)": {
        marginRight: 10,
    },
});
const PaymentIcon = styled(Payment)({ padding: 2 });
const EditIcon = styled(Edit)({ padding: 2 });
