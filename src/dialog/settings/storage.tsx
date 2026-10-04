import { CheckCircle, CloudOff, Warning } from "@mui/icons-material";
import { Alert, Button, Card, CircularProgress, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useCallback, useState } from "react";
import { setPopupAlert } from "../../app/popups";
import { TopHatDispatch } from "../../state";
import { DataSlice } from "../../state/data";
import { useUserData } from "../../state/data/hooks";
import { DropboxLinkOutcome, linkDropboxAccount, unlinkDropbox } from "../../state/logic/storage/dropbox";
import { RemoteSyncState } from "../../state/logic/storage/types";
import { useSelector } from "../../state/shared/hooks";
import { Greys, Intents } from "../../styles/colours";
import DropboxLogo from "./dropbox.svg";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

export const DialogStorageContents: React.FC = () => {
    const dropbox = useSelector((state) => state.app.remotes.find(({ type }) => type === "dropbox"));
    const legacyLink = useUserData((user) => (typeof user.dropbox === "object" ? user.dropbox : undefined));

    const [linking, setLinking] = useState(false);
    // A refused or failed link, which needs more explanation than a snack can carry
    const [problem, setProblem] = useState<DropboxLinkProblemOutcome | null>(null);

    const link = useCallback(() => {
        setProblem(null);
        setLinking(true);

        linkDropboxAccount()
            .then((outcome) => {
                if (outcome.type === "cancelled") setPopupAlert(DROPBOX_CANCELLED_ALERT);
                else if (outcome.type === "linked")
                    setPopupAlert({
                        message:
                            outcome.kept === "dropbox"
                                ? "Dropbox linked, and the data in it loaded."
                                : "Dropbox linked, and syncing.",
                        severity: "success",
                    });
                else setProblem(outcome);
            })
            .catch((error: Error) => setProblem({ type: "failed", message: error.message }))
            .finally(() => setLinking(false));
    }, []);

    const unlink = useCallback(() => {
        setProblem(null);
        unlinkDropbox().catch((error: Error) => setProblem({ type: "failed", message: error.message }));
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
                            <Account
                                name={dropbox.account?.name ?? "Dropbox"}
                                email={dropbox.account?.email}
                                icon={getStatusIcon(dropbox)}
                            />
                            {getStatusMessage(dropbox)}
                            <Button onClick={unlink}>Remove</Button>
                        </>
                    ) : legacyLink ? (
                        // Moved over on boot, which hasn't worked yet: the notification says why
                        <>
                            <Account
                                name={legacyLink.name}
                                email={legacyLink.email}
                                icon={<CloudOff htmlColor={Greys[600]} fontSize="small" />}
                            />
                            <StatusTypography variant="caption" color={Greys[700]}>
                                Linked by an earlier version of TopHat. Nothing is being backed up to this account until
                                TopHat has moved the link over, which it tries each time it starts.
                            </StatusTypography>
                            <Button onClick={clearLegacyDropboxLink}>Remove</Button>
                        </>
                    ) : (
                        <Button size="large" onClick={link} variant="outlined">
                            Link Account
                        </Button>
                    )}
                </Card>
                {problem ? <DropboxLinkProblem outcome={problem} sx={{ margin: "0 50px 10px 50px" }} /> : undefined}
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

export const DROPBOX_CANCELLED_ALERT = {
    message: "Dropbox sign-in was cancelled, or the popup was blocked.",
    severity: "warning",
} as const;

const Account: React.FC<{ name: string; email?: string; icon: React.ReactNode }> = ({ name, email, icon }) => (
    <>
        <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="subtitle2" marginRight={10}>
                {name}
            </Typography>
            {icon}
        </Box>
        {email ? (
            <Typography variant="caption" color={Greys[700]}>
                {email}
            </Typography>
        ) : undefined}
    </>
);

const getStatusIcon = ({ inStep, failing }: RemoteSyncState) =>
    failing ? (
        <Warning htmlColor={Intents.danger.light} fontSize="small" />
    ) : inStep ? (
        <CheckCircle htmlColor={Intents.success.light} fontSize="small" />
    ) : (
        <CloudOff htmlColor={Greys[600]} fontSize="small" />
    );

const getStatusMessage = ({ inStep, failing }: RemoteSyncState) =>
    failing ? (
        <StatusTypography variant="caption" color={Intents.danger.main}>
            TopHat could not save the latest changes to this account, and will try again with the next change. If this
            keeps happening, remove the link and create it again.
        </StatusTypography>
    ) : !inStep ? (
        <StatusTypography variant="caption" color={Greys[700]}>
            The latest changes haven't reached this account yet. TopHat will send them once it can reach Dropbox.
        </StatusTypography>
    ) : undefined;

const StatusTypography: React.FC<React.ComponentProps<typeof Typography>> = (props) => (
    <Typography {...props} sx={{ margin: "12px 30px 0 30px", textAlign: "center" }} />
);

const clearLegacyDropboxLink = () => TopHatDispatch(DataSlice.actions.clearLegacyDropboxLink());

export type DropboxLinkProblemOutcome = DropboxLinkOutcome & { type: "refused" | "failed" };

/**
 * Two sets of real data can't be merged, so a link between them is refused rather than one quietly
 * replacing the other. Which to keep is the user's decision, and both ways of making it are
 * elsewhere: emptying the account in Dropbox, or deleting this browser's data in the settings.
 */
export const DropboxLinkProblem: React.FC<{
    outcome: DropboxLinkProblemOutcome;
    sx?: React.ComponentProps<typeof Alert>["sx"];
}> = ({ outcome, sx }) => (
    <Alert severity={outcome.type === "refused" ? "warning" : "error"} sx={sx}>
        {outcome.type === "refused" ? (
            <>
                <Typography variant="body2" marginBottom={8}>
                    This Dropbox account already holds TopHat data, and so does this browser. Linking them would replace
                    one with the other, so nothing has been linked or changed.
                </Typography>
                <Typography variant="body2">
                    To use the data in Dropbox, use Delete all Data in the Data settings first. To use this browser's
                    data, delete the TopHat files from Dropbox first. Then link the account again.
                </Typography>
            </>
        ) : (
            <Typography variant="body2">{outcome.message}</Typography>
        )}
    </Alert>
);
