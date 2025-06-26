import { useConnection } from "@solana/wallet-adapter-react";
import { AddressLookupTableAccount, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";


export const useAddressLookupTable = (addressLookupTableAddress: string | undefined) : State => {
    const { connection } = useConnection();

    const [state, setState] = useState<State>(State.NotStarted());
    
    useEffect(() => {
    if (!addressLookupTableAddress) {
        setState(State.Complete(null));
    }
    else if (state.type != StateType.Running) {
        setState(State.Running());
        connection.getAddressLookupTable(new PublicKey(addressLookupTableAddress)).then((account) => {
            setState(State.Complete(account.value));
        }).catch((error) => {
            setState(State.ErrorState(error));
        })
    
    }}, [addressLookupTableAddress, connection]);
    
    return state;
};

export enum StateType {
    NotStarted,
    Running,
    Error,
    Complete,
}

const State = {
    NotStarted: () => ({ type: StateType.NotStarted as const }),
    Running: () => ({ type: StateType.Running as const }),
    Complete: (addressLookupTable: AddressLookupTableAccount | null) => ({ type: StateType.Complete as const, addressLookupTable }),
    ErrorState: (error: unknown) => ({
        type: StateType.Error as const,
        error,
    }),
};

export type State = ReturnType<(typeof State)[keyof typeof State]>;