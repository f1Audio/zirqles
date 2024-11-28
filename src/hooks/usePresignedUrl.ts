import { useState, useEffect } from 'react';

export function usePresignedUrl(key: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;

    const getPresignedUrl = async () => {
      try {
        const response = await fetch('/api/download/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        
        if (response.ok) {
          const { url } = await response.json();
          setUrl(url);
        }
      } catch (error) {
        console.error('Error getting presigned URL:', error);
      }
    };

    getPresignedUrl();
  }, [key]);

  return url;
} 