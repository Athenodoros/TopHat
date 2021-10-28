import styled from "@emotion/styled";
import { DeleteForeverTwoTone, DeleteTwoTone, SaveTwoTone } from "@mui/icons-material";
import { Button, TextField, Tooltip } from "@mui/material";
import { isEqual, upperFirst } from "lodash";
import React, { useCallback, useMemo, useState } from "react";
import { handleTextFieldChange } from "../../../shared/events";
import { useDialogState } from "../../../state/app/hooks";
import { useDeleteObjectError } from "../../../state/data";
import { useObjectByID } from "../../../state/data/hooks";
import { BasicObjectName, BasicObjectType } from "../../../state/data/types";
import { Greys } from "../../../styles/colours";
import { getUpdateFunctions } from "./update";

export const ObjectEditContainer = <Type extends BasicObjectName>({
    type,
    children,
    subtitle,
    onReset,
    valid,
}: React.PropsWithChildren<{ type: Type; subtitle?: React.ReactNode; onReset?: () => void; valid?: boolean }>) => {
    const working = useDialogState(type) as BasicObjectType[Type];
    const actual = useObjectByID(type, working.id);

    const {
        handleNameChange,
        reset,
        destroy,
        save: saveRaw,
    } = useMemo(() => {
        const functions = getUpdateFunctions(type);
        return {
            handleNameChange: handleTextFieldChange(functions.update("name")),
            reset: () => {
                const actual = functions.get(working.id);
                functions.set(actual);
                if (actual && onReset) onReset();
            },
            destroy: () => functions.destroy(working.id),
            save: functions.save,
        };
    }, [type, working.id, onReset]);
    const save = useCallback(() => saveRaw(working), [saveRaw, working]);

    const deleteObjectError = useDeleteObjectError(type, working.id);
    const [deleteEnabled, setDeleteEnabled] = useState(false);
    const enableDelete = useCallback(() => setDeleteEnabled(true), []);

    return (
        <EditBox>
            <TextField label={`${upperFirst(type)} Name`} value={working.name} onChange={handleNameChange} />
            {subtitle || <StubSubtitleBox />}
            <EditDividerBox />
            <EditContainerBox>{children}</EditContainerBox>
            <ActionsBox>
                <Button
                    color="warning"
                    disabled={isEqual(working, actual)}
                    startIcon={<DeleteTwoTone fontSize="small" />}
                    onClick={reset}
                >
                    Reset
                </Button>
                <Tooltip title={deleteObjectError || ""}>
                    <span>
                        <Button
                            color="error"
                            disabled={deleteObjectError !== undefined}
                            startIcon={<DeleteForeverTwoTone fontSize="small" />}
                            onClick={deleteEnabled ? destroy : enableDelete}
                            variant={deleteEnabled ? "contained" : undefined}
                        >
                            {deleteEnabled ? "Confirm" : "Delete"}
                        </Button>
                    </span>
                </Tooltip>
                <Button
                    disabled={isEqual(working, actual) || valid === false}
                    variant="outlined"
                    startIcon={<SaveTwoTone fontSize="small" />}
                    onClick={save}
                >
                    Save
                </Button>
            </ActionsBox>
        </EditBox>
    );
};

const EditBox = styled("div")({
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    minHeight: 0,
    padding: "20px 20px 8px 20px",
    flexGrow: 1,
});
const EditDividerBox = styled("div")({
    flex: "0 0 1px",
    width: "80%",
    background: Greys[400],
    alignSelf: "left",
    margin: "10px 25px",
});
const EditContainerBox = styled("div")({
    flexShrink: 1,
    flexGrow: 1,
    overflowY: "auto",
    paddingRight: 30,
});
const ActionsBox = styled("div")({
    marginTop: "auto",
    display: "flex",
    alignSelf: "flex-end",
    paddingTop: 8,
    "& > *": { marginLeft: 10 },
});
const StubSubtitleBox = styled("div")({ height: 15 });
