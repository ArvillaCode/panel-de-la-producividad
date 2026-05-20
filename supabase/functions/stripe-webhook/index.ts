import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Stripe from 'npm:stripe@^14.16.0'
import { createClient } from 'npm:@supabase/supabase-js@^2.39.0'

// Instanciar Stripe
// Nota: Usamos STRIPE_SECRET_KEY para llamadas a la API (como recuperar customer)
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16', // Puedes ajustarlo a tu versión de API actual
  httpClient: Stripe.createFetchHttpClient(),
})

// Proveedor criptográfico necesario en entornos Deno/Edge para validar la firma
const cryptoProvider = Stripe.createSubtleCryptoProvider()

Deno.serve(async (req) => {
  // 1. Extraer la firma enviada por Stripe
  const signature = req.headers.get('Stripe-Signature')
  
  if (!signature) {
    return new Response('Falta la firma de Stripe (Stripe-Signature)', { status: 400 })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('Error interno: STRIPE_WEBHOOK_SECRET no está configurado')
    return new Response('Error de configuración del servidor', { status: 500 })
  }

  try {
    const body = await req.text()
    
    // 2. Validar la firma criptográfica para asegurar autenticidad
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    // 3. Inicializar el cliente Supabase de nivel Administrador (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ==============================================================================
    // EVENTO: PAGO COMPLETADO (NUEVO CLIENTE O RENOVACIÓN)
    // ==============================================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const email = session.customer_details?.email
      const name = session.customer_details?.name || 'Usuario Upfunnel'

      if (!email) {
        throw new Error('El payload no contiene un email de cliente (customer_details.email)')
      }

      console.log(`Procesando pago exitoso para: ${email}`)

      // A. Verificar si el usuario ya existe en la tabla de perfiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (profile) {
        // CASO A: Usuario ya registrado previamente
        console.log(`Actualizando perfil existente para ${email}`)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            status: 'active',
            is_approved: true,
            start_date: new Date().toISOString(),
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
          })
          .eq('id', profile.id)

        if (updateError) throw updateError

      } else {
        // CASO B: Usuario completamente nuevo (Creación on-the-fly)
        console.log(`Creando nueva cuenta de usuario para ${email}`)
        
        // Al no proveer "password", Supabase genera un usuario que debe ingresar vía Magic Link
        // El metadata inyectará `status` y `is_approved` directo al trigger `on_auth_user_created`
        const { error: createError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            name: name,
            status: 'active',
            is_approved: true
          }
        })

        if (createError) throw createError
      }
    } 
    
    // ==============================================================================
    // EVENTO: SUSCRIPCIÓN CANCELADA / ELIMINADA
    // ==============================================================================
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      
      // Necesitamos consultar la API de Stripe para obtener el email a partir del customer ID
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
      const email = customer.email

      if (email) {
        console.log(`Revocando acceso (suscripción cancelada) para: ${email}`)
        
        const { error: revokeError } = await supabase
          .from('profiles')
          .update({
            status: 'inactive',
            is_approved: false
          })
          .eq('email', email)

        if (revokeError) throw revokeError
      } else {
        console.warn(`No se pudo obtener el email para el customer_id: ${customerId}`)
      }
    }

    // 4. Retornar éxito a Stripe para confirmar la recepción
    return new Response(JSON.stringify({ received: true, type: event.type }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (err) {
    // Capturar errores (ej. firma inválida o falla de red)
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Webhook Error: ${errorMessage}`)
    
    // Devolvemos 400 para que Stripe reintente o registre la falla
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400,
      headers: { "Content-Type": "application/json" } 
    })
  }
})
