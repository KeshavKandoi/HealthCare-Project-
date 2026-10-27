# Email codes for account signup and password recovery

The patient app uses Supabase Auth for account passwords and six digit email codes. It does not need a new OTP database table, JWT secret, or Resend API key for account authentication. Resend is used separately for caregiver blood pressure alerts.

In the **Healthcheckup** Supabase project, keep **Authentication → Providers → Email → Confirm email** enabled. Under **Authentication → Email Templates**, replace the link-based bodies for these two templates:

**Confirm sign up**

Subject: `Your Heartline verification code`

```html
<h2>Verify your Heartline account</h2>
<p>Enter this six digit code in the signup screen:</p>
<p><strong>{{ .Token }}</strong></p>
<p>If you did not create an account, you can ignore this email.</p>
```

**Reset password**

Subject: `Your Heartline password reset code`

```html
<h2>Reset your Heartline password</h2>
<p>Enter this six digit code in the password reset screen:</p>
<p><strong>{{ .Token }}</strong></p>
<p>If you did not request a reset, you can ignore this email.</p>
```

Save each template. The `{{ .Token }}` variable is provided by Supabase. Do not use `{{ .ConfirmationURL }}` in either body when the app expects users to type a code. No frontend Supabase secret is needed; the Render API calls Supabase with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.

Test with a new email address: sign up, enter the code, then sign in. For an existing confirmed account, use **Forgot password?**, enter its email, enter the recovery code, set a new password, and sign in with that password. Supabase may rate limit repeated code requests.
