import styled from "@emotion/styled";
import { Camera, CloudUploadOutlined, PhonelinkErase, SettingsBackupRestore } from "@mui/icons-material";
import { Alert, Button, Card, CircularProgress, Dialog, Link, Typography } from "@mui/material";
import { alpha, Box } from "@mui/system";
import { useCallback, useContext, useEffect, useState } from "react";
import { NonIdealState } from "../components/display/NonIdealState";
import { TopHatDispatch } from "../state";
import { AppSlice, JSONImportStatus } from "../state/app";
import { DataSlice, DataState } from "../state/data";
import { useUserData } from "../state/data/hooks";
import { importData } from "../state/logic/import";
import { initialiseDemoData } from "../state/logic/startup";
import { isAppRunning } from "../state/logic/storage/types";
import { useSelector } from "../state/shared/hooks";
import { AppColours, WHITE } from "../styles/colours";
import { FileHandlerContext } from "./context";

export const MIN_WIDTH_FOR_APPLICATION = 1200;

export const TopHatTutorial: React.FC = () => {
    const open = useUserData((user) => user.tutorial);
    const storage = useSelector((state) => state.app.storage);
    const running = isAppRunning(storage);

    // While the tutorial is up, a file dropped anywhere is a backup to import rather than a statement
    const { isDragActive, openFileDialog, setFileImportHandler } = useContext(FileHandlerContext);
    const jsonImportStatus = useSelector((state) => state.app.jsonImport);
    useEffect(() => {
        if (!open || !running) return;

        setFileImportHandler("JSON-IMPORT");
        return () => {
            setFileImportHandler("GENERAL-IMPORT");
            resetJSONImportStatus();
        };
    }, [open, running, setFileImportHandler]);

    const [page, setPage] = useState<"welcome" | "import">("welcome");
    useEffect(() => {
        if (open) setPage("welcome");
    }, [open]);
    const showWelcome = useCallback(() => {
        setPage("welcome");
        resetJSONImportStatus();
    }, []);
    const showImport = useCallback(() => setPage("import"), []);

    const [width, setWidth] = useState(9001);
    useEffect(() => {
        const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
        observer.observe(document.body);
        return () => observer.disconnect();
    }, [setWidth]);
    const [widthDismissed, setWidthDismissed] = useState(false);
    const dismissWidth = useCallback(() => setWidthDismissed(true), []);

    // The store starts in the tutorial state, and is left in it when boot or saved data fails. None of
    // that is an invitation, so the tutorial is only offered once the app itself can be shown.
    if (!running) return null;

    // The narrow-window warning is shown to everyone, not only while the tutorial is open
    if (width < MIN_WIDTH_FOR_APPLICATION && !widthDismissed)
        return (
            <Dialog open={true} maxWidth="md" fullWidth={true}>
                <TutorialNarrowWindowContents onContinue={dismissWidth} />
            </Dialog>
        );

    return (
        <Dialog
            open={open}
            maxWidth="md"
            fullWidth={true}
            // The app-wide dropzone only counts a drag as over it while the dragged-over element is inside it in
            // the DOM, so a portalled dialog would end the drag highlight as soon as the file reached it
            disablePortal={true}
        >
            {/* A file dropped on the welcome page moves to the import page, to show its progress */}
            {page === "welcome" && jsonImportStatus.type === "idle" ? (
                <TutorialWelcomeContents storageUnavailable={storage.type === "unavailable"} onImport={showImport} />
            ) : (
                <TutorialImportContents
                    status={jsonImportStatus}
                    isDragActive={isDragActive}
                    onChooseFile={openFileDialog}
                    onBack={showWelcome}
                />
            )}
        </Dialog>
    );
};

const TutorialNarrowWindowContents: React.FC<{ onContinue: () => void }> = ({ onContinue }) => (
    <>
        <Box sx={{ flex: "1 1 200px" }} />
        <NonIdealState
            icon={PhonelinkErase}
            title="Desktop Required"
            intent="app"
            subtitle={
                <SubtitleTypography variant="body2">
                    <br />
                    TopHat isn't designed for mobile use, and this browser window appears to be too narrow for it to
                    render correctly. It may look broken like this, or at least strange.
                    <br />
                    <Button
                        color="app"
                        variant="outlined"
                        onClick={onContinue}
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
    </>
);

const TutorialWelcomeContents: React.FC<{ storageUnavailable: boolean; onImport: () => void }> = ({
    storageUnavailable,
    onImport,
}) => {
    const [loading, setLoading] = useState(false);
    const startDemo = useCallback(() => {
        setLoading(true);
        setTimeout(initialiseDemoData, 0);
    }, []);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0 }}>
            <Box sx={{ flex: "1 1 120px" }} />
            <Box sx={TitleIconSx}>
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
                    It lets you track balances and expenses across multiple currencies, while preserving your privacy:
                    your data is stored on your computer, and you manage any external connections. Learn more{" "}
                    <Link
                        href="https://github.com/Athenodoros/TopHat/blob/main/README.md"
                        underline="hover"
                        target="_blank"
                    >
                        here
                    </Link>
                    .
                </Typography>
                {storageUnavailable ? (
                    <Typography variant="body2" color="error" sx={{ marginTop: 16 }}>
                        TopHat cannot save data in this browser, so anything entered will be lost when this page is
                        closed.
                    </Typography>
                ) : undefined}
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
                <Button color="app" variant="outlined" sx={{ width: 150, height: 40 }} onClick={onImport}>
                    Import Data
                </Button>
            </Box>
            <Box sx={{ flex: "1 1 90px" }} />
        </Box>
    );
};

