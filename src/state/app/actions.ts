import { mapValues } from "lodash";
import { AppSlice, DefaultPages } from ".";
import { TopHatDispatch } from "..";

export const OpenPageCache = mapValues(DefaultPages, (page) => () => TopHatDispatch(AppSlice.actions.setPage(page.id)));
