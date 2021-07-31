import { alpha, IconButton, ListItemText, makeStyles, Tooltip } from "@material-ui/core";
import { AccountBalance, Clear, Edit, Sync } from "@material-ui/icons";
import React from "react";
import { TopHatStore } from "../../../state";
import { useDialogState } from "../../../state/app/hooks";
import { Institution } from "../../../state/data";
import { useAllInstitutions } from "../../../state/data/hooks";
import { getColourFromIcon, getNextID, PLACEHOLDER_INSTITUTION_ID } from "../../../state/data/utilities";
import { getRandomColour } from "../../../state/utilities/values";
import { BLACK, Greys } from "../../../styles/colours";
import { getInstitutionIcon } from "../../display/ObjectDisplay";
import {
    DialogContents,
    DialogMain,
    DialogObjectSelector,
    DialogPlaceholderDisplay,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
} from "../utilities";

const useMainStyles = makeStyles((theme) => ({
    base: {
        display: "flex",
        alignItems: "center",
    },
    icon: {
        height: 24,
        width: 24,
        marginRight: 15,
        borderRadius: 5,
    },
}));

export const DialogInstitutionsView: React.FC = () => {
    const classes = useMainStyles();

    const working = useDialogState("institution");
    const institutions = useAllInstitutions().filter(({ id }) => id !== PLACEHOLDER_INSTITUTION_ID);

    const render = (institution: Institution) => (
        <div className={classes.base}>
            {getInstitutionIcon(institution, classes.icon)}
            <ListItemText>{institution.name}</ListItemText>
        </div>
    );

    return (
        <DialogMain onClick={removeWorkingInstitution}>
            <DialogObjectSelector
                type="institution"
                options={institutions}
                createDefaultOption={createNewInstitution}
                render={render}
            />
            <DialogContents>
                {working ? (
                    <EditInstitutionView working={working} />
                ) : (
                    <DialogPlaceholderDisplay
                        icon={AccountBalance}
                        title="Institutions"
                        subtext="Institutions are generally banks and credit unions: organisations at which you can hold one or more Accounts."
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const { remove: removeWorkingInstitution, update: updateInstitutionPartial } = getUpdateFunctions("institution");
const createNewInstitution = (): Institution => ({
    id: getNextID(TopHatStore.getState().data.institution.ids),
    name: "New Institution",
    colour: getRandomColour(),
});

const useEditViewStyles = makeStyles((theme) => ({
    container: {
        display: "flex",
        alignItems: "center",
    },
    iconContainer: {
        borderRadius: 10,
        // background: BLACK,
        position: "relative",

        // "&:hover": {
        // "& > div:first-child": { opacity: 0.7, transition: "none" },
        // "& > div:last-child": { opacity: 1, transition: "none" },
        // },
    },
    icon: {
        width: 100,
        height: 100,
        borderRadius: 10,
        // transition: theme.transitions.create("opacity"),
    },
    buttons: {
        position: "absolute",
        bottom: 3,
        right: 3,

        // opacity: 0,
        // transition: theme.transitions.create("opacity"),

        display: "flex",
        "& > label": { height: 24 },

        "& input": { width: 0, height: 0 },
    },
    button: {
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
    },
    colourContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginLeft: 80,
        width: 90,

        "& input": { width: 50, height: 50 },
    },
}));
const EditInstitutionView: React.FC<{ working: Institution }> = ({ working }) => {
    const classes = useEditViewStyles();

    return (
        <ObjectEditContainer type="institution">
            <EditValueContainer label="Display">
                <div className={classes.container}>
                    <div className={classes.iconContainer}>
                        {getInstitutionIcon(working, classes.icon)}
                        <div className={classes.buttons}>
                            <label>
                                <Edit fontSize="small" className={classes.button} />
                                <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} />
                            </label>
                            <Clear fontSize="small" className={classes.button} onClick={clearInstitution} />
                        </div>
                    </div>

                    <div className={classes.colourContainer}>
                        <input type="color" value={working.colour} onChange={handleColorChange} />
                        <IconButton size="small" onClick={refreshColourFromIcon}>
                            <Tooltip title={working.icon ? "Refresh colour from icon" : "Get random colour"}>
                                <Sync />
                            </Tooltip>
                        </IconButton>
                    </div>
                </div>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const InstitutionIconFileReader = new FileReader();
InstitutionIconFileReader.onload = (event) => updateInstitutionPartial("icon")(event.target!.result as string);
const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = (event.target.files || [])[0];
    if (!file) return;
    InstitutionIconFileReader.readAsDataURL(file);
};
const clearInstitution = () => updateInstitutionPartial("icon")(undefined);
const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) =>
    updateInstitutionPartial("colour")(event.target.value);

const refreshColourFromIcon = () => {
    const { colour, icon } = TopHatStore.getState().app.dialog.institution!;

    if (!icon) updateInstitutionPartial("colour")(getRandomColour());
    else getColourFromIcon(icon, colour).then((colour) => updateInstitutionPartial("colour")(colour));
};
