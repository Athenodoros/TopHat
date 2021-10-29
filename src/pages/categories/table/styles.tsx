import styled from "@emotion/styled";

export const CategoriesTableFillbarSx = { flexGrow: 1, width: 200 };
export const CategoriesTableTitleBox = styled("div")({ display: "flex", alignItems: "center", width: 200 });
export const CategoriesTableMainSx = {
    flexGrow: 9,
    width: 650,
    display: "flex",
    alignItems: "center",
    paddingLeft: 15,

    "&:hover > div:last-of-type": {
        visibility: "visible",
    },
} as const;
export const CategoriesTableSubtitleSx = {
    flexGrow: 1,
    width: 200,
    alignItems: "center",
    textAlign: "left",
} as const;
export const CategoriesTableIconSx = {
    height: 20,
    width: 20,
    marginLeft: 30,
    marginRight: 20,
};
export const CategoriesTableTotalSx = {
    width: 250,
    flexGrow: 1,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginRight: 20,
};
export const CategoriesTableActionBox = styled("div")({ marginLeft: 20, width: 40, visibility: "hidden" });
