import { Cancel, CheckCircle, Info } from "@mui/icons-material";
import { Button, CircularProgress, Link, TextField, Tooltip, Typography } from "@mui/material";
import { debounce } from "lodash-es";
import { DateTime } from "luxon";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

    const [workingAPIKey, setWorkingAPIKeyRaw] = useState(key);
    const setWorkingAPIKey = useMemo(
        () =>
            handleTextFieldChange((value) => {
                setWorkingAPIKeyRaw(value);
                setKeyValue(value);
            }),
        []
    );

    return (
        <SettingsDialogPage title="Currency Exchange Rate Syncs">
            <Typography variant="body2">
                TopHat can pull currency exchange rate data from{" "}
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
            <Typography variant="caption" sx={{ marginTop: 8, color: Greys[700], fontStyle: "italic" }}>
                Note that free AlphaVantage keys are limited to 5 requests per minute, and 500 requests per day: if
                necessary, TopHat batches requests and waits for capacity.
            </Typography>
            <SettingsDialogDivider />
            <SettingsDialogContents>
                <EditValueContainer label="API Key">
                    <TextField
                        value={workingAPIKey}
                        onChange={setWorkingAPIKey}
                        size="small"
                        sx={{ marginRight: 12 }}
                    />
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
                    <Button onClick={syncCurrencies} variant="outlined" sx={{ height: 36, width: 110 }}>
                        {isSyncing ? <CircularProgress size={20} /> : "Sync All"}
                    </Button>
                    {lastSyncTime !== undefined ? (
                        <Typography
                            variant="body2"
                            sx={{ fontStyle: "italic", color: Greys[700], marginLeft: 16, width: 150 }}
                        >
                            Last synced {DateTime.fromISO(lastSyncTime).toRelative({ unit: "minutes" })}
                        </Typography>
                    ) : undefined}
                </EditValueContainer>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

const setKeyValue = debounce(
    (alphavantage) => TopHatDispatch(DataSlice.actions.updateUserPartial({ alphavantage })),
    1000
);
