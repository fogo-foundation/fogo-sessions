"use client";

import {
  isEstablished,
  SessionButton,
  SessionPanel,
  useSession,
} from "@fogo/sessions-sdk-react";

import { FogoWordmark } from "./fogo-wordmark";
import styles from "./index.module.scss";
import { Button } from "../component-library/button";

export const Home = () => (
  <main className={styles.home}>
    <HomeContents />
  </main>
);

const HomeContents = () => {
  const sessionState = useSession();
  return isEstablished(sessionState) ? (
    <SessionPanel className={styles.sessionPanel} />
  ) : (
    <>
      <FogoWordmark className={styles.wordmark} />
      <h1 className={styles.header}>Log in to see your portfolio</h1>
      <SessionButton />
      <Button>Hello world</Button>
    </>
  );
};
