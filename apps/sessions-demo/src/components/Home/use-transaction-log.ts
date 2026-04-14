import { useCallback, useMemo, useState } from "react";

export type Transaction = {
  signature: string;
  success: boolean;
  description: string;
};

export const useTransactionLog = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const appendTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
  }, []);

  return useMemo(
    () => ({ appendTransaction, transactions }),
    [transactions, appendTransaction],
  );
};
