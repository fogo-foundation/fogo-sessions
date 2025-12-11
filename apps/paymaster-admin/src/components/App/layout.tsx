"use client";
import { useParams } from "next/navigation";
import { Suspense } from "react";

import { useUserData } from "../user-data-context";

const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { appId } = useParams<{ appId: string }>();
  const { userData, isLoading } = useUserData();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!userData) {
    return;
  }

  const app = userData.apps.find((app) => app.id === appId);
  if (!app) {
    return (
      <div>
        <h1>App not found</h1>
        <p>App ID: {appId}</p>
      </div>
    );
  }
  return (
    <div>
      <h1>App: {app.name}</h1>
      {children}
    </div>
  );
};

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  );
};
