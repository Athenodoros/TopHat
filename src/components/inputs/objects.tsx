import { Menu, MenuItem, MenuProps, TextField, Typography } from "@mui/material";
import React, { useCallback, useState } from "react";
import { handleTextFieldChange } from "../../shared/events";
import { useDivBoundingRect, usePopoverProps } from "../../shared/hooks";
import { ID } from "../../state/shared/values";

export interface ObjectSelectorCommonProps<Option extends { id: ID; name: string }> {
    options: Option[];
    render: (option: Option) => React.ReactNode;
    MenuProps?: Partial<MenuProps>;
    getMenuContents?: (close: () => void, search: string) => React.ReactNode;
    children: React.ReactElement<{ onClick: () => void; ref: React.Ref<any> }>;
    searchTerms?: string[][];
}
interface ObjectSelectorNonNullProps {
    selected: number;
    setSelected: (id: ID) => void;
    placeholder?: undefined;
}
interface ObjectSelectorNullableProps {
    selected?: ID | undefined;
    setSelected: (id?: ID) => void;
    placeholder: React.ReactNode;
}
export const ObjectSelector = <Nullable extends boolean, Option extends { id: ID; name: string }>({
    options,
    render,
    MenuProps,
    getMenuContents,
    children,
    searchTerms,

    selected,
    setSelected,
    placeholder,
}: ObjectSelectorCommonProps<Option> &
    (Nullable extends true ? ObjectSelectorNullableProps : ObjectSelectorNonNullProps)) => {
    const popover = usePopoverProps();
    const [{ width }, ref] = useDivBoundingRect(popover.buttonProps.ref);

    const childrenWithPopoverProps = React.cloneElement(children, { onClick: popover.buttonProps.onClick, ref });
    const close = useCallback(() => popover.setIsOpen(false), [popover]);

    const [search, setSearch] = useState<string>("");
    console.log(search);

    return (
        <>
            {childrenWithPopoverProps}
            <Menu
                disableAutoFocusItem={searchTerms !== undefined}
                autoFocus={searchTerms === undefined}
                variant="menu"
                {...popover.popoverProps}
                {...MenuProps}
                PaperProps={{
                    ...MenuProps?.PaperProps,
                    style: { maxHeight: 300, width: Math.max(width, 200), ...MenuProps?.PaperProps?.style },
                }}
            >
                {searchTerms ? (
                    <MenuItem
                        sx={{
                            padding: "8px",
                            width: "100%",
                            position: "sticky",
                            top: 0,
                            background: "white",
                            zIndex: 100,
                            marginTop: -8,
                            opacity: "1 !important",
                            pointerEvents: "inherit !important",
                            cursor: "inherit !important",
                        }}
                        onKeyDown={(event: any) => {
                            event.stopPropagation();
                        }}
                        disabled={true}
                    >
                        <TextField
                            sx={{ width: "100%" }}
                            size="small"
                            label="Search..."
                            value={search}
                            onChange={handleTextFieldChange(setSearch)}
                        />
                    </MenuItem>
                ) : null}
                {placeholder &&
                    (search === "" ||
                        searchTerms === undefined ||
                        searchTerms[0].some((term) =>
                            term.toLocaleLowerCase().includes(search.toLocaleLowerCase())
                        )) && (
                        <MenuItem
                            selected={selected === undefined}
                            onClick={() => {
                                close();
                                (setSelected as () => void)();
                            }}
                        >
                            {placeholder}
                        </MenuItem>
                    )}
                {getMenuContents
                    ? getMenuContents(close, search)
                    : options
                          .filter((_, idx) => {
                              console.log({ idx, searchTerms, search });
                              if (searchTerms === undefined || search === "") return true;

                              const index = placeholder ? idx + 1 : idx;
                              return searchTerms[index].some((term) =>
                                  term.toLocaleLowerCase().includes(search.toLocaleLowerCase())
                              );
                          })
                          .map((option) => (
                              <MenuItem
                                  key={option.id}
                                  selected={option.id === selected}
                                  onClick={() => {
                                      close();
                                      setSelected(option.id);
                                  }}
                              >
                                  {render(option)}
                                  <Typography variant="body1" noWrap={true}>
                                      {option.name}
                                  </Typography>
                              </MenuItem>
                          ))}
            </Menu>
        </>
    );
};
