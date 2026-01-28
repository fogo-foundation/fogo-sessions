"use client";
import styles from "./index.module.scss";

type Props = {
  className?: string;
  width?: string;
  height?: string;
};

export const Skeleton = ({ className, width, height }: Props) => {
  return (
    <div
      className={`${styles.skeleton} ${className || ""}`}
      style={{
        width: width || "100%",
        height: height || "1rem",
      }}
    />
  );
};

export const StatCardSkeleton = () => {
  return (
    <div className={styles.statCard}>
      <Skeleton width="60%" height="0.875rem" />
      <Skeleton width="40%" height="2rem" />
      <Skeleton width="50%" height="0.875rem" />
    </div>
  );
};

export const PageCardSkeleton = () => {
  return (
    <div className={styles.pageCard}>
      <div className={styles.pageCardHeader}>
        <Skeleton width="60%" height="1.25rem" />
        <Skeleton width="4rem" height="1.5rem" />
      </div>
      <Skeleton width="40%" height="0.875rem" />
      <Skeleton width="30%" height="0.875rem" />
      <div className={styles.pageCardMeta}>
        <Skeleton width="50%" height="0.75rem" />
      </div>
    </div>
  );
};

export const MembershipCardSkeleton = () => {
  return (
    <div className={styles.membershipCard}>
      <div className={styles.membershipCardHeader}>
        <Skeleton width="70%" height="1.25rem" />
        <Skeleton width="3rem" height="1.5rem" />
      </div>
      <Skeleton width="50%" height="0.875rem" />
      <div className={styles.membershipCardMeta}>
        <Skeleton width="40%" height="0.75rem" />
      </div>
    </div>
  );
};

export const MembershipWidgetCardSkeleton = () => {
  return (
    <div className={styles.membershipWidgetCard}>
      <Skeleton width="100%" height="180px" className={styles.imageSkeleton || ""} />
      <div className={styles.content}>
        <Skeleton width="70%" height="1.5rem" />
        <Skeleton width="100%" height="0.875rem" />
        <Skeleton width="90%" height="0.875rem" />
        <div className={styles.benefitsSkeleton}>
          <Skeleton width="80%" height="0.75rem" />
          <Skeleton width="75%" height="0.75rem" />
          <Skeleton width="85%" height="0.75rem" />
        </div>
        <div className={styles.footerSkeleton}>
          <Skeleton width="50%" height="1.25rem" />
          <Skeleton width="100%" height="2.5rem" />
        </div>
      </div>
    </div>
  );
};

