import { Camera } from "@mui/icons-material";
import { Button, CircularProgress, Dialog, Link, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useCallback, useEffect, useState } from "react";
import { TopHatDispatch } from "../state";
import { DataSlice } from "../state/data";
import { useUserData } from "../state/data/hooks";
import { initialiseDemoData } from "../state/logic/startup";
import { AppColours, WHITE } from "../styles/colours";

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
                    <Button color="app" variant="outlined" sx={{ width: 150, height: 40 }}>
                        Upload Data
                    </Button>
                </Box>
                <Box sx={{ flex: "1 1 90px" }} />
            </Box>
        </Dialog>
    );
};

const closeTutorial = () => TopHatDispatch(DataSlice.actions.updateUserPartial({ tutorial: false }));
