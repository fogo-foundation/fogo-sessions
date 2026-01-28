"use client";
import { ShoppingCart } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { MembershipWidgetCardSkeleton } from "../../../Skeleton";
import styles from "./MembershipsWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  creatorUsername: string;
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

export const MembershipsWidget = ({ config, creatorUsername }: Props) => {
  const columns = (config.columns as number) || 3;
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!creatorUsername) {
      setMemberships([]);
      return;
    }

    const fetchMemberships = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/memberships/${creatorUsername}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Memberships data:", data);
          setMemberships(data.memberships || []);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch memberships:", response.status, errorData);
        }
      } catch (error) {
        console.error("Error fetching memberships:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, [creatorUsername]);

  const formatPrice = (amount: string, token: string | null): string => {
    const decimals = token === "SOL" ? 9 : 6;
    const value = Number(amount) / Math.pow(10, decimals);
    // Show simplified token name instead of full address
    const tokenName = token && token.length > 20 ? "FOGO" : (token || "tokens");
    return `${value} ${tokenName}`;
  };

  if (loading) {
    return (
      <div className={styles.widget} style={{ "--columns": columns } as React.CSSProperties}>
        <div className={styles.grid}>
          <MembershipWidgetCardSkeleton />
          <MembershipWidgetCardSkeleton />
          <MembershipWidgetCardSkeleton />
        </div>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No memberships available</p>
      </div>
    );
  }

  return (
    <div className={styles.widget} style={{ "--columns": columns } as React.CSSProperties}>
      <div className={styles.grid}>
        {memberships.map((membership) => (
          <div key={membership.id} className={styles.card}>
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
                <div className={styles.buyButton}>
                  <ShoppingCart weight="bold" size={16} />
                  {membership.priceAmount ? "Buy Now" : "View Details"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

