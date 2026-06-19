import { Chip } from '@mui/material';
import { getDueDateColorStyle } from '../utils/dateUtils';

interface DueDateBadgeProps {
  dueDate: string;
}

const DueDateBadge = ({ dueDate }: DueDateBadgeProps) => {
  return (
    <Chip
      label={`Due: ${dueDate}`}
      size="small"
      sx={getDueDateColorStyle(dueDate)}
    />
  );
};

export default DueDateBadge;