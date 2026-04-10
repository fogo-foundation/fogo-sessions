import { State } from "../components/component-library/useData/index.js";

// This is a dummy implementation for now, we will fill this in down the line
// when we decide to revisit adding notional values.
export const usePrice = (_mint: string): State<number> => State.Loading();
