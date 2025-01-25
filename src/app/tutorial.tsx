import styled from "@emotion/styled";
import { Camera, PhonelinkErase } from "@mui/icons-material";
import { Button, CircularProgress, Dialog, Link, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useCallback, useEffect, useState } from "react";
import { NonIdealState } from "../components/display/NonIdealState";
import { TopHatDispatch } from "../state";
import { DataSlice } from "../state/data";
import { useUserData } from "../state/data/hooks";
import { importJSONData } from "../state/logic/import";
import { initialiseDemoData } from "../state/logic/startup";
import { AppColours, WHITE } from "../styles/colours";

export const MIN_WIDTH_FOR_APPLICATION = 1200;

export const TopHatTutorial: React.FC = () => {
    const open = useUserData((user) => user.tutorial);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (open) setLoading(false);
    }, [open]);

    const startDemo = useCallback(() => {
        setLoading(true);
        setTimeout(initialiseDemoData, 0);
    }, []);

    const [width, setWidth] = useState(9001);
    useEffect(() => {
        const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
        observer.observe(document.body);
        return () => observer.disconnect();
    }, [setWidth]);
    const [widthDismissed, setWidthDismissed] = useState(false);
    const dismissWidth = useCallback(() => setWidthDismissed(true), []);

    if (width < MIN_WIDTH_FOR_APPLICATION && !widthDismissed)
        return (
            <Dialog open={true} maxWidth="md" fullWidth={true}>
                <Box sx={{ flex: "1 1 200px" }} />
                <NonIdealState
                    icon={PhonelinkErase}
                    title="Desktop Required"
                    intent="app"
                    subtitle={
                        <SubtitleTypography variant="body2">
                            <br />
                            TopHat isn't designed for mobile use, and this browser window appears to be too narrow for
                            it to render correctly. It may look broken like this, or at least strange.
                            <br />
                            <Button
                                color="app"
                                variant="outlined"
                                onClick={dismissWidth}
                                sx={{ height: 40, marginTop: 30, marginBottom: 50 }}
                            >
                                Continue Anyway
                            </Button>
                            <br />
                            Alternatively, learn more about TopHat{" "}
                            <Link href="https://github.com/Athenodoros/TopHat/blob/main/README.md" underline="hover">
                                here
                            </Link>
                            .
                        </SubtitleTypography>
                    }
                />
                <Box sx={{ flex: "1 1 200px" }} />
            </Dialog>
        );

    return (
        <Dialog open={open} maxWidth="md" fullWidth={true}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0 }}>
                <Box sx={{ flex: "1 1 120px" }} />
                <Box
                    sx={{
                        background: AppColours.summary.main,
                        borderRadius: "50%",
                        width: 52,
                        height: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginBottom: 10,
                    }}
                >
                    <Camera htmlColor={WHITE} sx={{ width: 30, height: 30, strokeWidth: 1 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 500 }}>
                    Welcome to TopHat!
                </Typography>
                <Box sx={{ flex: "1 1 60px" }} />
                <Box sx={{ maxWidth: 500, margin: "0 150px", textAlign: "center" }}>
                    <Typography variant="body1" sx={{ marginBottom: 20 }}>
                        TopHat is a Personal Finance application which runs in the browser.
                    </Typography>
                    <Typography variant="body1">
                        It lets you track balances and expenses across multiple currencies, while preserving your
                        privacy: your data is stored on your computer, and you manage any external connections. Learn
                        more{" "}
                        <Link
                            href="https://github.com/Athenodoros/TopHat/blob/main/README.md"
                            underline="hover"
                            target="_blank"
                        >
                            here
                        </Link>
                        .
                    </Typography>
                </Box>
                <Box sx={{ flex: "1 1 70px" }} />
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Button color="app" variant="outlined" onClick={closeTutorial} sx={{ width: 150, height: 40 }}>
                        Start Fresh
                    </Button>
                    <Button
                        size="large"
                        color="app"
                        variant="contained"
                        sx={{ height: 55, width: 180, margin: "0 40px" }}
                        onClick={startDemo}
                    >
                        {loading ? (
                            <Box sx={{ transform: "scale(0.3)", transformOrigin: "center" }}>
                                <CircularProgress size="small" sx={{ color: WHITE }} />
                            </Box>
                        ) : (
                            "Begin Demo"
                        )}
                    </Button>
                    <label>
                        <Button color="app" variant="outlined" sx={{ width: 150, height: 40 }} component="div">
                            Upload Data
                        </Button>
                        <input
                            type="file"
                            style={{
                                // This stub value is so Safari doesn't render the button list weirdly
                                width: 0.000001,
                                overflow: "hidden",
                                height: 0,
                            }}
                            accept=".json"
                            onChange={handleFileChange}
                        />
                    </label>
                </Box>
                <Box sx={{ flex: "1 1 90px" }} />
            </Box>
        </Dialog>
    );
};

const closeTutorial = () => TopHatDispatch(DataSlice.actions.updateUserPartial({ tutorial: false }));

const ImportFileReader = new FileReader();
ImportFileReader.onload = (event) => importJSONData(event.target!.result as string);
const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = (event.target.files || [])[0];
    if (!file) return;
    ImportFileReader.readAsText(file);
};

const SubtitleTypography = styled(Typography)({
    opacity: 0.8,
    maxWidth: 300,
    textAlign: "center",
    margin: "5px 0 10px 0",
});
