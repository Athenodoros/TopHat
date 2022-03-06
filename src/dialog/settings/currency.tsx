import { Cancel, CheckCircle, Info } from "@mui/icons-material";
import { Button, CircularProgress, Link, TextField, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React, { useCallback, useEffect, useState } from "react";
import { handleTextFieldChange } from "../../shared/events";
import { TopHatDispatch } from "../../state";
import { DataSlice } from "../../state/data";
import { useUserData } from "../../state/data/hooks";
import { getCurrencyRates, updateSyncedCurrencies } from "../../state/logic/currencies";
import { Greys, Intents } from "../../styles/colours";
import { EditValueContainer } from "../shared";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

export const DialogCurrencyContents: React.FC = () => {
    const key = useUserData((user) => user.alphavantage);
    const lastSyncTime = useUserData((user) => user.lastSyncTime);
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
            if (values === undefined) setSyncStatus("fail");
            else setSyncStatus("success");
        };
        checkKeyValidity();
    }, [key]);

    const [isSyncing, setIsSyncing] = useState(false);
    const syncCurrencies = useCallback(async () => {
        setIsSyncing(true);
        await updateSyncedCurrencies();
        setIsSyncing(false);
    }, []);

    return (
        <SettingsDialogPage title="Currency Exchange Rate Syncs">
            <Typography variant="body2">
                TopHat can pull currencies exchange rate data from{" "}
                <Link href="https://www.alphavantage.co/" underline="hover">
                    AlphaVantage
                </Link>
                , a free online service for financial market data on fiat and digitial currencies and stock prices. To
                use more than the EUR rates, you should{" "}
                <Link href="https://www.alphavantage.co/support/#api-key" underline="hover">
                    sign up for a free API key
                </Link>
                .
            </Typography>
            <SettingsDialogDivider />
            <SettingsDialogContents>
                <EditValueContainer label="API Key">
                    <TextField value={key} onChange={setKeyValue} size="small" sx={{ marginRight: 12 }} />
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
                <EditValueContainer label="Manual Sync">
                    <Button onClick={syncCurrencies} variant="outlined" sx={{ height: 36, width: 100 }}>
                        {isSyncing ? <CircularProgress size={20} /> : "Sync All"}
                    </Button>
                    {lastSyncTime !== undefined ? (
                        <Typography variant="body2" sx={{ fontStyle: "italic", color: Greys[700], marginLeft: 16 }}>
                            Last synced {DateTime.fromISO(lastSyncTime).toRelative({ unit: "minutes" })}
                        </Typography>
                    ) : undefined}
                </EditValueContainer>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

const setKeyValue = handleTextFieldChange((alphavantage) =>
    TopHatDispatch(DataSlice.actions.updateUserPartial({ alphavantage }))
);
