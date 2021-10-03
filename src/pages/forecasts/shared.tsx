import styled from "@emotion/styled";
import { HelpOutlined } from "@mui/icons-material";
import { Grid, TextField, Tooltip, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useMemo, useState } from "react";
import { Section, SECTION_MARGIN } from "../../components/layout";
import { useNumericInputHandler } from "../../shared/hooks";
import { Greys } from "../../styles/colours";

export const CalculatorContainer = styled(Box)({
    display: "flex",
    "& > div:first-of-type": { width: 400, marginRight: SECTION_MARGIN },
    "& > div:last-of-type": { flexGrow: 1 },
});

export const CalculatorInputSection = styled(Section)({ display: "flex", flexDirection: "column" });

export const CalculatorInputGrid: React.FC = ({ children }) => (
    <Grid container={true} spacing={3}>
        {children}
    </Grid>
);

export const useCalculatorInputDisplay = (title: string, help: string, measure: string, estimate: () => number) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const placeholder = useMemo(() => Math.round(estimate() * 100) / 100, []);

    const [value, setValue] = useState<number | null>(null);
    const handler = useNumericInputHandler(value, setValue);

    return {
        value: value ?? placeholder,
        input: (
            <Grid
                item={true}
                xs={6}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", marginBottom: 4 / 8 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{ textTransform: "uppercase", color: Greys[700], marginRight: 8 / 8 }}
                    >
                        {title}
                    </Typography>
                    <Typography variant="caption" sx={{ textTransform: "uppercase", color: Greys[600], flexGrow: 1 }}>
                        ({measure})
                    </Typography>
                    <Tooltip title={help}>
                        <HelpOutlined sx={{ fontSize: 16, marginLeft: 10 / 8 }} htmlColor={Greys[400]} />
                    </Tooltip>
                </Box>
                <TextField
                    size="small"
                    placeholder={"" + placeholder}
                    sx={{ width: "100%" }}
                    value={handler.text}
                    onChange={handler.onTextChange}
                />
            </Grid>
        ),
    };
};

export const CalculatorInputDivider = styled(Box)({
    borderTop: "1px solid " + Greys[300],
    margin: "24px 55px 32px 55px",
});

export const CalculatorResultDisplay: React.FC<{ title: string }> = ({ title, children }) => (
    <Grid item={true} xs={6} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <Typography variant="caption" color={Greys[600]} sx={{ textTransform: "uppercase", lineHeight: 1 }}>
            {title}
        </Typography>
        {children}
    </Grid>
);
