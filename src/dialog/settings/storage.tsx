import { CheckCircle } from "@mui/icons-material";
import { Button, Card, CircularProgress, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React from "react";
import { TopHatDispatch } from "../../state";
import { DataSlice } from "../../state/data";
import { useUserData } from "../../state/data/hooks";
import { redirectToDropboxAuthURI } from "../../state/logic/dropbox";
import { Greys, Intents } from "../../styles/colours";
import DropboxLogo from "./dropbox.svg";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

export const DialogStorageContents: React.FC = () => {
    const config = useUserData((user) => user.dropbox);

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
                    {config === "loading" ? (
                        <CircularProgress />
                    ) : config ? (
                        <>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Typography variant="subtitle2" marginRight={10}>
                                    {config.name}
                                </Typography>
                                <CheckCircle htmlColor={Intents.success.light} fontSize="small" />
                            </Box>
                            <Typography variant="caption" color={Greys[700]}>
                                {config.email}
                            </Typography>
                            <Button onClick={removeDropboxSync}>Remove</Button>
                        </>
                    ) : (
                        <Button size="large" onClick={redirectToDropboxAuthURI} variant="outlined">
                            Link Account
                        </Button>
                    )}
                </Card>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

const removeDropboxSync = () => TopHatDispatch(DataSlice.actions.removeDropoxSync());
