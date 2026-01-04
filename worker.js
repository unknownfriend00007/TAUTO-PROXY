// Cloudflare Worker - Telegram Proxy
// Deploy this to Cloudflare Workers dashboard

// Bot tokens stored as environment secrets
// Example: BOT_TOKEN_NEWS = "123456:ABC-DEF..."

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST to /send
  if (request.method !== 'POST' || !request.url.endsWith('/send')) {
    return new Response('Not Found', { status: 404 })
  }

  try {
    const payload = await request.json()
    const { bot_name, channel_id, message, parse_mode = 'Markdown' } = payload

    // Validate input
    if (!bot_name || !channel_id || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get bot token from environment
    const tokenEnvKey = `BOT_TOKEN_${bot_name.toUpperCase()}`
    const botToken = await env[tokenEnvKey]

    if (!botToken) {
      return new Response(JSON.stringify({ error: `Bot token not found for ${bot_name}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Call Telegram API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    const telegramPayload = {
      chat_id: channel_id,
      text: message,
      parse_mode: parse_mode
    }

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload)
    })

    const result = await telegramResponse.json()

    if (!result.ok) {
      // Handle Telegram errors (including rate limits)
      return new Response(JSON.stringify({ 
        error: 'Telegram API error', 
        details: result.description 
      }), {
        status: telegramResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Success
    return new Response(JSON.stringify({ 
      success: true, 
      message_id: result.result.message_id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
