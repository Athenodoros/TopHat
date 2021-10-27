import styled from "@emotion/styled";
import { AccountBalance, Clear, Edit, Sync } from "@mui/icons-material";
import { alpha, IconButton, ListItemText, Tooltip } from "@mui/material";
import { Box } from "@mui/system";
import React from "react";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getInstitutionIconSx } from "../../components/display/ObjectDisplay";
import { TopHatStore } from "../../state";
import { useDialogHasWorking, useDialogState } from "../../state/app/hooks";
import { Institution } from "../../state/data";
import { getColourFromIcon, getNextID, PLACEHOLDER_INSTITUTION_ID } from "../../state/data/shared";
import { getRandomColour } from "../../state/shared/values";
import { BLACK, Greys } from "../../styles/colours";
import { DEFAULT_BORDER_RADIUS, getThemeTransition } from "../../styles/theme";
import { DialogContents, DialogMain, EditValueContainer } from "../shared";
import { BasicDialogObjectSelector, getUpdateFunctions, ObjectEditContainer } from "./shared";

export const DialogInstitutionsView: React.FC = () => {
    const working = useDialogHasWorking();

    return (
        <DialogMain onClick={remove}>
            <BasicDialogObjectSelector
                type="institution"
                createDefaultOption={createNewInstitution}
                render={render}
                exclude={[PLACEHOLDER_INSTITUTION_ID]}
            />
            <DialogContents>
                {working ? (
                    <EditInstitutionView />
                ) : (
                    <NonIdealState
                        icon={AccountBalance}
                        title="Institutions"
                        subtitle="Institutions are generally banks and credit unions: organisations at which you can hold one or more Accounts."
                    />
                    // <DialogPlaceholderDisplay
                    //     icon={AccountBalance}
                    //     title="Institutions"
                    //     subtext="Institutions are generally banks and credit unions: organisations at which you can hold one or more Accounts."
                    // />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const InstitutionBox = styled(Box)({
    display: "flex",
    alignItems: "center",
    height: 32,
});
const InstitutionIconSx = {
    height: 24,
    width: 24,
    marginRight: 15,
    borderRadius: 5 / DEFAULT_BORDER_RADIUS,
};
const render = (institution: Institution) => (
    <InstitutionBox>
        {getInstitutionIconSx(institution, InstitutionIconSx)}
        <ListItemText>{institution.name}</ListItemText>
    </InstitutionBox>
);

export const createNewInstitution = (): Institution => ({
    id: getNextID(TopHatStore.getState().data.institution.ids),
    name: "New Institution",
    colour: getRandomColour(),
});

const EditInstitutionView: React.FC = () => {
    const working = useDialogState("institution")!;

    return (
        <ObjectEditContainer type="institution">
            <EditValueContainer label="Icon">
                <EditInstitutionIconBox>
                    {getInstitutionIconSx(working, EditInstitutionIconSx)}
                    <ButtonsBox>
                        <label>
                            <EditButton fontSize="small" />
                            <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} />
                        </label>
                        <ClearButton fontSize="small" onClick={clearInstitution} />
                    </ButtonsBox>
                </EditInstitutionIconBox>
            </EditValueContainer>
            <EditValueContainer label="Colour">
                <ColourContainerBox>
                    <input type="color" value={working.colour} onChange={handleColorChange} />
                    <IconButton size="small" onClick={refreshColourFromIcon}>
                        <Tooltip title={working.icon ? "Refresh colour from icon" : "Get random colour"}>
                            <Sync />
                        </Tooltip>
                    </IconButton>
                </ColourContainerBox>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove } = getUpdateFunctions("institution");

const InstitutionIconFileReader = new FileReader();
InstitutionIconFileReader.onload = (event) => update("icon")(event.target!.result as string);
const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = (event.target.files || [])[0];
    if (!file) return;
    InstitutionIconFileReader.readAsDataURL(file);
};
const clearInstitution = () => update("icon")(undefined);
const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => update("colour")(event.target.value);

const refreshColourFromIcon = () => {
    const { colour, icon } = TopHatStore.getState().app.dialog.institution!;

    if (!icon) update("colour")(getRandomColour());
    else getColourFromIcon(icon, colour).then((colour) => update("colour")(colour));
};

const ButtonsBox = styled(Box)({
    position: "absolute",
    bottom: 3,
    right: 3,

    opacity: 0.8,
    transition: getThemeTransition("opacity"),

    display: "flex",
    "& > label": { height: 24 },

    "& input": { width: 0, height: 0 },
});
const ButtonSxForComponents = {
    width: 24,
    height: 24,
    padding: 5,

    marginLeft: 3,
    borderRadius: 7,
    color: Greys[300],

    cursor: "pointer",

    background: alpha(BLACK, 0.7),
    "&:hover": { background: alpha(BLACK, 0.8), transition: "none" },
    "&:active": { background: alpha(BLACK, 0.9) },
};
const EditButton = styled(Edit)(ButtonSxForComponents);
const ClearButton = styled(Clear)(ButtonSxForComponents);
const ColourContainerBox = styled(Box)({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: 90,

    "& input": { width: 50, height: 50 },
});
const EditInstitutionIconBox = styled(Box)({
    borderRadius: 10,
    position: "relative",

    "&:hover": {
        "& > div:last-child": { opacity: 1, transition: "none" },
    },
});
const EditInstitutionIconSx = {
    width: 100,
    height: 100,
    borderRadius: 10 / DEFAULT_BORDER_RADIUS,
};
