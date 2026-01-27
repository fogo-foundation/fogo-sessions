"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./index.module.scss";

type Creator = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarBlobKey: string | null;
};

type Membership = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageBlobKey: string | null;
  priceToken: string | null;
  priceAmount: string | null;
};

type Props = {
  username: string;
};

export const MembershipsPage = ({ username }: Props) => {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/public/memberships/${username}`);

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to load memberships");
          return;
        }

        const data = await response.json();
        setCreator(data.creator);
        setMemberships(data.memberships);
      } catch {
        setError("Failed to load memberships");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className={styles.error}>
        <h1 className={styles.errorTitle}>Not Found</h1>
        <p className={styles.errorText}>{error || "Creator not found"}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={`/${username}`} className={styles.backLink}>
          ← Back to {creator.displayName}
        </Link>
        <h1 className={styles.title}>Memberships</h1>
        <p className={styles.subtitle}>
          Join {creator.displayName}&apos;s community
        </p>
      </header>

      <main className={styles.content}>
        {memberships.length === 0 ? (
          <div className={styles.empty}>
            <p>No memberships available yet.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {memberships.map((membership) => (
              <Link
                key={membership.id}
                href={`/${username}/memberships/${membership.slug}`}
                className={styles.card}
              >
                {membership.imageBlobKey && (
                  <div className={styles.cardImage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={membership.imageBlobKey}
                      alt={membership.name}
                      className={styles.image}
                    />
                  </div>
                )}
                <div className={styles.cardContent}>
                  <h2 className={styles.cardTitle}>{membership.name}</h2>
                  {membership.description && (
                    <p className={styles.cardDescription}>
                      {membership.description}
                    </p>
                  )}
                  {membership.priceAmount && (
                    <div className={styles.cardPrice}>
                      {formatPrice(
                        membership.priceAmount,
                        membership.priceToken,
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

function formatPrice(amount: string, token: string | null): string {
  // Convert from smallest unit (assuming 9 decimals for SOL, 6 for USDC)
  const decimals = token === "SOL" ? 9 : 6;
  const value = Number(amount) / Math.pow(10, decimals);
  return `${value} ${token || "tokens"}`;
}

