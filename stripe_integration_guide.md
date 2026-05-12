# Guía de Integración de Stripe - Upfunnel

Esta guía detalla los pasos para integrar enlaces de pago de Stripe para la suscripción anual de $50 USD.

## 1. Crear el Producto en Stripe
1. Inicia sesión en tu [Dashboard de Stripe](https://dashboard.stripe.com/).
2. Ve a **Product Catalog** > **Add Product**.
3. Nombre: `Upfunnel - Suscripción Anual`.
4. Precio: `50.00` USD.
5. Frecuencia: `Yearly` (o Pago único según prefieras).

## 2. Generar el Payment Link
1. Una vez creado el producto, haz clic en **Create Payment Link**.
2. Configura la página de confirmación para que redirija a: `https://app.upfunnel.click/login?status=success`.
3. Copia el enlace generado (ej: `https://buy.stripe.com/test_...`).

## 3. Integración en la Landing Page
En el archivo `LandingPage.jsx`, busca la función `handleAction` y actualízala:

```javascript
const handleAction = () => {
  // Reemplaza esto con tu enlace real de Stripe
  window.open('TU_ENLACE_DE_STRIPE_AQUI', '_blank');
};
```

## 4. Webhooks (Opcional pero Recomendado)
Para automatizar la activación de usuarios tras el pago:
1. Configura un Webhook en Stripe para el evento `checkout.session.completed`.
2. Crea una Edge Function en Supabase que reciba el webhook y actualice el campo `status = 'active'` en la tabla `profiles` usando el email del cliente.

---
*Nota: Para pruebas iniciales, utiliza el modo **Test Mode** de Stripe.*
