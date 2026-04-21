import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Search,
  LocationOn,
  Phone,
  Language,
  Directions,
  Add,
  Store
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { supermarketsApi } from '../services/api';
import { Supermarket } from '../types';

function SupermarketsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [filteredSupermarkets, setFilteredSupermarkets] = useState<Supermarket[]>([]);

  // Fetch supermarkets
  const {
    data: supermarketsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['supermarkets', { search: searchTerm, city: selectedCity }],
    () => supermarketsApi.getAllSupermarkets({ 
      search: searchTerm || undefined,
      city: selectedCity || undefined,
      limit: 50
    }),
    {
      enabled: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const supermarkets = supermarketsData?.data || [];

  // Filter supermarkets based on search and city
  useEffect(() => {
    let filtered = supermarkets;
    
    if (searchTerm) {
      filtered = filtered.filter(supermarket =>
        supermarket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supermarket.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supermarket.chain?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCity) {
      filtered = filtered.filter(supermarket =>
        supermarket.city.toLowerCase() === selectedCity.toLowerCase()
      );
    }
    
    setFilteredSupermarkets(filtered);
  }, [supermarkets, searchTerm, selectedCity]);

  // Get unique cities for filter
  const cities = [...new Set(supermarkets.map(s => s.city))].sort();

  const handleSearch = () => {
    refetch();
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCity('');
  };

  const getDirections = (supermarket: Supermarket) => {
    // Usa sempre l'indirizzo completo per una migliore precisione
    const fullAddress = `${supermarket.address}, ${supermarket.city}`;
    const addressQuery = encodeURIComponent(fullAddress);
    const url = `https://maps.google.com/maps?daddr=${addressQuery}`;
    window.open(url, '_blank');
  };

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Errore nel caricamento dei supermercati. Riprova più tardi.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Supermercati
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Trova i supermercati vicino a te e confronta i prezzi dei tuoi prodotti preferiti
          </Typography>
        </Box>

        {/* Search and Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Cerca per nome, catena o indirizzo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Città</InputLabel>
                <Select
                  value={selectedCity}
                  label="Città"
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <MenuItem value="">Tutte le città</MenuItem>
                  {cities.map((city) => (
                    <MenuItem key={city} value={city}>
                      {city}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={isLoading}
                  startIcon={<Search />}
                >
                  Cerca
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  Reset
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Results */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {isLoading ? (
              'Caricamento...'
            ) : (
              `${filteredSupermarkets.length} supermercati trovati`
            )}
          </Typography>
        </Box>

        {/* Loading */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Supermarkets Grid */}
        {!isLoading && (
          <>
            {filteredSupermarkets.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Store sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Nessun supermercato trovato
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prova a modificare i criteri di ricerca
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {filteredSupermarkets.map((supermarket) => (
                  <Grid item xs={12} md={6} lg={4} key={supermarket.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4,
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: 'primary.main',
                              mr: 2,
                              width: 56,
                              height: 56,
                            }}
                          >
                            <Store />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom>
                              {supermarket.name}
                            </Typography>
                            {supermarket.chain && (
                              <Chip
                                label={supermarket.chain}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mb: 1 }}
                              />
                            )}
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOn
                              sx={{ color: 'text.secondary', mr: 1, fontSize: 16 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {supermarket.address}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                            {supermarket.city}
                            {supermarket.distance && (
                              <> • {supermarket.distance.toFixed(1)} km</>
                            )}
                          </Typography>
                        </Box>

                        {supermarket.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Phone
                              sx={{ color: 'text.secondary', mr: 1, fontSize: 16 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {supermarket.phone}
                            </Typography>
                          </Box>
                        )}

                        {supermarket.website && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Language
                              sx={{ color: 'text.secondary', mr: 1, fontSize: 16 }}
                            />
                            <Typography
                              variant="body2"
                              component="a"
                              href={supermarket.website}
                              target="_blank"
                              rel="noopener"
                              sx={{
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              Sito web
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ mt: 'auto' }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Directions />}
                            onClick={() => getDirections(supermarket)}
                          >
                            Ottieni indicazioni
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* Add Supermarket FAB */}
        <Tooltip title="Aggiungi supermercato" placement="left">
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
            }}
            onClick={() => {
              // TODO: Navigate to add supermarket page
              console.log('Add supermarket clicked');
            }}
          >
            <Add />
          </Fab>
        </Tooltip>
      </Box>
    </Container>
  );
}

export default SupermarketsPage;