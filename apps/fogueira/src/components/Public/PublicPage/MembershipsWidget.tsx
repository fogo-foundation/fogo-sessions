"use client";
import { ShoppingCart } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MembershipWidgetCardSkeleton } from "../../Dashboard/Skeleton";
import styles from "./MembershipsWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  username: string;
};

type Membership = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  benefits: string[];
  imageBlobKey: string | null;
  priceToken: string | null;
  priceAmount: string | null;
};

export const MembershipsWidget = ({ config, username }: Props) => {
  const columns = (config.columns as number) || 3;
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!username) {
      setMemberships([]);
      return;
    }

    const fetchMemberships = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/memberships/${username}`);
        if (response.ok) {
          const data = await response.json();
          setMemberships(data.memberships || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, [username]);

  const formatPrice = (amount: string, token: string | null): string => {
    const decimals = token === "SOL" ? 9 : 6;
    const value = Number(amount) / Math.pow(10, decimals);
    // Show simplified token name instead of full address
    const tokenName = token && token.length > 20 ? "FOGO" : token || "tokens";
    return `${value} ${tokenName}`;
  };

  if (loading) {
    return (
      <div
        className={styles.widget}
        style={{ "--columns": columns } as React.CSSProperties}
      >
        <div className={styles.grid}>
          <MembershipWidgetCardSkeleton />
          <MembershipWidgetCardSkeleton />
          <MembershipWidgetCardSkeleton />
        </div>
      </div>
    );
  }

  if (memberships.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.widget}
      style={{ "--columns": columns } as React.CSSProperties}
    >
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
              <h3 className={styles.cardTitle}>{membership.name}</h3>
              {membership.description && (
                <p className={styles.cardDescription}>
                  {membership.description}
                </p>
              )}
              {membership.benefits && membership.benefits.length > 0 && (
                <ul className={styles.benefitsList}>
                  {membership.benefits.map((benefit, index) => (
                    <li key={index} className={styles.benefitItem}>
                      {benefit}
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.cardFooter}>
                {membership.priceAmount && (
                  <div className={styles.cardPrice}>
                    {formatPrice(membership.priceAmount, membership.priceToken)}
                  </div>
                )}
                <Link
                  href={`/${username}/memberships/${membership.slug}`}
                  className={styles.buyButton}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ShoppingCart weight="bold" size={16} />
                  {membership.priceAmount ? "Buy Now" : "View Details"}
                </Link>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
