import React from 'react';
import { Container, Typography, Paper, Box, Grid, Card, CardContent } from '@mui/material';
import { AdminPanelSettings, People, CheckCircle, Assignment } from '@mui/icons-material';

function AdminPage() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        <AdminPanelSettings sx={{ mr: 1, verticalAlign: 'middle' }} />
        Pannello Amministratore
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Gestione Utenti</Typography>
              <Typography variant="body2" color="text.secondary">
                Visualizza e gestisci tutti gli utenti registrati
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">Approvazioni</Typography>
              <Typography variant="body2" color="text.secondary">
                Gestisci le approvazioni di prodotti e prezzi
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">Report</Typography>
              <Typography variant="body2" color="text.secondary">
                Visualizza statistiche e report del sistema
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Funzionalità Amministrative
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Questa sezione conterrà le funzionalità complete di amministrazione del sistema.
        </Typography>
      </Paper>
    </Container>
  );
}

export default AdminPage;