import styled from "@emotion/styled";
import { CallSplit, HourglassEmpty, ReportProblem } from "@mui/icons-material";
import { Button, Card, CircularProgress, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React, { useCallback, useState } from "react";
import { NonIdealState } from "../components/display/NonIdealState";
import { assertNever } from "../shared/data";
import { chooseStorageCopy } from "../state/logic/storage";
import { deleteDatabase, downloadRescuedDatabaseContents } from "../state/logic/storage/rescue";
import { StorageCopy, StorageCopySource, StorageState } from "../state/logic/storage/types";
import { Greys } from "../styles/colours";

/**
 * Shown in place of the app when there is data in the browser which TopHat can't read: the
 * alternative is the tutorial state, which looks exactly like a new install and invites the user to
 * start typing over data that is still there.
 */
export const StorageErrorPage: React.FC<{ state: StorageState & { type: "unreadable" } }> = ({ state }) => {
    const [deletion, setDeletion] = useState<"none" | "confirming" | "deleting">("none");
    const [deletionError, setDeletionError] = useState<string | null>(null);

    // A deletion another tab is blocking can't be taken back, so it waits for that tab to close
    const deleteData = useCallback(() => {
        if (deletion === "none") return setDeletion("confirming");

        setDeletion("deleting");
        deleteDatabase(() => setDeletionError(DELETION_BLOCKED_MESSAGE))
            .then(() => window.location.reload())
            .catch((error: Error) => {
                setDeletion("none");
                setDeletionError(error.message);
            });
    }, [deletion]);

    return (
        <ContainerBox>
            <NonIdealState
                intent="danger"
                icon={ReportProblem}
                title="Data Could Not Be Read"
                subtitle={
                    <ContentsBox>
                        <Typography variant="body2">
                            TopHat has found saved data in this browser, but can't open it - perhaps because it was
                            written by a newer version of the app. Nothing has been changed or deleted, and nothing will
                            be saved until it can be read again.
                        </Typography>
                        <Typography variant="body2" sx={ErrorSx}>
                            {deletionError ?? state.error}
                        </Typography>
                        <ActionsBox>
                            <Button variant="outlined" onClick={reload}>
                                Try Again
                            </Button>
                            {state.rescuedRows ? (
                                <Button variant="outlined" onClick={downloadRescuedDatabaseContents}>
                                    Download Debug File
                                </Button>
                            ) : undefined}
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={deleteData}
                                disabled={deletion === "deleting"}
                            >
                                {deletion === "deleting" ? (
                                    <CircularProgress size={20} color="inherit" />
                                ) : deletion === "confirming" ? (
                                    "Click Again to Confirm"
                                ) : (
                                    "Delete Data and Restart"
                                )}
                            </Button>
                        </ActionsBox>
                    </ContentsBox>
                }
            />
        </ContainerBox>
    );
};

/**
 * Shown in place of the app when boot fails for some reason other than unreadable saved data. The data
 * may well be fine, so unlike the page above this offers nothing that would delete it.
 */
export const StartupErrorPage: React.FC<{ state: StorageState & { type: "failed" } }> = ({ state }) => (
    <ContainerBox>
        <NonIdealState
            intent="danger"
            icon={ReportProblem}
            title="TopHat Could Not Start"
            subtitle={
                <ContentsBox>
                    <Typography variant="body2">
                        Something went wrong while TopHat was starting up. Any data saved in this browser has not been
                        changed or deleted.
                    </Typography>
                    <Typography variant="body2" sx={ErrorSx}>
                        {state.error}
                    </Typography>
                    <ActionsBox>
                        <Button variant="outlined" onClick={reload}>
                            Try Again
                        </Button>
                    </ActionsBox>
                </ContentsBox>
            }
        />
    </ContainerBox>
);

/**
 * Shown in place of the app when saved copies of the data disagree, and nothing says which to keep.
 * Nothing is saved anywhere until the user picks one: the choice can't be taken back, so each pick
 * is confirmed with a second click.
 */
export const StorageConflictPage: React.FC<{ state: StorageState & { type: "conflict" } }> = ({ state }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [choosing, setChoosing] = useState(false);

    const choose = (id: string) => {
        if (selected !== id) return setSelected(id);

        setChoosing(true);
        chooseStorageCopy(id);
    };

    return (
        <ContainerBox>
            <NonIdealState
                intent="warning"
                icon={CallSplit}
                title="Choose Which Data to Keep"
                subtitle={
                    <ConflictContentsBox>
                        <Typography variant="body2">
                            TopHat has found copies of your data that have changed separately, and can't tell which one
                            to keep. Nothing will be saved until you choose. The copy you don't keep is replaced, except
                            one saved by an earlier version of TopHat, which is kept in this browser for at least a
                            fortnight.
                        </Typography>
                        <CopiesBox>
                            {state.copies.map((copy) => (
                                <CopyCard key={copy.id} variant="outlined">
                                    <Typography variant="subtitle1">{getCopyTitle(copy.source)}</Typography>
                                    <CopyDetails copy={copy} />
                                    <Button
                                        variant="outlined"
                                        onClick={() => choose(copy.id)}
                                        disabled={choosing}
                                        color={selected === copy.id ? "warning" : "primary"}
                                    >
                                        {choosing && selected === copy.id ? (
                                            <CircularProgress size={20} color="inherit" />
                                        ) : selected === copy.id ? (
                                            "Click Again to Confirm"
                                        ) : (
                                            "Keep This Copy"
                                        )}
                                    </Button>
                                </CopyCard>
                            ))}
                        </CopiesBox>
                    </ConflictContentsBox>
                }
            />
        </ContainerBox>
    );
};

const getCopyTitle = (source: StorageCopySource) => {
    switch (source.type) {
        case "browser":
            return "This Browser";
        case "remote":
            return REMOTE_NAMES[source.target] ?? "Copy in " + source.target;
        case "legacy":
            return "Earlier Version of TopHat";
        default:
            return assertNever(source);
    }
};
const REMOTE_NAMES: Record<string, string> = { dropbox: "Dropbox", gdrive: "Google Drive" };

const CopyDetails: React.FC<{ copy: StorageCopy }> = ({ copy: { savedAt, summary } }) => (
    <DetailsBox>
        {summary.isDemo ? (
            <Typography variant="body2">Demo data</Typography>
        ) : !summary.holdsRealData ? (
            <Typography variant="body2">Nothing but the tutorial</Typography>
        ) : undefined}
        <Typography variant="body2">
            {summary.accounts} {summary.accounts === 1 ? "account" : "accounts"}, {summary.transactions}{" "}
            {summary.transactions === 1 ? "transaction" : "transactions"}
        </Typography>
        {summary.latestTransaction ? (
            <Typography variant="body2" sx={DetailSx}>
                Latest transaction {DateTime.fromISO(summary.latestTransaction).toLocaleString(DateTime.DATE_MED)}
            </Typography>
        ) : undefined}
        {summary.lastChanged ? (
            <Typography variant="body2" sx={DetailSx}>
                Last changed {DateTime.fromISO(summary.lastChanged).toLocaleString(DateTime.DATETIME_MED)}
            </Typography>
        ) : undefined}
        {savedAt ? (
            <Typography variant="body2" sx={DetailSx}>
                Saved {DateTime.fromISO(savedAt).toLocaleString(DateTime.DATETIME_MED)}
            </Typography>
        ) : undefined}
    </DetailsBox>
);

/**
 * Shown in place of the app until boot has finished looking for saved data. The store starts in the
 * tutorial state, so showing the app any earlier would flash the tutorial at users who have data.
 */
export const StorageLoadingPage: React.FC = () => (
    <ContainerBox>
        <NonIdealState icon={HourglassEmpty} title="Loading TopHat" />
    </ContainerBox>
);

const reload = () => window.location.reload();

const DELETION_BLOCKED_MESSAGE =
    "TopHat is open in another tab, which is still holding on to the data. It will be deleted as soon as that tab is closed, and this page will then restart.";

const ContainerBox = styled("div")({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
});
const ContentsBox = styled("div")({ maxWidth: 520, marginTop: 20, textAlign: "center" });
const ConflictContentsBox = styled(ContentsBox)({ maxWidth: 760 });
const ActionsBox = styled("div")({
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 25,
    "& > button": { whiteSpace: "nowrap" },
});
const ErrorSx = { fontStyle: "italic", color: Greys[700], margin: "15px 0 0 0" } as const;
const CopiesBox = styled("div")({
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 20,
    marginTop: 25,
});
const CopyCard = styled(Card)({
    width: 300,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 15,
    "& > button": { whiteSpace: "nowrap" },
});
const DetailsBox = styled("div")({ flexGrow: 1 });
const DetailSx = { color: Greys[700] } as const;
