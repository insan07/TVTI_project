import { useState, useCallback } from 'react';

export function useSelectionMode<T extends string = string>() {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<T[]>([]);

  const startSelection = useCallback((id: T) => {
    setIsSelectMode(true);
    setSelectedIds([id]);
  }, []);

  const toggleSelection = useCallback((id: T) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      if (next.length === 0) {
        setIsSelectMode(false);
      } else {
        setIsSelectMode(true);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: T[]) => {
    if (selectedIds.length === allIds.length && allIds.length > 0) {
      setSelectedIds([]);
      setIsSelectMode(false);
    } else {
      setSelectedIds(allIds);
      setIsSelectMode(true);
    }
  }, [selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setIsSelectMode(false);
  }, []);

  return {
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    setSelectedIds,
    startSelection,
    toggleSelection,
    selectAll,
    clearSelection,
    selectedCount: selectedIds.length,
  };
}

export default useSelectionMode;
