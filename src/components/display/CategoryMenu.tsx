import styled from "@emotion/styled";
import { ListItemText, MenuItem } from "@mui/material";
import { Dictionary } from "@reduxjs/toolkit";
import React, { useMemo } from "react";
import { updateListSelection, zipObject } from "../../shared/data";
import { withSuppressEvent } from "../../shared/events";
import { Category, PLACEHOLDER_CATEGORY_ID } from "../../state/data";
import { useCategoryIDs, useCategoryMap } from "../../state/data/hooks";
import { TRANSFER_CATEGORY_ID } from "../../state/data/shared";
import { ID } from "../../state/shared/values";
import { getCategoryIcon } from "./ObjectDisplay";

interface Anchor {
    id: ID;
    include?: boolean;
}

interface SingleCategoryMenuProps {
    selected?: ID;
    setSelected: (category?: Category) => void;
    exclude?: ID[];
    anchor?: Anchor;
}
const SingleCategoryMenuFunction = (
    { selected, setSelected, exclude = [], anchor }: SingleCategoryMenuProps,
    ref: React.ForwardedRef<HTMLDivElement>
) => {
    const ids = useCategoryIDs() as ID[];
    const entities = useCategoryMap();
    const { options, graph } = getCategoryGraph(ids, entities, exclude, anchor);

    const generateMenuItems = (id: ID, depth: number = 0) =>
        graph[id].map((subitem) => (
            <React.Fragment key={subitem}>
                <MenuItem
                    dense={true}
                    style={{ marginLeft: 36 + 15 * depth, paddingBottom: 0, paddingTop: 0 }}
                    selected={subitem === selected}
                    onClick={withSuppressEvent<HTMLLIElement>(() =>
                        setSelected(subitem === selected ? undefined : entities[subitem])
                    )}
                >
                    {entities[subitem]!.name}
                </MenuItem>
                {generateMenuItems(subitem, depth + 1)}
            </React.Fragment>
        ));

    return (
        <div ref={ref}>
            {options.map((id) => (
                <React.Fragment key={id}>
                    <MenuItem
                        style={graph[id].length ? { paddingBottom: 0 } : undefined}
                        selected={id === selected}
                        onClick={withSuppressEvent<HTMLLIElement>(() =>
                            setSelected(id === selected ? undefined : entities[id]!)
                        )}
                    >
                        {renderCategory(entities[id]!)}
                    </MenuItem>
                    {generateMenuItems(id)}
                </React.Fragment>
            ))}
        </div>
    );
};

interface MultiCategoryMenuProps {
    selected: ID[];
    setSelected: (ids: ID[]) => void;
    exclude?: ID[];
    anchor?: Anchor;
}
const MultipleCategoryMenuFunction = (
    { selected, setSelected, exclude = [], anchor }: MultiCategoryMenuProps,
    ref: React.ForwardedRef<HTMLDivElement>
) => {
    const ids = useCategoryIDs() as ID[];
    const entities = useCategoryMap();
    const { options, graph } = getCategoryGraph(ids, entities, exclude, anchor);

    const generateMenuItems = (id: ID, depth: number = 0) =>
        graph[id].map((subitem) => (
            <React.Fragment key={subitem}>
                <MenuItem
                    dense={true}
                    selected={selected.includes(subitem)}
                    style={{ paddingLeft: 52 + 15 * depth }}
                    onClick={withSuppressEvent<HTMLLIElement>(() =>
                        setSelected(updateListSelection(subitem, selected))
                    )}
                >
                    {entities[subitem]!.name}
                </MenuItem>
                {generateMenuItems(subitem, depth + 1)}
            </React.Fragment>
        ));

    return (
        <div ref={ref}>
            {options.map((id) => (
                <React.Fragment key={id}>
                    <MenuItem
                        style={graph[id].length ? { paddingBottom: 0 } : undefined}
                        selected={selected.includes(id)}
                        onClick={withSuppressEvent<HTMLLIElement>(() => setSelected(updateListSelection(id, selected)))}
                    >
                        {renderCategory(entities[id]!)}
                    </MenuItem>
                    {generateMenuItems(id)}
                </React.Fragment>
            ))}
        </div>
    );
};

export const SingleCategoryMenu: React.FC<SingleCategoryMenuProps> = React.forwardRef(SingleCategoryMenuFunction);
export const MultipleCategoryMenu: React.FC<MultiCategoryMenuProps> = React.forwardRef(MultipleCategoryMenuFunction);

export const useCategoryGraph = (exclude: ID[] = [PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID], anchor?: Anchor) => {
    const ids = useCategoryIDs() as ID[];
    const entities = useCategoryMap();
    const { options, graph } = useMemo(
        () => getCategoryGraph(ids, entities, exclude, anchor),
        [ids, entities, exclude, anchor]
    );
    return { options, graph, entities };
};
export const getCategoryGraph = (ids: ID[], entities: Dictionary<Category>, exclude: ID[], anchor?: Anchor) => {
    ids = ids.filter((id) => !exclude.includes(id));
    if (anchor !== undefined)
        ids = ids.filter(
            (id) => entities[id]!.hierarchy.includes(anchor.id) || (anchor.include ? id === anchor.id : false)
        );

    const isRootCategory = (id: ID) => (anchor?.include ? id === anchor.id : entities[id]!.hierarchy[0] === anchor?.id);

    const graph = zipObject(
        ids,
        ids.map((_) => [] as ID[])
    );
    ids.forEach((option) => {
        if (!isRootCategory(option)) graph[entities[option]!.hierarchy[0]].push(option);
    });

    return {
        options: ids.filter(isRootCategory),
        graph,
    };
};

const BaseContainerBox = styled("div")({ display: "flex", alignItems: "center", height: 32 });
const CategoryIconSx = {
    height: 16,
    width: 16,
    marginLeft: 10,
    marginRight: 10,
    borderRadius: "50%",
} as const;
const renderCategory = (category: Category) => (
    <BaseContainerBox>
        {getCategoryIcon(category, CategoryIconSx)}
        <ListItemText>{category.name}</ListItemText>
    </BaseContainerBox>
);
