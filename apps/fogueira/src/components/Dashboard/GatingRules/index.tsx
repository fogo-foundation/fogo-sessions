"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { Plus, Trash, PencilSimple } from "@phosphor-icons/react";
import { useEffect, useState, useCallback } from "react";
import styles from "./index.module.scss";

type GatingRule = {
  id: string;
  name: string;
  expression: GatingExpression;
  previewMode: string | null;
  createdAt: string;
};

type GatingExpression = {
  type: string;
  conditions?: GatingExpression[];
  mintAddress?: string;
  minAmount?: string;
  collectionMint?: string;
  minCount?: number;
  membershipProductId?: string;
};

type MembershipProduct = {
  id: string;
  name: string;
  nftCollectionMint: string | null;
};

export const GatingRulesPage = () => {
  const session = useSession();
  const [rules, setRules] = useState<GatingRule[]>([]);
  const [memberships, setMemberships] = useState<MembershipProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<GatingRule | null>(null);

  const fetchRules = useCallback(async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch("/api/creator/gating-rules", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchMemberships = useCallback(async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch("/api/creator/membership-products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMemberships(data.products || []);
      }
    } catch {
      // Silently fail
    }
  }, [session]);

  useEffect(() => {
    fetchRules();
    fetchMemberships();
  }, [fetchRules, fetchMemberships]);

  const handleDelete = async (id: string) => {
    if (session.type !== SessionStateType.Established) return;
    if (!confirm("Are you sure you want to delete this gating rule?")) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch(`/api/creator/gating-rules/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchRules();
      }
    } catch {
      // Silently fail
    }
  };

  const handleEdit = (rule: GatingRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  const handleFormSave = () => {
    fetchRules();
    handleFormClose();
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gating Rules</h1>
          <p className={styles.subtitle}>
            Control who can access your content based on token holdings
          </p>
        </div>
        <button
          className={styles.createButton}
          onClick={() => setShowForm(true)}
        >
          <Plus weight="bold" />
          Create Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className={styles.empty}>
          <p>No gating rules yet.</p>
          <p className={styles.emptyHint}>
            Create a rule to restrict access to your pages or widgets.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {rules.map((rule) => (
            <div key={rule.id} className={styles.ruleCard}>
              <div className={styles.ruleInfo}>
                <h3 className={styles.ruleName}>{rule.name}</h3>
                <p className={styles.ruleDescription}>
                  {describeExpression(rule.expression, memberships)}
                </p>
                {rule.previewMode === "teaser" && (
                  <span className={styles.previewBadge}>Teaser Mode</span>
                )}
              </div>
              <div className={styles.ruleActions}>
                <button
                  className={styles.editButton}
                  onClick={() => handleEdit(rule)}
                  title="Edit"
                >
                  <PencilSimple weight="bold" />
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(rule.id)}
                  title="Delete"
                >
                  <Trash weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <GatingRuleForm
          rule={editingRule}
          memberships={memberships}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
};

// Helper to describe a rule expression in human-readable format
function describeExpression(
  expr: GatingExpression,
  memberships: MembershipProduct[],
): string {
  switch (expr.type) {
    case "token":
      return `Hold ${expr.minAmount || "1"} of token ${truncateAddress(expr.mintAddress || "")}`;
    case "nft":
      return `Own ${expr.minCount || 1} NFT(s) from collection ${truncateAddress(expr.collectionMint || "")}`;
    case "membership": {
      const membership = memberships.find(
        (m) => m.id === expr.membershipProductId,
      );
      return `Own "${membership?.name || "Unknown"}" membership`;
    }
    case "and":
      return `ALL of: ${expr.conditions?.map((c) => describeExpression(c, memberships)).join(" AND ")}`;
    case "or":
      return `ANY of: ${expr.conditions?.map((c) => describeExpression(c, memberships)).join(" OR ")}`;
    default:
      return "Unknown condition";
  }
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Form component for creating/editing rules
type GatingRuleFormProps = {
  rule: GatingRule | null;
  memberships: MembershipProduct[];
  onClose: () => void;
  onSave: () => void;
};

const GatingRuleForm = ({
  rule,
  memberships,
  onClose,
  onSave,
}: GatingRuleFormProps) => {
  const session = useSession();
  const [name, setName] = useState(rule?.name || "");
  const [conditionType, setConditionType] = useState<string>(
    rule?.expression.type === "membership"
      ? "membership"
      : rule?.expression.type === "nft"
        ? "nft"
        : "token",
  );
  const [mintAddress, setMintAddress] = useState(
    rule?.expression.mintAddress || "",
  );
  const [minAmount, setMinAmount] = useState(rule?.expression.minAmount || "1");
  const [collectionMint, setCollectionMint] = useState(
    rule?.expression.collectionMint || "",
  );
  const [minCount, setMinCount] = useState(rule?.expression.minCount || 1);
  const [membershipId, setMembershipId] = useState(
    rule?.expression.membershipProductId || "",
  );
  const [previewMode, setPreviewMode] = useState(rule?.previewMode || "none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (session.type !== SessionStateType.Established) return;

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    let expression: GatingExpression;
    switch (conditionType) {
      case "token":
        if (!mintAddress.trim()) {
          setError("Token mint address is required");
          return;
        }
        expression = { type: "token", mintAddress, minAmount };
        break;
      case "nft":
        if (!collectionMint.trim()) {
          setError("Collection mint address is required");
          return;
        }
        expression = { type: "nft", collectionMint, minCount };
        break;
      case "membership":
        if (!membershipId) {
          setError("Please select a membership");
          return;
        }
        expression = { type: "membership", membershipProductId: membershipId };
        break;
      default:
        setError("Invalid condition type");
        return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await session.createLogInToken();
      const url = rule
        ? `/api/creator/gating-rules/${rule.id}`
        : "/api/creator/gating-rules";
      const method = rule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          expression,
          previewMode: previewMode === "none" ? null : previewMode,
        }),
      });

      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save rule");
      }
    } catch {
      setError("Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>
          {rule ? "Edit Gating Rule" : "Create Gating Rule"}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <span>Rule Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Premium Members Only"
                className={styles.input}
              />
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <span>Condition Type</span>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value)}
                className={styles.select}
              >
                <option value="membership">Membership Product</option>
                <option value="nft">NFT Collection</option>
                <option value="token">Token Balance</option>
              </select>
            </label>
          </div>

          {conditionType === "membership" && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Membership Product</span>
                <select
                  value={membershipId}
                  onChange={(e) => setMembershipId(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Select a membership...</option>
                  {memberships.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              {memberships.length === 0 && (
                <p className={styles.hint}>
                  No membership products yet. Create one first in the
                  Memberships section.
                </p>
              )}
            </div>
          )}

          {conditionType === "nft" && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Collection Mint Address</span>
                  <input
                    type="text"
                    value={collectionMint}
                    onChange={(e) => setCollectionMint(e.target.value)}
                    placeholder="Enter Metaplex collection mint address"
                    className={styles.input}
                  />
                </label>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Minimum NFTs Required</span>
                  <input
                    type="number"
                    min="1"
                    value={minCount}
                    onChange={(e) => setMinCount(Number(e.target.value))}
                    className={styles.input}
                  />
                </label>
              </div>
            </>
          )}

          {conditionType === "token" && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Token Mint Address</span>
                  <input
                    type="text"
                    value={mintAddress}
                    onChange={(e) => setMintAddress(e.target.value)}
                    placeholder="Enter SPL token mint address"
                    className={styles.input}
                  />
                </label>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Minimum Amount (in smallest unit)</span>
                  <input
                    type="text"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="e.g., 1000000 for 1 token with 6 decimals"
                    className={styles.input}
                  />
                </label>
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <span>Preview Mode</span>
              <select
                value={previewMode}
                onChange={(e) => setPreviewMode(e.target.value)}
                className={styles.select}
              >
                <option value="none">Hidden (content not shown)</option>
                <option value="teaser">
                  Teaser (show content with lock overlay)
                </option>
              </select>
            </label>
            <p className={styles.hint}>
              Teaser mode shows a preview of the content with a lock overlay for
              users who don't have access.
            </p>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

