export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Test endpoint
    if (request.url.endsWith('/test')) {
      return new Response('Worker is alive!', { 
        status: 200,
        headers: corsHeaders 
      })
    }

    if (request.method !== 'POST' || !request.url.endsWith('/send')) {
      return new Response('Not Found - Use POST /send', { status: 404 })
    }

    try {
      const payload = await request.json()
      const { bot_name, channel_id, message, parse_mode = 'Markdown' } = payload

      if (!bot_name || !channel_id || !message) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const tokenEnvKey = `BOT_TOKEN_${bot_name.toUpperCase()}`
      const botToken = env[tokenEnvKey]

      if (!botToken) {
        return new Response(JSON.stringify({ 
          error: `Bot token not found for ${bot_name}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channel_id,
          text: message,
          parse_mode: parse_mode
        })
      })

      const result = await telegramResponse.json()

      if (!result.ok) {
        return new Response(JSON.stringify({ 
          error: 'Telegram error', 
          details: result.description 
        }), {
          status: telegramResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

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
}
