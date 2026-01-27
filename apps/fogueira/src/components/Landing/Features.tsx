import styles from "./Features.module.scss";

const features = [
  {
    icon: "🎨",
    title: "No-Code Page Builder",
    description:
      "Build beautiful pages with drag-and-drop widgets. No coding required.",
  },
  {
    icon: "🔒",
    title: "Token-Gated Content",
    description:
      "Control access to your content with NFT membership passes and token balances.",
  },
  {
    icon: "⚡",
    title: "Powered by Fogo",
    description:
      "Fast, gasless transactions powered by Fogo Sessions for seamless UX.",
  },
  {
    icon: "💎",
    title: "NFT Membership Passes",
    description:
      "Create exclusive NFT collections that grant access to your content.",
  },
  {
    icon: "📹",
    title: "Rich Media Support",
    description:
      "Upload and gate images, videos, and audio files with secure blob storage.",
  },
  {
    icon: "💰",
    title: "Direct-to-Creator Revenue",
    description:
      "Keep 100% of membership sales. No platform fees, just pure revenue.",
  },
];

export const Features = () => {
  return (
    <section className={styles.features} id="features">
      <div className={styles.featuresContent}>
        <h2 className={styles.featuresTitle}>Everything You Need</h2>
        <p className={styles.featuresDescription}>
          All the tools to build and monetize your token-gated community
        </p>
        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

