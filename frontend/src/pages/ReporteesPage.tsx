import { Box } from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import ReporteesTab from '../components/ReporteesTab';

const ReporteesPage = () => {
  return (
    <DashboardLayout>
      <Box sx={{ py: 2 }}>
        <ReporteesTab />
      </Box>
    </DashboardLayout>
  );
};

export default ReporteesPage;
