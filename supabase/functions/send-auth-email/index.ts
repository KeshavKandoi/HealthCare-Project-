import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

type HookPayload = {
  user: { email?: string };
  email_data: { email_action_type: string; token?: string };
};

const json = (status: number, body: object) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: { message: 'Method not allowed' } });
  const signingSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  if (!signingSecret || !apiKey || !from) return json(500, { error: { message: 'Email service is not configured' } });

  let payload: HookPayload;
  try {
    const verifier = new Webhook(signingSecret.replace(/^v1,whsec_/, ''));
    payload = verifier.verify(await request.text(), Object.fromEntries(request.headers)) as HookPayload;
  } catch {
    return json(401, { error: { message: 'Invalid webhook signature' } });
  }

  const action = payload.email_data?.email_action_type;
  const token = payload.email_data?.token;
  const email = payload.user?.email;
  if (!email || !token || !['signup', 'recovery'].includes(action)) {
    return json(400, { error: { message: 'Unsupported email request' } });
  }
  const isSignup = action === 'signup';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [email],
        subject: isSignup ? 'Your Heartline verification code' : 'Your Heartline password reset code',
        text: `Your Heartline ${isSignup ? 'verification' : 'password reset'} code is: ${token}\n\nIf you did not request this code, you can ignore this email.`,
      }),
    });
    if (!response.ok) return json(502, { error: { message: 'Unable to send email' } });
    return json(200, {});
  } catch {
    return json(502, { error: { message: 'Unable to send email' } });
  }
});
