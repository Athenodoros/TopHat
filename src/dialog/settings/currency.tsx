import { Cancel, CheckCircle, Info } from "@mui/icons-material";
import { CircularProgress, Link, TextField, Tooltip, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { handleTextFieldChange } from "../../shared/events";
import { TopHatDispatch } from "../../state";
import { DataSlice } from "../../state/data";
import { useUserData } from "../../state/data/hooks";
import { getCurrencyRates } from "../../state/logic/currencies";
import { Intents } from "../../styles/colours";
import { EditValueContainer } from "../shared";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

export const DialogCurrencyContents: React.FC = () => {
    const key = useUserData((user) => user.alphavantage);
    const [syncStatus, setSyncStatus] = useState<"fail" | "loading" | "success" | "demo">(
        key === "demo" ? "demo" : "loading"
    );

    useEffect(() => {
        setSyncStatus("loading");
        const checkKeyValidity = async () => {
            if (key === "demo") {
                setSyncStatus("demo");
                return;
            }

            const values = await getCurrencyRates("currency", "AUD", key);
            console.log(values, key);
            if (values === undefined) setSyncStatus("fail");
            else setSyncStatus("success");
        };
        checkKeyValidity();
    }, [key]);

    return (
        <SettingsDialogPage title="Currency Exchange Rate Syncs">
            <Typography variant="body2">
                TopHat can pull currencies exchange rate data from{" "}
                <Link href="https://www.alphavantage.co/" underline="hover">
                    AlphaVantage
                </Link>
                , an free online service for financial market data on fiat and digitial currencies and stock prices. To
                use more than the EUR rates, you should{" "}
                <Link href="https://www.alphavantage.co/support/#api-key" underline="hover">
                    sign up for a free API key
                </Link>
                .
            </Typography>
            <SettingsDialogDivider />
            <SettingsDialogContents>
                <EditValueContainer label="API Key">
                    <TextField value={key} onChange={setKeyValue} size="small" sx={{ marginRight: 12 / 8 }} />
                    {syncStatus === "fail" ? (
                        <Cancel htmlColor={Intents.danger.light} />
                    ) : syncStatus === "success" ? (
                        <CheckCircle htmlColor={Intents.success.light} />
                    ) : syncStatus === "demo" ? (
                        <Tooltip title="This demo key only works for EUR!">
                            <Info htmlColor={Intents.primary.light} />
                        </Tooltip>
                    ) : (
                        <CircularProgress />
                    )}
                </EditValueContainer>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

const setKeyValue = handleTextFieldChange((alphavantage) =>
    TopHatDispatch(DataSlice.actions.updateUserPartial({ alphavantage }))
);
