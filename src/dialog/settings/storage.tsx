import { CheckCircle } from "@mui/icons-material";
import { Button, Card, CircularProgress, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useCallback, useState } from "react";
import { setPopupAlert } from "../../app/popups";
import { linkDropboxInPopup, unlinkDropbox } from "../../state/logic/storage/dropbox";
import { useSelector } from "../../state/shared/hooks";
import { Greys, Intents } from "../../styles/colours";
import DropboxLogo from "./dropbox.svg";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

export const DialogStorageContents: React.FC = () => {
    const dropbox = useSelector((state) => state.app.syncs.find(({ type }) => type === "dropbox"));
    const [linking, setLinking] = useState(false);

    const link = useCallback(() => {
        setLinking(true);
        linkDropboxInPopup()
            .then((linked) => {
                if (!linked)
                    setPopupAlert({
                        message: "Dropbox sign-in was cancelled, or the popup was blocked.",
                        severity: "warning",
                    });
            })
            .finally(() => setLinking(false));
    }, []);

    return (
        <SettingsDialogPage title="Cloud Data Storage">
            <Typography variant="body2">
                TopHat can sync data to Dropbox, which enables copying data across computers and recovery in case of
                problems. This is strictly optional, and will only run after an account is connected and the app is
                online.
            </Typography>
            <SettingsDialogDivider />
            <SettingsDialogContents>
                <Card
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        margin: "10px 50px",
                        padding: "20px 0 40px 0",
                        flexShrink: 0,
                        "& > img:first-of-type": {
                            width: 150,
                            padding: "16px 0",
                        },
                        "& > button": {
                            marginTop: 10,
                        },
                    }}
                >
                    <img src={DropboxLogo} />
                    {linking ? (
                        <CircularProgress />
                    ) : dropbox ? (
                        <>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Typography variant="subtitle2" marginRight={10}>
                                    {dropbox.name}
                                </Typography>
                                <CheckCircle htmlColor={Intents.success.light} fontSize="small" />
                            </Box>
                            <Typography variant="caption" color={Greys[700]}>
                                {dropbox.email}
                            </Typography>
                            <Button onClick={unlinkDropbox}>Remove</Button>
                        </>
                    ) : (
                        <Button size="large" onClick={link} variant="outlined">
                            Link Account
                        </Button>
                    )}
                </Card>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};
