import { useReducedMotion } from './useReducedMotion';

export const useHeroPreviewMotion = () => {
  const { enabled, systemEnabled } = useReducedMotion();
  return enabled || systemEnabled;
};