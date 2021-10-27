import styled from "@emotion/styled";
import { HelpOutlined } from "@mui/icons-material";
import { ButtonBase, Tooltip, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { identity } from "lodash";
import numeral from "numeral";
import React, { useCallback } from "react";
import { suppressEvent } from "../../../shared/events";
import { Greys, Intents } from "../../../styles/colours";
import { DEFAULT_BORDER_RADIUS } from "../../../styles/theme";
import { fadeSolidColour } from "../../display/ObjectDisplay";

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
                <ColourBox
                    style={{
                        backgroundColor: fadeSolidColour(colour || Greys[400]),
                        borderColor: colour || Greys[400],
                    }}
                />
            )}
            <NameContainerBox>
                <NameTypography
                    sx={{
                        ...(title ? TitleTypographySx : undefined),
                        ...(placeholder ? PlaceholderTypographySx : undefined),
                    }}
                    variant={variant}
                >
                    {name}
                </NameTypography>
                {subtitle && <SubNameTypography variant="caption">{subtitle}</SubNameTypography>}
            </NameContainerBox>
            {title && help ? (
                <Tooltip title={help}>
                    <HelpOutlinedIcon htmlColor={Greys[400]} />
                </Tooltip>
            ) : undefined}
            <ValueContainerBox>
                {values.map((value, idx) =>
                    value ||
                    (values.filter(identity).length === 0 &&
                        ((subValues?.values as (string | number)[])?.filter(identity).length
                            ? subValues?.values[idx]
                            : idx === 0)) ? (
                        <div key={idx}>
                            <ValueTypography
                                sx={{
                                    ...(title ? TitleTypographySx : undefined),
                                    color: subValues
                                        ? Greys[800]
                                        : colorise
                                        ? value >= 0
                                            ? Intents.success.main + " !important"
                                            : Intents.danger.main + " !important"
                                        : undefined,
                                }}
                                variant={variant}
                            >
                                {numeral(value).format("+0,0.00")}
                            </ValueTypography>
                            {subValues && (
                                <ValueTypography variant="caption">
                                    {subValues.type === "number"
                                        ? subValues.symbol + " " + numeral(subValues.values[idx]).format("+0.00a")
                                        : subValues.values[idx]}
                                </ValueTypography>
                            )}
                        </div>
                    ) : undefined
                )}
            </ValueContainerBox>
        </>
    );

    return onClick ? (
        <ButtonBase
            sx={{
                ...ContainerSx,
                ...InteractiveContainerSx,
                ...(title ? undefined : NonTitleContainerSx),
            }}
            disabled={!onClick}
            onClick={onClickWrapped}
        >
            {contents}
        </ButtonBase>
    ) : (
        <Box
            sx={{
                ...ContainerSx,
                ...(title ? undefined : NonTitleContainerSx),
            }}
        >
            {contents}
        </Box>
    );
};

const ContainerSx = {
    display: "flex",
    padding: "2px 5px 0 5px",
    margin: "2px 0 0 0",
    alignItems: "flex-start",

    "&:first-of-type": {
        marginTop: 0,
    },
};
const InteractiveContainerSx = {
    cursor: "pointer",
    borderRadius: 8 / DEFAULT_BORDER_RADIUS,
    "&:hover": {
        backgroundColor: Greys[200],
    },
};
const NonTitleContainerSx = {
    padding: "5px 5px 0 5px",
};
const ColourBox = styled(Box)({
    width: 16,
    height: 16,
    borderRadius: "50%",
    marginRight: 8,
    flexShrink: 0,
    border: "1px solid transparent",
});
const NameContainerBox = styled(Box)({
    marginBottom: 5,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
});
const ValueContainerBox = styled(Box)({
    flexGrow: 1,
    flexShrink: 0,
    "& > div": {
        display: "flex",
        flexDirection: "column",
        marginBottom: 5,
        justifyContent: "flex-end",
    },
});
const HelpOutlinedIcon = styled(HelpOutlined)({
    fontSize: 12,
    margin: "4px 6px 4px 6px",
});
const ValueTypography = styled(Typography)({
    color: Greys[600],
    textAlign: "right",
    lineHeight: 1.2,
});
const TitleTypographySx = { fontWeight: 500, color: Greys[700] + " !important" };
const PlaceholderTypographySx = { color: Greys[500], fontStyle: "italic" };
const NameTypography = styled(Typography)({
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    lineHeight: 1.2,
    textAlign: "left",
});
const SubNameTypography = styled(NameTypography)({ color: Greys[600] });
