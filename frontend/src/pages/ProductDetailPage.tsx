import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import { useParams } from 'react-router-dom';

function ProductDetailPage() {
  const { productId } = useParams();

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dettaglio Prodotto
        </Typography>
        <Typography variant="body1">
          ID Prodotto: {productId}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Questa pagina mostrerà i dettagli del prodotto, lo storico prezzi e consentirà di segnalare nuovi prezzi.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default ProductDetailPage;