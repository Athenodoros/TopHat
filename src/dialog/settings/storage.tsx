import { CheckCircle, Warning } from "@mui/icons-material";
import { Alert, Button, Card, CircularProgress, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useCallback, useState } from "react";
import { setPopupAlert } from "../../app/popups";
import { DropboxLinkOutcome, linkDropboxAccount, unlinkDropbox } from "../../state/logic/storage/dropbox";
import { useSelector } from "../../state/shared/hooks";
import { Greys, Intents } from "../../styles/colours";
import DropboxLogo from "./dropbox.svg";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

export const DialogStorageContents: React.FC = () => {
    const dropbox = useSelector((state) => state.app.syncs.find(({ type }) => type === "dropbox"));
    const [linking, setLinking] = useState(false);

    /** A refused or failed link, which needs more explanation than a snack can carry */
    const [problem, setProblem] = useState<DropboxLinkOutcome | null>(null);

    const link = useCallback(() => {
        setProblem(null);
        setLinking(true);

        linkDropboxAccount()
            .then((outcome) => {
                if (outcome.type === "cancelled")
                    setPopupAlert({
                        message: "Dropbox sign-in was cancelled, or the popup was blocked.",
                        severity: "warning",
                    });
                else if (outcome.type !== "linked") setProblem(outcome);
            })
            .finally(() => setLinking(false));
    }, []);

    const unlink = useCallback(() => {
        setProblem(null);
        unlinkDropbox();
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
                                {dropbox.desynced ? (
                                    <Warning htmlColor={Intents.danger.light} fontSize="small" />
                                ) : (
                                    <CheckCircle htmlColor={Intents.success.light} fontSize="small" />
                                )}
                            </Box>
                            <Typography variant="caption" color={Greys[700]}>
                                {dropbox.email}
                            </Typography>
                            {dropbox.desynced ? (
                                <Typography
                                    variant="caption"
                                    color={Intents.danger.main}
                                    sx={{ margin: "12px 30px 0 30px", textAlign: "center" }}
                                >
                                    TopHat has stopped syncing to this account, and nothing is being backed up. Remove
                                    the link and create it again to start syncing.
                                </Typography>
                            ) : undefined}
                            <Button onClick={unlink}>Remove</Button>
                        </>
                    ) : (
                        <Button size="large" onClick={link} variant="outlined">
                            Link Account
                        </Button>
                    )}
                </Card>
                {problem ? <LinkProblem outcome={problem} /> : undefined}
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

/**
 * Two sets of real data cannot be merged, so the link is refused rather than one of them being
 * quietly written over. Which one to keep is the user's decision, and both ways of making it are
 * somewhere else: emptying the account in Dropbox, or resetting this browser's data in Settings.
 */
const LinkProblem: React.FC<{ outcome: DropboxLinkOutcome }> = ({ outcome }) => (
    <Alert severity={outcome.type === "conflict" ? "warning" : "error"} sx={{ margin: "0 50px 10px 50px" }}>
        {outcome.type === "conflict" ? (
            <>
                <Typography variant="body2" marginBottom={8}>
                    This Dropbox account already holds TopHat data, and so does this browser. Linking them would
                    overwrite one with the other.
                </Typography>
                <Typography variant="body2">
                    To use the data in Dropbox, reset this browser's data in the Data settings first. To use this
                    browser's data, delete the TopHat file from Dropbox first. Then link the account again.
                </Typography>
            </>
        ) : (
            <Typography variant="body2">{outcome.type === "failed" ? outcome.message : ""}</Typography>
        )}
    </Alert>
);
