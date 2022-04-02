import { Button, Typography } from "@mui/material";
import { TopHatDispatch } from "../../state";
import { DataSlice } from "../../state/data";
import { Greys } from "../../styles/colours";
import { EditValueContainer } from "../shared";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

const ActionSx = { textAlign: "center", width: 100, height: 61 } as const;
const ItalicsSx = { fontStyle: "italic", color: Greys[700] } as const;

export const DialogDebugContents: React.FC = () => {
    return (
        <SettingsDialogPage title="Debug Options">
            <Typography variant="body2">
                If all goes well, you shouldn't need anything on this page. In case the numbers anywhere look wrong
                though, refreshing the caches might help: nothing here is destructive, so it doesn't hurt to try.
            </Typography>
            <SettingsDialogDivider />
            <SettingsDialogContents>
                <EditValueContainer
                    label={
                        <Button sx={ActionSx} variant="outlined" onClick={refreshCaches}>
                            Refresh Caches
                        </Button>
                    }
                >
                    <Typography variant="body1" sx={ItalicsSx}>
                        Refresh all summaries from raw transaction data.
                    </Typography>
                </EditValueContainer>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

const refreshCaches = () => TopHatDispatch(DataSlice.actions.refreshCaches());
