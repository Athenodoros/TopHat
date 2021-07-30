import { IconButton, Link, makeStyles, Typography } from "@material-ui/core";
import { Edit, OpenInNew } from "@material-ui/icons";
import { max, min } from "lodash";
import { DateTime } from "luxon";
import { getInstitutionIcon } from "../../components/display/ObjectDisplay";
import { Section } from "../../components/layout";
import { useAccountPageAccount } from "../../state/app/hooks";
import { useInstitutionByID } from "../../state/data/hooks";
import { AccountTypeMap } from "../../state/data/types";
import { parseDate } from "../../state/utilities/values";
import { Greys } from "../../styles/colours";

const useStyles = makeStyles({
    container: {
        // height: 210,
        display: "flex",
        position: "relative",
        alignItems: "stretch",
        margin: -20,
        paddingBottom: 10,
        overflow: "hidden",
    },
    colour: {
        position: "absolute",
        opacity: 0.2,
        transform: "rotate(-60deg)",
        top: -80,
        left: -45,
        height: 260,
        width: 310,
        borderRadius: 50,
    },
    institution: {
        flexGrow: 1,
        padding: "25px 30px",
    },
    icon: {
        marginTop: 15,
        width: 80,
        height: 80,
        borderRadius: 5,
    },
    account: {
        flexGrow: 3,
    },
    accountMain: {
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "25px 25px 25px 0",
    },
    accountType: { color: Greys[600] },
    accountSecondary: {
        display: "flex",
        "& > div": {
            width: 220,
        },
    },
    missing: {
        color: Greys[500],
        fontStyle: "italic",
    },
    link: {
        display: "flex",
        alignItems: "center",
        width: "max-content",

        "& > *:first-child": {
            marginRight: 10,
        },
    },
});

export const AccountPageHeader: React.FC = () => {
    const classes = useStyles();
    const account = useAccountPageAccount();
    const institution = useInstitutionByID(account.institution);

    return (
        <Section>
            <div className={classes.container}>
                <div className={classes.colour} style={{ backgroundColor: institution.colour }} />
                <div className={classes.institution}>
                    <Typography variant="h4" noWrap={true}>
                        {institution.name}
                    </Typography>
                    {getInstitutionIcon(institution, classes.icon)}
                </div>
                <div className={classes.account}>
                    <div className={classes.accountMain}>
                        <div>
                            <Typography variant="h4">{account.name}</Typography>
                            <Typography variant="subtitle2" className={classes.accountType}>
                                {AccountTypeMap[account.category].name}
                            </Typography>
                        </div>
                        <div>
                            <IconButton>
                                <Edit />
                            </IconButton>
                        </div>
                    </div>
                    <div className={classes.accountSecondary}>
                        <div>
                            <Typography variant="h6">Open Date</Typography>
                            <Typography variant="body1">
                                {parseDate(min([account.openDate, account.firstTransactionDate])!).toLocaleString(
                                    DateTime.DATETIME_FULL
                                )}
                            </Typography>
                        </div>
                        <div>
                            <Typography variant="h6">
                                {account.isInactive ? "Inactive Since" : "Last Update"}
                            </Typography>
                            <Typography variant="body1">
                                {parseDate(max([account.lastUpdate, account.lastTransactionDate])!).toLocaleString(
                                    DateTime.DATETIME_FULL
                                )}
                            </Typography>
                        </div>
                        <div>
                            <Typography variant="h6">Website</Typography>
                            <Typography
                                variant="body1"
                                noWrap={true}
                                className={account.website ? undefined : classes.missing}
                            >
                                {account.website ? (
                                    <Link href={account.website} className={classes.link} target="_blank">
                                        <OpenInNew fontSize="small" />
                                        {getDomainFromURL(account.website)}
                                    </Link>
                                ) : (
                                    "No Website"
                                )}
                            </Typography>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
};

const DomainRegex = /(https?:\/\/)?(www\.)?([^/]+)/;
const getDomainFromURL = (url: string) => {
    const match = url.match(DomainRegex);
    return (match && match[3]) || url;
};
