import styles from "./HowItWorks.module.scss";

const steps = [
  {
    number: "1",
    title: "Create",
    description:
      "Set up your creator profile and design your membership products with our no-code page builder.",
  },
  {
    number: "2",
    title: "Gate",
    description:
      "Define access rules using NFTs or token balances. Your content stays locked until members meet the requirements.",
  },
  {
    number: "3",
    title: "Earn",
    description:
      "Members purchase access, and you receive payments directly. No middlemen, no platform fees.",
  },
];

export const HowItWorks = () => {
  return (
    <section className={styles.howItWorks}>
      <div className={styles.howItWorksContent}>
        <h2 className={styles.howItWorksTitle}>How It Works</h2>
        <p className={styles.howItWorksDescription}>
          Get started in three simple steps
        </p>
        <div className={styles.steps}>
          {steps.map((step) => (
            <div key={step.number} className={styles.step}>
              <div className={styles.stepNumber}>{step.number}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

