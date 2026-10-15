import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Generic data-fetching hook backed by React Query.
 *
 * Cached for `staleTime` ms — navigating away and back serves cached data
 * immediately, then silently revalidates in the background.
 *
 * @param {string|null} url            - API path. Pass null to skip fetching.
 * @param {object}      [options]
 * @param {any}         [options.defaultData] - Value before first successful fetch.
 * @param {any[]}       [options.deps]        - Extra query key segments (triggers refetch when changed).
 * @param {number}      [options.staleTime]   - Override global staleTime (ms).
 *
 * Returns { data, loading, error, refetch }
 */
export function useApi(url, { defaultData = null, deps = [], staleTime } = {}) {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: url ? [url, ...deps] : ['__disabled__'],
    queryFn: async ({ signal }) => {
      const res = await api.get(url, { signal });
      return res.data.data;
    },
    enabled: !!url,
    staleTime,
    placeholderData: defaultData !== null ? () => defaultData : undefined,
  });

  return {
    data:     data ?? defaultData,
    loading:  isLoading,
    fetching: isFetching,
    error:    error?.response?.data?.message || error?.message || null,
    refetch,
  };
}
