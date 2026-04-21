import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  Fab,
  Container,
  Chip,
  Avatar,
  Button,
} from '@mui/material';
import {
  Search,
  Add,
  TrendingDown,
  Store,
  ShoppingCart,
  LocationOn,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { productsApi, supermarketsApi } from '../services/api';
import { Product, Supermarket } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Get recent products
  const { data: productsResponse, isLoading: productsLoading } = useQuery(
    'recentProducts',
    () => productsApi.getAllProducts({ limit: 6 }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Get nearby supermarkets if location is available
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          // Handle error silently
        }
      );
    }
  }, []);

  const { data: supermarketsResponse, isLoading: supermarketsLoading } = useQuery(
    ['nearbySupermarkets', userLocation],
    () => 
      userLocation 
        ? supermarketsApi.getNearbySupermarkets(userLocation.lat, userLocation.lon, 10)
        : supermarketsApi.getAllSupermarkets({ limit: 6 }),
    {
      enabled: true,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  if (productsLoading && supermarketsLoading) {
    return <LoadingSpinner message="Caricamento dashboard..." />;
  }

  const products = productsResponse?.data || [];
  const supermarkets = supermarketsResponse?.data || [];

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 2 }}>
        {/* Welcome Header */}
        <Paper
          sx={{
            p: 4,
            mb: 4,
            background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Benvenuto, {user?.firstName}! 👋
          </Typography>
          <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
            Trova i prezzi più bassi per i tuoi prodotti preferiti
          </Typography>

          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Cerca prodotti per nome o codice a barre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    onClick={handleSearch}
                    variant="contained"
                    size="small"
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                    }}
                  >
                    Cerca
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.95)',
                borderRadius: 2,
              },
            }}
          />
        </Paper>

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <ShoppingCart sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">{products.length}+</Typography>
              <Typography variant="body2" color="text.secondary">
                Prodotti censiti
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Store sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6">{supermarkets.length}+</Typography>
              <Typography variant="body2" color="text.secondary">
                Supermercati
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <TrendingDown sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">€2.50</Typography>
              <Typography variant="body2" color="text.secondary">
                Risparmio medio
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <LocationOn sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">
                {userLocation ? '5 km' : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Raggio di ricerca
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Products */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Prodotti recenti
          </Typography>
          <Grid container spacing={2}>
            {products.map((product: Product) => (
              <Grid item xs={12} sm={6} md={4} key={product.id}>
                <Card>
                  <CardActionArea
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          src={product.image}
                          sx={{ width: 48, height: 48 }}
                        >
                          <ShoppingCart />
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle1" noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {product.brand || product.category}
                          </Typography>
                          <Box mt={1}>
                            <Chip
                              label={`€${product.lowestPrice.toFixed(2)}`}
                              color="primary"
                              size="small"
                              icon={<TrendingDown />}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box textAlign="center" mt={2}>
            <Button
              variant="outlined"
              onClick={() => navigate('/products')}
              size="large"
            >
              Vedi tutti i prodotti
            </Button>
          </Box>
        </Box>

        {/* Nearby Supermarkets */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            {userLocation ? 'Supermercati vicini' : 'Supermercati'}
          </Typography>
          <Grid container spacing={2}>
            {supermarkets.map((supermarket: Supermarket) => (
              <Grid item xs={12} sm={6} md={4} key={supermarket.id}>
                <Card>
                  <CardActionArea
                    onClick={() => navigate(`/supermarkets?id=${supermarket.id}`)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          src={supermarket.image}
                          sx={{ width: 48, height: 48 }}
                        >
                          <Store />
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle1" noWrap>
                            {supermarket.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {supermarket.address}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {supermarket.city}
                            {supermarket.distance && (
                              <> • {supermarket.distance.toFixed(1)} km</>
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box textAlign="center" mt={2}>
            <Button
              variant="outlined"
              onClick={() => navigate('/supermarkets')}
              size="large"
            >
              Vedi tutti i supermercati
            </Button>
          </Box>
        </Box>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
          onClick={() => navigate('/products?action=create')}
        >
          <Add />
        </Fab>
      </Box>
    </Container>
  );
}

export default HomePage;