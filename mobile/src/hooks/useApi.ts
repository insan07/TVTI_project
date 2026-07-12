import { useState, useCallback } from 'react';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  request: (...args: any[]) => Promise<T>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(apiFunc: (...args: any[]) => Promise<{ data: T }>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // start loading initially assuming fetch on mount usually
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFunc(...args);
      setData(response.data);
      return response.data;
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err.message || 'An unexpected error occurred.';
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return { data, loading, error, request, setData };
}
