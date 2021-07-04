import { makeStyles } from "@material-ui/core";
import { Greys, Intents, WHITE } from "../../styles/colours";
import { IconType } from "../../utilities/types";

const useStyles = makeStyles((theme) => ({
    summaryNumber: {
        display: "flex",
        width: 250,

        padding: "10px 0 30px 0",
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
}));

interface SummaryNumberProps {
    icon: IconType;
    primary: {
        value: string;
        positive: boolean;
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
                <h6 style={{ color: primary.positive ? Intents.success.main : Intents.danger.main }}>
                    {primary.value}
                </h6>
                <div className={classes.numbers}>
                    {secondary ? (
                        <p
                            style={{
                                color: secondary.positive ? Intents.success.main : Intents.danger.main,
                                fontWeight: 500,
                            }}
                        >
                            {secondary.value + "\u00A0"}
                        </p>
                    ) : undefined}
                    <p className="bp3-text-muted">{subtext}</p>
                </div>
            </div>
        </div>
    );
};
