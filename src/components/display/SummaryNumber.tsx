import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { NBSP } from "../../shared/constants";
import { IconType } from "../../shared/types";
import { AppColours, Greys, Intents, WHITE } from "../../styles/colours";

const useStyles = makeStyles({
    summaryNumber: {
        display: "flex",
        width: 220,

        padding: "10px 0 20px 0",
        "&:last-child": {
            paddingBottom: 10,
        },
    },

    icon: {
        backgroundColor: Greys[600],
        width: 38,
        height: 38,
        padding: 9,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: WHITE,
        borderRadius: "50%",
        marginRight: 12,
    },

    numbers: {
        display: "flex",
    },
});

interface SummaryNumberProps {
    icon: IconType;
    primary: {
        value: string;
        positive: boolean | null;
    };
    secondary?: {
        value: string;
        positive: boolean;
    };
    subtext: string;
}
export const SummaryNumber: React.FC<SummaryNumberProps> = ({ icon: Icon, primary, secondary, subtext }) => {
    const classes = useStyles();

    return (
        <div className={classes.summaryNumber}>
            <Icon className={classes.icon} fontSize="small" />
            <div>
                <Typography
                    variant="h6"
                    style={{
                        color:
                            primary.positive === null
                                ? AppColours.summary.main
                                : Intents[primary.positive ? "success" : "danger"].main,
                        lineHeight: 1,
                    }}
                >
                    {primary.value}
                </Typography>
                <div className={classes.numbers}>
                    {secondary ? (
                        <Typography
                            variant="caption"
                            style={{
                                color: secondary.positive ? Intents.success.main : Intents.danger.main,
                                fontWeight: 500,
                            }}
                        >
                            {secondary.value + NBSP}
                        </Typography>
                    ) : undefined}
                    <Typography variant="caption" style={{ color: Greys[600] }}>
                        {subtext}
                    </Typography>
                </div>
            </div>
        </div>
    );
};
