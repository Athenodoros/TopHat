import { Close } from "@mui/icons-material";
import { Alert, AlertColor, Button, IconButton, Snackbar } from "@mui/material";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface PopupAlert {
    message: string;
    severity: AlertColor;
    action?: {
        name: string;
        callback: () => void;
    };
}

export let setPopupAlert = (alert: PopupAlert) => undefined as void;

const PopupContext = createContext(setPopupAlert);
export const useSetAlert = () => useContext(PopupContext);

export const PopupDisplay: React.FC = ({ children }) => {
    const [alert, setAlert] = useState<PopupAlert>();
    useEffect(() => void (setPopupAlert = (newAlert: PopupAlert) => setAlert(newAlert)), []);
    const close = useCallback(() => setAlert(undefined), []);

    return (
        <>
            <Snackbar open={!!alert} autoHideDuration={6000} onClose={close}>
                {alert && (
                    <Alert
                        onClose={close}
                        severity={alert.severity}
                        variant="filled"
                        action={
                            <React.Fragment>
                                {alert.action && (
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={getWrappedCallback(alert.action.callback, close)}
                                        sx={{ height: 28 }}
                                    >
                                        {alert.action.name}
                                    </Button>
                                )}
                                <IconButton color="inherit" sx={{ p: "1px 0.5px 0.5px 0.5px" }} onClick={close}>
                                    <Close />
                                </IconButton>
                            </React.Fragment>
                        }
                    >
                        {alert.message}
                    </Alert>
                )}
            </Snackbar>
            <PopupContext.Provider value={setAlert}>{children}</PopupContext.Provider>
        </>
    );
};

const getWrappedCallback = (callback: () => void, close: () => void) => () => {
    callback();
    close();
};
