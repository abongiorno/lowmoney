import React from 'react';
import { Container, Typography, Paper, Box, Tabs, Tab } from '@mui/material';
import { CheckCircle, PendingActions } from '@mui/icons-material';

function ApprovalPage() {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        <CheckCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
        Approvazioni
      </Typography>
      
      <Paper sx={{ mt: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            icon={<PendingActions />} 
            label="Prezzi in Attesa" 
            iconPosition="start"
          />
          <Tab 
            icon={<CheckCircle />} 
            label="Approvazioni Recenti" 
            iconPosition="start"
          />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Typography variant="body2" color="text.secondary">
              Questa sezione mostrerà i prezzi segnalati in attesa di approvazione.
            </Typography>
          )}
          {tabValue === 1 && (
            <Typography variant="body2" color="text.secondary">
              Questa sezione mostrerà lo storico delle approvazioni recenti.
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default ApprovalPage;