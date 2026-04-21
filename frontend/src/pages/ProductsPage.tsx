import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  InputAdornment,
  Chip,
  Avatar,
  Fab,
  Container,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Search,
  Add,
  ShoppingCart,
  TrendingDown,
  QrCodeScanner,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { productsApi } from '../services/api';
import { Product, ProductFormData } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const productCategories = [
  'Alimentari',
  'Bevande',
  'Latticini',
  'Carne e Pesce',
  'Frutta e Verdura',
  'Panetteria',
  'Surgelati',
  'Cura della Persona',
  'Pulizia Casa',
  'Altro',
];

function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(
    searchParams.get('action') === 'create'
  );
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>();

  // Fetch products
  const { data: productsResponse, isLoading, refetch } = useQuery(
    ['products', searchTerm, selectedCategory],
    () => productsApi.getAllProducts({ 
      search: searchTerm || undefined,
      category: selectedCategory || undefined,
      limit: 50 
    }),
    {
      keepPreviousData: true,
    }
  );

  // Create product mutation
  const createProductMutation = useMutation(productsApi.createProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries('products');
      setShowCreateDialog(false);
      reset();
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Errore durante la creazione del prodotto');
    },
  });

  const products = productsResponse?.data || [];

  const handleSearch = () => {
    refetch();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const onSubmitProduct = async (data: ProductFormData) => {
    await createProductMutation.mutateAsync(data);
  };

  if (isLoading) {
    return <LoadingSpinner message="Caricamento prodotti..." />;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 2 }}>
        {/* Header */}
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Prodotti
        </Typography>

        {/* Search and Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
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
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Categoria"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="">Tutte le categorie</MenuItem>
                  {productCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                sx={{ py: 1.5 }}
              >
                Cerca
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Products Grid */}
        <Grid container spacing={2}>
          {products.map((product: Product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea
                  onClick={() => navigate(`/products/${product.id}`)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          src={product.image}
                          sx={{ width: 40, height: 40 }}
                        >
                          <ShoppingCart />
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle1" noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.barcode}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        {product.brand && `${product.brand} • `}
                        {product.category}
                      </Typography>

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Chip
                          label={`€${product.lowestPrice.toFixed(2)}`}
                          color="primary"
                          size="small"
                          icon={<TrendingDown />}
                        />
                        {product.approvedBy && (
                          <Chip
                            label="Verificato"
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {products.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
            <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Nessun prodotto trovato
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Prova a modificare i criteri di ricerca o aggiungi un nuovo prodotto
            </Typography>
            <Button
              variant="contained"
              onClick={() => setShowCreateDialog(true)}
              sx={{ mt: 2 }}
            >
              Aggiungi Prodotto
            </Button>
          </Paper>
        )}

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add product"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
          onClick={() => setShowCreateDialog(true)}
        >
          <Add />
        </Fab>

        {/* Create Product Dialog */}
        <Dialog
          open={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            setError('');
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Aggiungi Nuovo Prodotto</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box component="form" sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Nome Prodotto"
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register('name', {
                  required: 'Nome prodotto è obbligatorio',
                  minLength: {
                    value: 2,
                    message: 'Nome deve essere di almeno 2 caratteri',
                  },
                })}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Codice a Barre"
                error={!!errors.barcode}
                helperText={errors.barcode?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <QrCodeScanner />
                    </InputAdornment>
                  ),
                }}
                {...register('barcode', {
                  required: 'Codice a barre è obbligatorio',
                })}
              />

              <FormControl fullWidth margin="normal" required>
                <InputLabel>Categoria</InputLabel>
                <Select
                  label="Categoria"
                  defaultValue=""
                  {...register('category', {
                    required: 'Categoria è obbligatoria',
                  })}
                >
                  {productCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                margin="normal"
                fullWidth
                label="Marca (opzionale)"
                {...register('brand')}
              />

              <TextField
                margin="normal"
                fullWidth
                label="Descrizione (opzionale)"
                multiline
                rows={2}
                {...register('description')}
              />

              <TextField
                margin="normal"
                fullWidth
                label="URL Immagine (opzionale)"
                {...register('image')}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleSubmit(onSubmitProduct)}
              disabled={createProductMutation.isLoading}
              variant="contained"
            >
              {createProductMutation.isLoading ? 'Creazione...' : 'Crea Prodotto'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

export default ProductsPage;