const TutorialImportContents: React.FC<{
    status: JSONImportStatus;
    isDragActive: boolean;
    onChooseFile: () => void;
    onBack: () => void;
}> = ({ status, isDragActive, onChooseFile, onBack }) => {
    const loading = status.type === "loading";
    const importLoadedData = useCallback(() => {
        if (status.type !== "loaded") return;

        importData(status.data);
        resetJSONImportStatus();
    }, [status]);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0 }}>
            <Box sx={{ flex: "1 1 90px" }} />
            <Box sx={TitleIconSx}>
                <SettingsBackupRestore htmlColor={WHITE} sx={{ width: 30, height: 30 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
                Import Existing Data
            </Typography>
            <Box sx={{ maxWidth: 500, marginTop: 30, textAlign: "center" }}>
                <Typography variant="body1">Bring in the data from another browser or computer.</Typography>
                <Typography variant="body1">Use a JSON export from TopHat's settings, or a ZIP backup.</Typography>
            </Box>
            <Box sx={{ flex: "1 1 50px" }} />
            {/* A row, so that other import options can sit beside the file upload */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: 20 }}>
                <Card
                    variant="outlined"
                    sx={{
                        width: 290,
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        borderColor: AppColours.summary.main,
                        transition: "box-shadow 150ms, background-color 150ms",
                        // The tint stays from the drag through to the dropped file being ready to import
                        backgroundColor:
                            isDragActive || loading || status.type === "loaded"
                                ? alpha(AppColours.summary.main, 0.05)
                                : undefined,
                        // The inset ring thickens the border without shifting the card's contents
                        boxShadow: isDragActive
                            ? `inset 0 0 0 1px ${AppColours.summary.main}, 0 12px 40px ${alpha(
                                  AppColours.summary.main,
                                  0.55
                              )}`
                            : undefined,
                    }}
                >
                    <CloudUploadOutlined
                        htmlColor={AppColours.summary.main}
                        sx={{ width: 36, height: 36, marginBottom: 6 }}
                    />
                    <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                        {status.type === "loaded" ? status.name : "Upload Data"}
                    </Typography>
                    <Typography variant="body2" sx={{ margin: "8px 0 16px" }}>
                        {isDragActive
                            ? "Drop the file to read it."
                            : loading
                            ? "Reading the file…"
                            : status.type === "loaded"
                            ? describeData(status.data)
                            : "Choose a TopHat JSON export"}
                    </Typography>
                    {status.type === "loaded" ? (
                        <Button color="app" variant="contained" onClick={importLoadedData}>
                            Import Data
                        </Button>
                    ) : (
                        <Button color="app" variant="outlined" onClick={onChooseFile} disabled={loading}>
                            {/* The label keeps its space while loading, so the button (and card) don't change size */}
                            <Box component="span" sx={{ visibility: loading ? "hidden" : undefined }}>
                                Choose File
                            </Box>
                            {loading ? (
                                <CircularProgress
                                    size={20}
                                    sx={{ position: "absolute", color: AppColours.summary.main }}
                                />
                            ) : undefined}
                        </Button>
                    )}
                </Card>
            </Box>
            {status.type === "error" ? (
                <Alert severity="error" sx={{ marginTop: 20, maxWidth: 500 }}>
                    {status.message}
                </Alert>
            ) : undefined}
            <Box sx={{ flex: "1 1 30px" }} />
            <Button color="app" onClick={onBack} disabled={loading} sx={{ height: 40 }}>
                Back to Welcome
            </Button>
            <Box sx={{ flex: "1 1 30px" }} />
        </Box>
    );
};

const closeTutorial = () => TopHatDispatch(DataSlice.actions.updateUserPartial({ tutorial: false }));
const resetJSONImportStatus = () => TopHatDispatch(AppSlice.actions.setJSONImportStatus({ type: "idle" }));

const describeData = (data: DataState) => {
    const count = (length: number, noun: string) => `${length} ${noun}${length === 1 ? "" : "s"}`;
    return `${count(data.account.ids.length, "account")} and ${count(data.transaction.ids.length, "transaction")}.`;
};

const TitleIconSx = {
    background: AppColours.summary.main,
    borderRadius: "50%",
    width: 52,
    height: 52,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 10,
} as const;

const SubtitleTypography = styled(Typography)({
    opacity: 0.8,
    maxWidth: 300,
    textAlign: "center",
    margin: "5px 0 10px 0",
});
