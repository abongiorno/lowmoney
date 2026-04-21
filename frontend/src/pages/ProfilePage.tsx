// React import removed for TypeScript compliance
import { Container, Typography, Paper, Box, Grid, Avatar, Button } from '@mui/material';
import { Person, Edit } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

function ProfilePage() {
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Il Mio Profilo
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              src={user?.profileImage}
              sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }}
            >
              <Person sx={{ fontSize: 50 }} />
            </Avatar>
            <Typography variant="h6">
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {user?.email}
            </Typography>
            <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
              {user?.role}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Informazioni Personali</Typography>
              <Button startIcon={<Edit />} variant="outlined">
                Modifica
              </Button>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Qui verranno mostrate le statistiche dell'utente, le segnalazioni effettuate e gli approvazioni.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ProfilePage;