import { useState } from 'react';

type HistoryItem = {
  at: string;
  dni: string;
  name?: string;
  status?: string;
  branchName?: string;
  planName?: string;
};

export function useCheckinHistory(maxItems = 12) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const addToHistory = (client: any, dni: string) => {
    const item: HistoryItem = {
      at: new Date().toISOString(),
      dni,
      name: client.name,
      status: client.subscriptionStatus,
      branchName: client.subscription?.branchName,
      planName: client.subscription?.planName,
    };
    setHistory((prev) => [item, ...prev].slice(0, maxItems));
  };

  return { history, addToHistory };
}