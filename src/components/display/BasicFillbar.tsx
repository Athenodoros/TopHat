import { lighten, makeStyles } from "@material-ui/core";
import { Greys } from "../../styles/colours";
import { BasicChartDomainSpec, getBasicChartPointData } from "./BasicBarChart";

const useStyles = makeStyles((theme) => ({
    container: {
        position: "relative",
        width: 300,
        height: 40,
        "& > *": {
            position: "absolute",
        },
    },
    outline: {
        top: 8,
        width: "100%",
        height: 24,
        border: "1px solid " + Greys[800],
        borderRadius: 12,
        overflow: "hidden",
    },
    filler: {
        position: "absolute",
        transition: theme.transitions.create("all"),
        height: "100%",
        opacity: 0.4,
    },
    value: {
        transition: theme.transitions.create("all"),
        width: 3,
        height: 40,
        marginLeft: -1.5,
    },
    secondary: {
        transition: theme.transitions.create("all"),
        top: 2,
        width: 1.5,
        height: 36,
        background: Greys[600],
        marginLeft: -0.75,
    },
}));

interface FillbarProps {
    value: number;
    secondary?: number;
    spec: BasicChartDomainSpec;
    success?: boolean | null;
}
export const BasicFillbar: React.FC<FillbarProps> = ({ value, secondary, spec, success }) => {
    const classes = useStyles();
    const { colour, offset, size, getValue } = getBasicChartPointData(value, spec, success);

    return (
        <div className={classes.container}>
            <div className={classes.outline}>
                <div
                    className={classes.filler}
                    style={{
                        background: lighten(colour.main, 0.4),
                        right: offset,
                        width: size,
                    }}
                />
            </div>
            <div
                className={classes.value}
                style={{
                    background: colour.main,
                    right: getValue(value),
                }}
            />
            {secondary !== undefined ? (
                <div
                    className={classes.secondary}
                    style={{
                        right: getValue(secondary),
                    }}
                />
            ) : undefined}
        </div>
    );
};
