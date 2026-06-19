/**
 * Maps backend status values to user-friendly display labels.
 * The backend enum remains unchanged (OPEN, IN_PROGRESS, etc.)
 * but the UI shows friendlier names.
 */
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'TODO',
  IN_PROGRESS: 'IN PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
};

export const getStatusLabel = (status: string): string =>
  STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
