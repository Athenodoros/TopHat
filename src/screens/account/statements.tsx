import { ChevronRight, Description, Edit, Payment } from "@mui/icons-material";
import { Button, IconButton, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Section } from "../../components/layout";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useAccountPageAccount } from "../../state/app/hooks";
import { Account, Statement } from "../../state/data";
import { useAllStatements } from "../../state/data/hooks";
import { ID } from "../../state/utilities/values";
import { Greys } from "../../styles/colours";

const useStyles = makeStyles({
    create: {
        color: Greys[700],
    },
    table: {
        display: "flex",
        flexDirection: "column",
        height: 220,
        overflowY: "auto",
    },
    statement: {
        display: "flex",
        alignItems: "center",
        height: 40,
        "&:not(:last-child)": {
            marginBottom: 18,
        },
    },
    icon: {
        color: Greys[100],
        background: Greys[600],
        borderRadius: "50%",
        padding: 7,
        marginRight: 10,
        height: 32,
        width: 32,
    },
    text: {
        flex: "1 1 0",
        width: 0,
        "& > *": {
            lineHeight: 1.2,
        },
    },
    actions: {
        display: "flex",
        marginLeft: 30,
        "& > :not(:last-child)": {
            marginRight: 10,
        },
    },
    action: {
        padding: 2,
    },
});
export const AccountStatementTable: React.FC = () => {
    const classes = useStyles();

    const account = useAccountPageAccount();
    const statements = useAllStatements().filter((statement) => statement.account === account.id);

    return (
        <Section
            title="Statements"
            headers={[
                <Button
                    size="small"
                    endIcon={<ChevronRight />}
                    className={classes.create}
                    onClick={openUploadStatementDialog(account)}
                    key="create"
                >
                    Add New
                </Button>,
            ]}
        >
            <div className={classes.table}>
                {statements.map((statement) => (
                    <div className={classes.statement} key={statement.id}>
                        <Description className={classes.icon} />
                        <div className={classes.text}>
                            <Typography variant="subtitle2" noWrap={true}>
                                {statement.name}
                            </Typography>
                            <Typography variant="caption" noWrap={true} component="p">
                                {statement.date}
                            </Typography>
                        </div>
                        <div className={classes.actions}>
                            <IconButton size="small" onClick={filterTableToStatement(statement.id)}>
                                <Payment className={classes.action} />
                            </IconButton>
                            <IconButton size="small" onClick={openEditStatementDialog(statement)}>
                                <Edit className={classes.action} />
                            </IconButton>
                        </div>
                    </div>
                ))}
            </div>
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
