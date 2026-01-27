"use client";
import {
  SessionStateType,
  TransactionResultType,
  useSession,
} from "@fogo/sessions-sdk-react";
import {
  ArrowLeft,
  Check,
  ShoppingCart,
  Spinner,
  Wallet,
} from "@phosphor-icons/react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./index.module.scss";

type Creator = {
  id: string;
  username: string;
  displayName: string;
};

type Membership = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageBlobKey: string | null;
  priceToken: string | null;
  priceAmount: string | null;
  candyMachineAddress: string | null;
  nftCollectionMint: string | null;
  saleMode: string;
  treasuryAddress: string | null;
};

type Props = {
  username: string;
  slug: string;
};

type PurchaseState =
  | "idle"
  | "connecting"
  | "purchasing"
  | "success"
  | "error"
  | "already_purchased";

export const MembershipPurchasePage = ({ username, slug }: Props) => {
  const session = useSession();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>("idle");
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/public/memberships/${username}/${slug}`,
        );

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to load membership");
          return;
        }

        const data = await response.json();
        setCreator(data.creator);
        setMembership(data.membership);
      } catch {
        setError("Failed to load membership");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, slug]);

  // Check if already purchased when wallet connects
  useEffect(() => {
    const checkPurchase = async () => {
      if (session.type !== SessionStateType.Established || !membership) return;

      try {
        const token = await session.createLogInToken();
        const response = await fetch(
          `/api/public/memberships/purchase?membershipProductId=${membership.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.hasPurchased) {
            setPurchaseState("already_purchased");
          }
        }
      } catch {
        // Silently fail
      }
    };

    checkPurchase();
  }, [session, membership]);

  const handlePurchase = async () => {
    if (!membership) return;

    // Check if wallet is connected
    if (session.type !== SessionStateType.Established) {
      setPurchaseState("connecting");
      try {
        if (session.type === SessionStateType.NotEstablished) {
          await session.establishSession();
        }
        setPurchaseState("idle");
      } catch {
        setPurchaseState("error");
        setPurchaseError("Failed to connect wallet");
      }
      return;
    }

    // Start purchase process
    setPurchaseState("purchasing");
    setPurchaseError(null);

    try {
      // Check if this is a free membership (no payment required)
      // if (!membership.priceAmount || membership.priceAmount === "0") {
      //   // For paid memberships, build and send token transfer transaction
      //   throw new Error("Membership payment not configured");
      // }

      // Build token transfer instructions
      const token = await session.createLogInToken();
      const buildResponse = await fetch(
        "/api/public/memberships/build-transfer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            membershipProductId: membership.id,
          }),
        },
      );

      const buildData = await buildResponse.json();

      if (!buildResponse.ok) {
        throw new Error(buildData.error || "Failed to build transaction");
      }

      const { instructions: serializedInstructions } = buildData;

      if (!serializedInstructions || !Array.isArray(serializedInstructions)) {
        console.error("Invalid build response:", buildData);
        throw new Error("Invalid response from server");
      }

      // Log what we received for debugging
      console.log(
        "Received instructions:",
        JSON.stringify(serializedInstructions, null, 2),
      );

      // Deserialize instructions with detailed error handling
      let instructions: TransactionInstruction[];
      try {
        instructions = serializedInstructions.map(
          (
            ix: {
              programId: string;
              keys: Array<{
                pubkey: string;
                isSigner: boolean;
                isWritable: boolean;
              }>;
              data: string;
            },
            ixIndex: number,
          ) => {
            // Validate programId
            if (!ix.programId || ix.programId.length < 32) {
              throw new Error(
                `Instruction ${ixIndex}: Invalid programId "${ix.programId}" (length: ${ix.programId?.length})`,
              );
            }

            // Validate all keys
            const validatedKeys = ix.keys.map((key, keyIdx) => {
              if (!key.pubkey || key.pubkey.length < 32) {
                throw new Error(
                  `Instruction ${ixIndex}, key ${keyIdx}: Invalid pubkey "${key.pubkey}" (length: ${key.pubkey?.length})`,
                );
              }
              return {
                pubkey: new PublicKey(key.pubkey),
                isSigner: key.isSigner,
                isWritable: key.isWritable,
              };
            });

            // Use proper TransactionInstruction constructor
            return new TransactionInstruction({
              programId: new PublicKey(ix.programId),
              keys: validatedKeys,
              data: Buffer.from(ix.data, "base64"),
            });
          },
        );
      } catch (deserializeError) {
        console.error("Deserialization error:", deserializeError);
        throw deserializeError;
      }

      console.log(
        "Deserialized instructions successfully, sending transaction...",
        instructions,
      );

      // Send transaction via session
      let result;
      try {
        result = await session.sendTransaction(instructions);
      } catch (sendError) {
        console.error("sendTransaction error:", sendError);
        throw new Error(
          `Transaction send failed: ${sendError instanceof Error ? sendError.message : String(sendError)}`,
        );
      }

      if (result.type === TransactionResultType.Failed) {
        throw new Error("Transaction failed");
      }

      // Record purchase with transaction signature
      const recordResponse = await fetch("/api/public/memberships/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          membershipProductId: membership.id,
          transactionSignature: result.signature,
        }),
      });

      if (!recordResponse.ok) {
        const data = await recordResponse.json();
        throw new Error(data.error || "Failed to record purchase");
      }

      setPurchaseState("success");
    } catch (err) {
      setPurchaseState("error");
      setPurchaseError(
        err instanceof Error ? err.message : "An error occurred",
      );
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner className={styles.spinner} weight="bold" />
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !creator || !membership) {
    return (
      <div className={styles.error}>
        <h1 className={styles.errorTitle}>Not Found</h1>
        <p className={styles.errorText}>{error || "Membership not found"}</p>
        <Link href={`/${username}/memberships`} className={styles.backButton}>
          Back to memberships
        </Link>
      </div>
    );
  }

  const isConnected = session.type === SessionStateType.Established;
  const isFree = !membership.priceAmount || membership.priceAmount === "0";
  const priceDisplay = isFree ? "Free" : `${membership.priceAmount} FOGO`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={`/${username}/memberships`} className={styles.backLink}>
          <ArrowLeft weight="bold" />
          Back to memberships
        </Link>
      </header>

      <main className={styles.content}>
        <div className={styles.productCard}>
          {membership.imageBlobKey && (
            <div className={styles.imageContainer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={membership.imageBlobKey}
                alt={membership.name}
                className={styles.image}
              />
            </div>
          )}

          <div className={styles.details}>
            <span className={styles.creatorName}>By {creator.displayName}</span>
            <h1 className={styles.title}>{membership.name}</h1>

            {membership.description && (
              <p className={styles.description}>{membership.description}</p>
            )}

            <div className={styles.price}>{priceDisplay}</div>

            <div className={styles.purchaseSection}>
              {purchaseState === "success" ||
              purchaseState === "already_purchased" ? (
                <div className={styles.successMessage}>
                  <Check weight="bold" className={styles.successIcon} />
                  <h3>
                    {purchaseState === "already_purchased"
                      ? "You Already Own This!"
                      : "Purchase Successful!"}
                  </h3>
                  <p>You now have access to all gated content.</p>
                  <Link href={`/${username}`} className={styles.continueButton}>
                    View {creator.displayName}&apos;s Content
                  </Link>
                </div>
              ) : purchaseState === "error" ? (
                <div className={styles.errorMessage}>
                  <p>{purchaseError}</p>
                  <button
                    onClick={() => setPurchaseState("idle")}
                    className={styles.retryButton}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={
                    purchaseState === "purchasing" ||
                    purchaseState === "connecting"
                  }
                  className={styles.purchaseButton}
                >
                  {purchaseState === "purchasing" ? (
                    <>
                      <Spinner className={styles.buttonSpinner} />
                      Processing...
                    </>
                  ) : purchaseState === "connecting" ? (
                    <>
                      <Spinner className={styles.buttonSpinner} />
                      Connecting...
                    </>
                  ) : !isConnected ? (
                    <>
                      <Wallet weight="bold" />
                      Connect Wallet to {isFree ? "Claim" : "Purchase"}
                    </>
                  ) : (
                    <>
                      <ShoppingCart weight="bold" />
                      {isFree
                        ? "Claim Free Membership"
                        : `Buy for ${priceDisplay}`}
                    </>
                  )}
                </button>
              )}
            </div>

            <div className={styles.features}>
              <h4 className={styles.featuresTitle}>What you get:</h4>
              <ul className={styles.featuresList}>
                <li>Access to exclusive token-gated content</li>
                <li>Membership verified by wallet address</li>
                <li>Instant access after purchase</li>
              </ul>
            </div>

            {!isFree && membership.treasuryAddress && (
              <div className={styles.paymentInfo}>
                <p className={styles.paymentNote}>
                  Payment goes to:{" "}
                  <code>{membership.treasuryAddress.slice(0, 8)}...</code>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
