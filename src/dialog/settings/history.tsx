import { Launch } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { DateTime, DateTimeFormatOptions } from "luxon";
import React from "react";
import { TopHatDispatch } from "../../state";
import { DataSlice } from "../../state/data";
import { useAllPatches } from "../../state/data/hooks";
import { SDate } from "../../state/shared/values";
import { SettingsDialogPage } from "./shared";

export const DialogHistoryContents: React.FC = () => {
    const patches = useAllPatches();

    return (
        <SettingsDialogPage title="Data History">
            <Box sx={{ flexGrow: 1, flexShrink: 1, minHeight: 0, overflowY: "auto" }}>
                {patches.map((patch, idx) => {
                    const date = formatDateString(patch.date);
                    const header =
                        idx > 0 && date === formatDateString(patches[idx - 1]?.date) ? undefined : (
                            <Typography variant="subtitle2" sx={{ marginBottom: 10 }}>
                                {date}
                            </Typography>
                        );

                    return (
                        <React.Fragment key={patch.id}>
                            {header}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    width: "100%",
                                    "& > *": { flexShrink: 0 },
                                }}
                            >
                                <Typography variant="body2" sx={{ width: 70 }}>
                                    {formatDateString(patch.date, DateTime.TIME_WITH_SECONDS)}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        minWidth: 0,
                                        flexGrow: 1,
                                        flexShrink: 1,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        fontStyle: "italic",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {patch.action ?? "Automated Update"}
                                </Typography>
                                <Button
                                    variant="text"
                                    size="small"
                                    endIcon={<Launch />}
                                    sx={{ marginLeft: 8 }}
                                    onClick={() => revertToRevision(patch.id)}
                                >
                                    Rewind
                                </Button>
                            </Box>
                        </React.Fragment>
                    );
                })}
            </Box>
        </SettingsDialogPage>
    );
};

const revertToRevision = (patch: string) => TopHatDispatch(DataSlice.actions.rewindToPatch(patch));

const formatDateString = (date: SDate, format: DateTimeFormatOptions = DateTime.DATE_FULL) => {
    return DateTime.fromISO(date).toLocaleString(format);
};
