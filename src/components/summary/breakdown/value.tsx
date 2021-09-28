import { ButtonBase, Typography } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import clsx from "clsx";
import { identity } from "lodash";
import numeral from "numeral";
import React, { useCallback } from "react";
import { Greys } from "../../../styles/colours";
import { suppressEvent } from "../../../utilities/events";
import { fadeSolidColour } from "../../display/ObjectDisplay";

const useValueStyles = makeStyles({
    container: {
        display: "flex",
        padding: "2px 5px 0 5px",
        margin: "5px 0 0 0",
        alignItems: "flex-start",

        "&:first-child": {
            marginTop: 0,
        },
    },
    nonTitleContainer: {
        padding: "5px 5px 0 5px",
        cursor: "pointer",
        borderRadius: 8,
        "&:hover": {
            backgroundColor: Greys[200],
        },
    },
    colour: {
        width: 16,
        height: 16,
        borderRadius: "50%",
        marginRight: 8,
        flexShrink: 0,
        border: "1px solid transparent",
    },
    nameContainer: {
        flexGrow: 1,
        marginBottom: 5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
    },
    title: {
        fontWeight: 500,
        color: Greys[800],
    },
    placeholder: {
        color: Greys[500],
        fontStyle: "italic",
    },
    name: {
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: 1.1,
        textAlign: "left",
    },
    subname: {
        color: Greys[600],
    },
    valueContainer: {
        flexShrink: 0,
        "& > div": {
            display: "flex",
            flexDirection: "column",
            marginBottom: 5,
            justifyContent: "flex-end",
        },
    },
    value: {
        color: Greys[600],
        textAlign: "right",
        lineHeight: 1.2,
    },
    valueWithSubValue: {
        color: Greys[800],
    },
});
export const Value: React.FC<{
    name: string;
    subtitle?: string;
    values: number[];
    colour?: string;
    title?: boolean;
    subValues?: {
        symbol: string;
        values: number[];
    };
    placeholder?: boolean;
    onClick?: () => void;
}> = ({ name, subtitle, values, subValues, colour, title, placeholder, onClick }) => {
    const classes = useValueStyles();
    const variant = title ? "body1" : "body2";
    const onClickWrapped = useCallback(
        (event: React.MouseEvent) => {
            suppressEvent(event);
            onClick && onClick();
        },
        [onClick]
    );

    return (
        <ButtonBase
            className={clsx(classes.container, title || classes.nonTitleContainer)}
            disabled={!onClick}
            onClick={onClickWrapped}
        >
            {title ? undefined : (
                <div
                    className={classes.colour}
                    style={{
                        backgroundColor: fadeSolidColour(colour || Greys[400]),
                        borderColor: colour || Greys[400],
                    }}
                />
            )}
            <div className={classes.nameContainer}>
                <Typography
                    className={clsx(classes.name, title && classes.title, placeholder && classes.placeholder)}
                    variant={variant}
                >
                    {name}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" className={clsx(classes.name, classes.subname)}>
                        {subtitle}
                    </Typography>
                )}
            </div>
            <div className={classes.valueContainer}>
                {values.map((value, idx) =>
                    value || values.filter(identity).length === 0 ? (
                        <div key={idx}>
                            <Typography
                                className={clsx(
                                    classes.value,
                                    title && classes.title,
                                    subValues && classes.valueWithSubValue
                                )}
                                variant={variant}
                            >
                                {numeral(value).format("+0,0.00")}
                            </Typography>
                            {subValues && (
                                <Typography className={classes.value} variant="caption">
                                    {subValues.symbol + " " + numeral(subValues.values[idx]).format("0.00a")}
                                </Typography>
                            )}
                        </div>
                    ) : undefined
                )}
            </div>
        </ButtonBase>
    );
};
