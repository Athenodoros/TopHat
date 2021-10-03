import { HelpOutlined } from "@mui/icons-material";
import { ButtonBase, Tooltip, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { identity } from "lodash";
import numeral from "numeral";
import React, { useCallback } from "react";
import { suppressEvent } from "../../../shared/events";
import { Greys, Intents } from "../../../styles/colours";
import { fadeSolidColour } from "../../display/ObjectDisplay";

const useValueStyles = makeStyles({
    container: {
        display: "flex",
        padding: "2px 5px 0 5px",
        margin: "2px 0 0 0",
        alignItems: "flex-start",

        "&:first-child": {
            marginTop: 0,
        },
    },
    interactiveContainer: {
        cursor: "pointer",
        borderRadius: 8,
        "&:hover": {
            backgroundColor: Greys[200],
        },
    },
    nonTitleContainer: {
        padding: "5px 5px 0 5px",
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
        marginBottom: 5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
    },
    title: {
        fontWeight: 500,
        color: Greys[700] + " !important",
    },
    placeholder: {
        color: Greys[500],
        fontStyle: "italic",
    },
    name: {
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        textAlign: "left",
    },
    subname: {
        color: Greys[600],
    },
    valueContainer: {
        flexGrow: 1,
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
    valueGreen: {
        color: Intents.success.main + " !important",
    },
    valueRed: {
        color: Intents.danger.main + " !important",
    },
});
export const Value: React.FC<{
    name: string;
    subtitle?: string;
    values: number[];
    colour?: string;
    title?: boolean;
    help?: string;
    subValues?:
        | {
              type: "number";
              symbol: string;
              values: number[];
          }
        | {
              type: "string";
              values: string[];
          };
    placeholder?: boolean;
    onClick?: () => void;
    colorise?: boolean;
}> = ({ name, subtitle, values, subValues, colour, title, help, placeholder, onClick, colorise }) => {
    const classes = useValueStyles();
    const variant = title ? "body1" : "body2";
    const onClickWrapped = useCallback(
        (event: React.MouseEvent) => {
            suppressEvent(event);
            onClick && onClick();
        },
        [onClick]
    );

    const contents = (
        <>
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
            {title && help ? (
                <Tooltip title={help}>
                    <HelpOutlined sx={{ fontSize: 12, margin: "4px 6px 4px 6px" }} htmlColor={Greys[400]} />
                </Tooltip>
            ) : undefined}
            <div className={classes.valueContainer}>
                {values.map((value, idx) =>
                    value ||
                    (values.filter(identity).length === 0 &&
                        ((subValues?.values as (string | number)[])?.filter(identity).length
                            ? subValues?.values[idx]
                            : idx === 0)) ? (
                        <div key={idx}>
                            <Typography
                                className={clsx(
                                    classes.value,
                                    title && classes.title,
                                    subValues && classes.valueWithSubValue,
                                    colorise && (value >= 0 ? classes.valueGreen : classes.valueRed)
                                )}
                                variant={variant}
                            >
                                {numeral(value).format("+0,0.00")}
                            </Typography>
                            {subValues && (
                                <Typography className={classes.value} variant="caption">
                                    {subValues.type === "number"
                                        ? subValues.symbol + " " + numeral(subValues.values[idx]).format("+0.00a")
                                        : subValues.values[idx]}
                                </Typography>
                            )}
                        </div>
                    ) : undefined
                )}
            </div>
        </>
    );

    return onClick ? (
        <ButtonBase
            className={clsx(classes.container, classes.interactiveContainer, title || classes.nonTitleContainer)}
            disabled={!onClick}
            onClick={onClickWrapped}
        >
            {contents}
        </ButtonBase>
    ) : (
        <div className={clsx(classes.container, title || classes.nonTitleContainer)}>{contents}</div>
    );
};
