import styled from "@emotion/styled";
import { HourglassEmpty, ReportProblem } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import React, { useCallback, useState } from "react";
import { NonIdealState } from "../components/display/NonIdealState";
import { deleteDatabase, downloadRescuedDatabaseContents } from "../state/logic/storage/rescue";
import { StorageState } from "../state/logic/storage/types";
import { Greys } from "../styles/colours";

/**
 * Shown in place of the app when there is data in the browser which TopHat can't read: the
 * alternative is the tutorial state, which looks exactly like a new install and invites the user to
 * start typing over data that is still there.
 */
export const StorageErrorPage: React.FC<{ state: StorageState & { type: "unreadable" } }> = ({ state }) => {
    const [confirming, setConfirming] = useState(false);
    const [deletionError, setDeletionError] = useState<string | null>(null);

    const deleteData = useCallback(() => {
        if (!confirming) return setConfirming(true);

        deleteDatabase()
            .then(() => window.location.reload())
            .catch((error: Error) => setDeletionError(error.message));
    }, [confirming]);

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
                            <Button variant="outlined" color="error" onClick={deleteData}>
                                {confirming ? "Click Again to Confirm" : "Delete Data and Restart"}
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
 * Shown in place of the app until boot has finished looking for saved data. The store starts in the
 * tutorial state, so showing the app any earlier would flash the tutorial at users who have data.
 */
export const StorageLoadingPage: React.FC = () => (
    <ContainerBox>
        <NonIdealState icon={HourglassEmpty} title="Loading TopHat" />
    </ContainerBox>
);

const reload = () => window.location.reload();

const ContainerBox = styled("div")({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
});
const ContentsBox = styled("div")({ maxWidth: 520, marginTop: 20, textAlign: "center" });
const ActionsBox = styled("div")({
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 25,
    "& > button": { whiteSpace: "nowrap" },
});
const ErrorSx = { fontStyle: "italic", color: Greys[700], margin: "15px 0 0 0" } as const;
