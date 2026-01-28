"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { Lock, ShoppingCart, Wallet } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./index.module.scss";
import { WidgetRenderer } from "./WidgetRenderer";

type MembershipInfo = {
  id: string;
  name: string;
  slug: string;
  priceAmount: string | null;
  priceToken: string | null;
  creatorUsername: string;
};

type GatingRule = {
  id: string;
  name: string;
  previewMode: string | null;
  membership: MembershipInfo | null;
};

type Widget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
  orderIndex: number;
  gatingRuleId: string | null;
  gatingRule: GatingRule | null;
};

type Page = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  bgImage: string | null;
  bgColor: string | null;
  overlayColor: string | null;
  fullWidth: boolean;
  gatingRule: GatingRule | null;
  widgets: Widget[];
};

type Props = {
  username: string;
  slug?: string;
};

export const PublicPage = ({ username, slug }: Props) => {
  const session = useSession();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessResults, setAccessResults] = useState<Record<string, boolean>>(
    {},
  );
  const [checkingAccess, setCheckingAccess] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const url = slug
          ? `/api/public/pages/${username}?slug=${slug}`
          : `/api/public/pages/${username}`;

        const response = await fetch(url);

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Page not found");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setPage(data.page);
      } catch {
        setError("Failed to load page");
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [username, slug]);

  // Check access for gated content when wallet is connected
  const checkAccess = useCallback(async () => {
    if (session.type !== SessionStateType.Established || !page) return;

    // Collect all unique gating rule IDs
    const ruleIds = new Set<string>();
    if (page.gatingRule?.id) {
      ruleIds.add(page.gatingRule.id);
    }
    for (const widget of page.widgets) {
      if (widget.gatingRule?.id) {
        ruleIds.add(widget.gatingRule.id);
      }
    }

    if (ruleIds.size === 0) return;

    setCheckingAccess(true);

    try {
      const response = await fetch("/api/access/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: session.walletPublicKey.toBase58(),
          ruleIds: Array.from(ruleIds),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const results: Record<string, boolean> = {};
        for (const [ruleId, result] of Object.entries(data.results)) {
          results[ruleId] = (result as { hasAccess: boolean }).hasAccess;
        }
        setAccessResults(results);
      }
    } catch {
      // Silently fail - will show locked state
    } finally {
      setCheckingAccess(false);
    }
  }, [session, page]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className={styles.error}>
        <h1 className={styles.errorTitle}>Page Not Found</h1>
        <p className={styles.errorText}>
          {error || "The page you're looking for doesn't exist."}
        </p>
      </div>
    );
  }

  // Check if page-level gating blocks access
  const pageHasGating = !!page.gatingRule?.id;
  const pageHasAccess =
    !pageHasGating ||
    (page.gatingRule?.id && accessResults[page.gatingRule.id] === true);

  // Filter widgets based on access
  const visibleWidgets = page.widgets.filter((widget) => {
    // If page is gated and user doesn't have access, hide ALL widgets
    if (pageHasGating && !pageHasAccess) return false;

    // No gating rule = always visible
    if (!widget.gatingRule?.id) return true;

    const hasAccess = accessResults[widget.gatingRule.id];

    // Show if has access or in teaser mode
    return hasAccess === true || widget.gatingRule.previewMode === "teaser";
  });

  // Page-level gating banner
  const membership = page.gatingRule?.membership;
  const priceDisplay = membership?.priceAmount
    ? `${membership.priceAmount} FOGO`
    : "Free";

  // Build page styles from settings
  const pageStyle: React.CSSProperties = {};
  if (page.bgColor) {
    pageStyle.backgroundColor = page.bgColor;
  }
  if (page.bgImage) {
    pageStyle.backgroundImage = `url(${page.bgImage})`;
    pageStyle.backgroundSize = "cover";
    pageStyle.backgroundPosition = "center";
    pageStyle.backgroundAttachment = "fixed";
  }

  return (
    <div className={styles.page} style={pageStyle}>
      {/* Background overlay */}
      {page.overlayColor && (
        <div
          className={styles.overlay}
          style={{ backgroundColor: page.overlayColor }}
        />
      )}

      {pageHasGating && !pageHasAccess && (
        <div className={styles.pageGatingBanner}>
          <div className={styles.bannerContent}>
            <Lock size={20} weight="light" />
            <div className={styles.bannerText}>
              <p className={styles.bannerTitle}>
                This page requires a membership to view.
              </p>
              {membership && (
                <p className={styles.bannerSubtitle}>
                  {membership.name} • {priceDisplay}
                </p>
              )}
            </div>
            {session.type !== SessionStateType.Established ? (
              <button
                onClick={async () => {
                  if (session.type === SessionStateType.NotEstablished) {
                    await session.establishSession();
                  }
                }}
                className={styles.connectButton}
              >
                <Wallet weight="bold" />
                Connect Wallet
              </button>
            ) : membership ? (
              <Link
                href={`/${membership.creatorUsername}/memberships/${membership.slug}`}
                className={styles.buyButton}
              >
                <ShoppingCart weight="bold" />
                Get Membership
              </Link>
            ) : checkingAccess ? (
              <p className={styles.bannerHint}>Checking access...</p>
            ) : null}
          </div>
        </div>
      )}

      <main
        className={`${styles.content} ${page.fullWidth ? styles.fullWidth : ""}`}
      >
        {visibleWidgets.length === 0 ? (
          <div className={styles.empty}>
            <p>
              {pageHasGating && !pageHasAccess
                ? ""
                : "This page has no content yet."}
            </p>
          </div>
        ) : (
          <div className={styles.widgets}>
            {visibleWidgets.map((widget) => {
              const isLocked =
                widget.gatingRule?.id &&
                accessResults[widget.gatingRule.id] !== true;
              const isHero = widget.widgetType === "hero";

              return (
                <div
                  key={widget.id}
                  className={`${isLocked ? styles.lockedWidget : ""} ${isHero ? styles.heroWrapper : ""}`}
                >
                  {isLocked && (
                    <div className={styles.lockedOverlay}>
                      <Lock size={24} weight="light" />
                      <span>Membership required</span>
                      {session.type !== SessionStateType.Established && (
                        <button
                          onClick={async () => {
                            if (
                              session.type === SessionStateType.NotEstablished
                            ) {
                              await session.establishSession();
                            }
                          }}
                          className={styles.connectButtonSmall}
                        >
                          Connect Wallet
                        </button>
                      )}
                    </div>
                  )}
                  <WidgetRenderer widget={widget} username={username} />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
