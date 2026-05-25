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

    // 4. Idempotency check: skip if this event was already processed
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle()

    if (existingEvent) {
      console.log(`[STRIPE] Evento duplicado ignorado: ${event.id}`)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Record event for idempotency
    await supabase.from('webhook_events').insert({
      stripe_event_id: event.id,
      type: event.type,
      processed_at: new Date().toISOString()
    }).catch(e => console.error('[STRIPE] Failed to record event idempotency:', e))

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

      // Store stripe_customer_id for future lookups
      const stripeCustomerId = session.customer as string

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
        const updatePayload: Record<string, unknown> = {
          status: 'active',
          is_approved: true
        }
        if (stripeCustomerId) {
          updatePayload.stripe_customer_id = stripeCustomerId
        }
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', profile.id)

        if (updateError) throw updateError

      } else {
        // CASO B: Usuario completamente nuevo (Creación on-the-fly)
        console.log(`Creando nueva cuenta de usuario para ${email}`)
        
        // Al no proveer "password", Supabase genera un usuario que debe ingresar vía Magic Link
        // El metadata inyectará `status` y `is_approved` directo al trigger `on_auth_user_created`
        const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            name: name
          }
        })

        if (createError) throw createError

        if (createdUser.user?.id) {
          const profilePayload: Record<string, unknown> = {
            id: createdUser.user.id,
            email,
            name,
            role: 'user',
            status: 'active',
            is_approved: true,
            start_date: new Date().toISOString(),
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
          }
          if (stripeCustomerId) {
            profilePayload.stripe_customer_id = stripeCustomerId
          }
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' })

          if (profileError) throw profileError
        }
      }
    } 
    
    // ==============================================================================
    // EVENTO: SUSCRIPCIÓN CANCELADA / ELIMINADA
    // ==============================================================================
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Try to find user by stripe_customer_id first (more reliable than email)
      const { data: profileByStripeId } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (profileByStripeId) {
        console.log(`Revocando acceso (suscripción cancelada) para: ${profileByStripeId.email}`)
        const { error: revokeError } = await supabase
          .from('profiles')
          .update({ status: 'inactive', is_approved: false })
          .eq('id', profileByStripeId.id)

        if (revokeError) throw revokeError
      } else {
        // Fallback: lookup by email via Stripe API
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const email = customer.email

        if (email) {
          console.log(`Revocando acceso (fallback email) para: ${email}`)
          const { error: revokeError } = await supabase
            .from('profiles')
            .update({ status: 'inactive', is_approved: false })
            .eq('email', email)

          if (revokeError) throw revokeError
        } else {
          console.warn(`No se pudo obtener el email para el customer_id: ${customerId}`)
        }
      }
    }

    // 4. Retornar éxito a Stripe para confirmar la recepción
    return new Response(JSON.stringify({ received: true, type: event.type }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Webhook Error: ${errorMessage}`)
    
    return new Response(JSON.stringify({ error: 'webhook_error' }), { 
      status: 400,
      headers: { "Content-Type": "application/json" } 
    })
  }
})
