import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Stripe from 'npm:stripe@^14.16.0'
import { createClient } from 'npm:@supabase/supabase-js@^2.39.0'

// Instanciar Stripe con la clave secreta configurada en el entorno
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Proveedor criptográfico necesario en entornos Deno/Edge para validar la firma de Stripe
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
    
    // 2. Validar la firma criptográfica del webhook
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    // 3. Inicializar el cliente Supabase con privilegios Service Role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Evitar duplicidad mediante control de idempotencia
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

    // Registrar evento procesado para idempotencia
    await supabase.from('webhook_events').insert({
      stripe_event_id: event.id,
      type: event.type,
      processed_at: new Date().toISOString()
    }).catch(e => console.error('[STRIPE] Falló registro de idempotencia:', e))

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

      const stripeCustomerId = session.customer as string
      console.log(`[STRIPE] Procesando pago exitoso para: ${email}`)

      // A. Consultar la suscripción de forma dinámica en Stripe para deducir el plan y vigencia
      const subscriptionId = session.subscription as string
      let plan = 'monthly' // por defecto
      let endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1) // por defecto +1 mes

      if (subscriptionId) {
        try {
          console.log(`[STRIPE] Recuperando detalles de suscripción: ${subscriptionId}`)
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          const interval = sub.items.data[0]?.price?.recurring?.interval // 'month' o 'year'
          if (interval === 'year') {
            plan = 'annual'
            endDate = new Date()
            endDate.setFullYear(endDate.getFullYear() + 1)
            console.log(`[STRIPE] Plan ANUAL detectado. Vence el: ${endDate.toISOString()}`)
          } else {
            plan = 'monthly'
            endDate = new Date()
            endDate.setMonth(endDate.getMonth() + 1)
            console.log(`[STRIPE] Plan MENSUAL detectado. Vence el: ${endDate.toISOString()}`)
          }
        } catch (e) {
          console.error(`[STRIPE] Error al recuperar detalles de suscripción ${subscriptionId}:`, e)
        }
      }

      // B. Verificar existencia de perfil del usuario en la base de datos
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      let targetUserId: string | null = null

      if (profile) {
        targetUserId = profile.id
        // CASO A: Usuario ya registrado previamente (Renovación o Upgrade)
        console.log(`[STRIPE] Actualizando perfil existente de ${email} a plan: ${plan}`)
        const updatePayload: Record<string, unknown> = {
          status: 'active',
          is_approved: true,
          plan: plan,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString()
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
        // CASO B: Usuario completamente nuevo (Creación passwordless)
        console.log(`[STRIPE] Creando nueva cuenta de usuario para: ${email}`)
        
        // Al no proveer "password", Supabase genera un usuario sin contraseña que ingresará por Magic Link
        const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            name: name
          }
        })

        if (createError) throw createError

        if (createdUser.user?.id) {
          targetUserId = createdUser.user.id
          const profilePayload: Record<string, unknown> = {
            id: createdUser.user.id,
            email,
            name,
            role: 'user',
            status: 'active',
            is_approved: true,
            plan: plan,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString()
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

      if (targetUserId) {
        console.log(`[STRIPE] Registrando transacción exitosa en base de datos para: ${email}`)
        const { error: paymentError } = await supabase.from('payments').insert({
          user_id: targetUserId,
          amount: session.amount_total,
          currency: session.currency || 'usd',
          status: 'succeeded',
          source: 'stripe',
          payment_method: session.payment_method_types?.[0] || 'credit_card',
          processor_payment_id: session.payment_intent as string || session.id,
          processor_customer_id: stripeCustomerId,
          processor_event_id: event.id,
          product_name: `Suscripción Upfunnel - Plan ${plan.toUpperCase()}`,
          plan_type: plan,
          description: `Activación/Renovación automatizada del plan: ${plan.toUpperCase()}`,
          paid_at: new Date().toISOString(),
          is_estimated: false,
          metadata: {
            stripe_session_id: session.id,
            stripe_subscription_id: subscriptionId
          }
        })

        if (paymentError) {
          console.error('[STRIPE] Error al registrar pago en base de datos:', paymentError)
        }
      }
    } 
    
    // ==============================================================================
    // EVENTO: SUSCRIPCIÓN CANCELADA / ELIMINADA (SEGURIDAD Y CONTROL DE FALLBACK)
    // ==============================================================================
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Intentar encontrar el perfil por stripe_customer_id (método 100% fiable)
      const { data: profileByStripeId } = await supabase
        .from('profiles')
        .select('id, email, is_legacy_fallback')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (profileByStripeId) {
        if (profileByStripeId.is_legacy_fallback) {
          console.log(`[STRIPE] Reversión a plan legacy (suscripción cancelada con fallback activo) para: ${profileByStripeId.email}`)
          const { error: fallbackError } = await supabase
            .from('profiles')
            .update({
              plan: 'legacy',
              end_date: null,
              status: 'active',
              is_approved: true
            })
            .eq('id', profileByStripeId.id)

          if (fallbackError) throw fallbackError
        } else {
          console.log(`[STRIPE] Revocando acceso absoluto (suscripción cancelada sin fallback) para: ${profileByStripeId.email}`)
          const { error: revokeError } = await supabase
            .from('profiles')
            .update({
              status: 'inactive',
              is_approved: false
            })
            .eq('id', profileByStripeId.id)

          if (revokeError) throw revokeError
        }
      } else {
        // Fallback secundario: buscar por email mediante la API de Stripe
        console.log(`[STRIPE] stripe_customer_id no encontrado localmente. Buscando cliente en Stripe API...`)
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const email = customer.email

        if (email) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('id, email, is_legacy_fallback')
            .eq('email', email)
            .maybeSingle()

          if (profileByEmail) {
            if (profileByEmail.is_legacy_fallback) {
              console.log(`[STRIPE] Reversión a plan legacy (suscripción cancelada con fallback activo - fallback email) para: ${email}`)
              const { error: fallbackError } = await supabase
                .from('profiles')
                .update({
                  plan: 'legacy',
                  end_date: null,
                  status: 'active',
                  is_approved: true
                })
                .eq('id', profileByEmail.id)

              if (fallbackError) throw fallbackError
            } else {
              console.log(`[STRIPE] Revocando acceso absoluto (suscripción cancelada sin fallback - fallback email) para: ${email}`)
              const { error: revokeError } = await supabase
                .from('profiles')
                .update({
                  status: 'inactive',
                  is_approved: false
                })
                .eq('id', profileByEmail.id)

              if (revokeError) throw revokeError
            }
          } else {
            console.warn(`[STRIPE] No se encontró perfil para el email de fallback: ${email}`)
          }
        } else {
          console.warn(`[STRIPE] No se pudo obtener el email del customer_id: ${customerId}`)
        }
      }
    }
    
    // ==============================================================================
    // EVENTO: REEMBOLSO PROCESADO EN STRIPE
    // ==============================================================================
    else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const email = charge.billing_details?.email

      if (email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, plan')
          .eq('email', email)
          .maybeSingle()

        if (profile) {
          console.log(`[STRIPE] Registrando reembolso real para ${email} de ${charge.amount_refunded} centavos`)
          const { error: refundError } = await supabase.from('payments').insert({
            user_id: profile.id,
            amount: charge.amount_refunded, // Monto positivo
            currency: charge.currency,
            status: 'refunded',
            source: 'stripe',
            payment_method: charge.payment_method_details?.type || 'credit_card',
            processor_payment_id: `${charge.id}_refund`,
            processor_customer_id: charge.customer as string,
            processor_event_id: event.id,
            product_name: 'Reembolso de suscripción',
            plan_type: profile.plan,
            description: `Reembolso procesado en Stripe: ${charge.failure_message || 'Solicitado por cliente'}`,
            paid_at: new Date().toISOString(),
            is_estimated: false,
            metadata: {
              stripe_charge_id: charge.id,
              refund_reason: charge.refunds?.data?.[0]?.reason || 'manual'
            }
          })

          if (refundError) throw refundError
        } else {
          console.warn(`[STRIPE] No se encontró perfil para el email de reembolso: ${email}`)
        }
      } else {
        console.warn(`[STRIPE] No se pudo obtener el email del cargo reembolsado: ${charge.id}`)
      }
    }

    return new Response(JSON.stringify({ received: true, type: event.type }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[STRIPE-ERROR] Webhook Error: ${errorMessage}`)
    
    return new Response(JSON.stringify({ error: 'webhook_error', message: errorMessage }), { 
      status: 400,
      headers: { "Content-Type": "application/json" } 
    })
  }
})
