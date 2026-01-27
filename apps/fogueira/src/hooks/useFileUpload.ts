"use client";
import { isEstablished, useSession } from "@fogo/sessions-sdk-react";
import { useCallback, useState } from "react";

type UploadResult = {
  id: string;
  url: string;
  mimeType: string;
  filename: string;
  sizeBytes: number;
};

type UseFileUploadReturn = {
  upload: (file: File) => Promise<UploadResult | null>;
  uploading: boolean;
  error: string | null;
};

/**
 * Hook for uploading files to the creator's asset storage
 */
export function useFileUpload(): UseFileUploadReturn {
  const session = useSession();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      if (!isEstablished(session)) {
        setError("Not authenticated");
        return null;
      }

      setUploading(true);
      setError(null);

      try {
        const token = await session.createLogInToken();
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/creator/assets/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Upload failed");
          return null;
        }

        const data = await response.json();
        return data.asset;
      } catch {
        setError("Upload failed");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [session],
  );

  return { upload, uploading, error };
}
