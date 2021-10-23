import { Camera } from "@mui/icons-material";
import { Button, CircularProgress, Dialog, Link, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useCallback, useEffect, useState } from "react";
import { TopHatDispatch } from "../state";
import { DataSlice } from "../state/data";
import { useUserData } from "../state/data/hooks";
import { AppColours, WHITE } from "../styles/colours";

export const TopHatTutorial: React.FC = () => {
    const open = useUserData((user) => user.tutorial);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (open) setLoading(false);
    }, [open]);

    const startDemo = useCallback(() => {
        setLoading(true);
        setTimeout(() => TopHatDispatch(DataSlice.actions.setUpDemo()), 0);
    }, []);

    return (
        <Dialog open={open} maxWidth="md" fullWidth={true}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0 }}>
                <Box sx={{ flex: "1 1 100px" }} />
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
                        marginBottom: 10 / 8,
                    }}
                >
                    <Camera htmlColor={WHITE} sx={{ fontSize: "2rem", strokeWidth: 1 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 500 }}>
                    Welcome to TopHat!
                </Typography>
                <Box sx={{ flex: "1 1 40px" }} />
                <Box sx={{ maxWidth: 500, margin: "0 150px", textAlign: "center" }}>
                    <Typography variant="body1" sx={{ marginBottom: 15 / 8 }}>
                        TopHat is a Personal Finance application which runs in the browser.
                    </Typography>
                    <Typography variant="body1">
                        It lets you track balances and expenses across multiple currencies, while preserving your
                        privacy: your data is stored on your computer, and is completely under your control. Learn more{" "}
                        <Link href="https://github.com/Athenodoros/TopHat" underline="hover" target="_blank">
                            here
                        </Link>
                        .
                    </Typography>
                </Box>
                <Box sx={{ flex: "1 1 80px" }} />
                <Box sx={{ display: "flex", alignItems: "center", "& > button": { width: 150 } }}>
                    <Button color="app" variant="outlined" onClick={closeTutorial}>
                        Start Fresh
                    </Button>
                    <Button
                        size="large"
                        color="app"
                        variant="contained"
                        sx={{ height: 55, width: 180, margin: "0 50px" }}
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
                    <Button color="app" variant="outlined">
                        Upload Data
                    </Button>
                </Box>
                <Box sx={{ flex: "1 1 80px" }} />
            </Box>
        </Dialog>
    );
};

const closeTutorial = () => TopHatDispatch(DataSlice.actions.updateUserPartial({ tutorial: false }));
