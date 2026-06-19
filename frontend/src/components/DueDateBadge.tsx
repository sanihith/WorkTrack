import { Chip } from '@mui/material';

interface DueDateBadgeProps {
  dueDate: string;
  status?: string;
}

const getStatusStyle = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
      return { bgcolor: '#e8f5e9', color: '#2e7d32' };
    case 'REJECTED':
      return { bgcolor: '#ffebee', color: '#c62828' };
    case 'IN_PROGRESS':
      return { bgcolor: '#fff3e0', color: '#ef6c00' };
    case 'OPEN':
    default:
      return {};
  }
};

const DueDateBadge = ({ dueDate, status }: DueDateBadgeProps) => {
  return (
    <Chip
      label={`Due: ${dueDate}`}
      size="small"
      sx={getStatusStyle(status)}
    />
  );
};

export default DueDateBadge;