
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Configure body parsing, capturing raw body for Paddle signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Setup Supabase admin client for backend upserts
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hgcxsbdtvkrpdjyjgwuv.supabase.co';
const supabaseUrl = rawSupabaseUrl.startsWith('http') ? rawSupabaseUrl : 'https://' + rawSupabaseUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY3hzYmR0dmtycGRqeWpnd3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDU0ODcsImV4cCI6MjA3NjM4MTQ4N30.Wz6ho5eVeWSb8iYa0BunzghAwTGcfHVFn_rSU77yQsE';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Setup Paddle SDK client with optional fallback handler
let paddleClient: any = null;

function getResolvePaddleEnvironment(): 'sandbox' | 'production' {
  const token = process.env.PADDLE_CLIENT_TOKEN || '';
  if (token.startsWith('live_')) {
    return 'production';
  }
  if (token.startsWith('test_')) {
    return 'sandbox';
  }
  return process.env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
}

function getPaddleClient() {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return null;
  if (!paddleClient) {
    const resolvedEnv = getResolvePaddleEnvironment();
    console.log(`Setting up Paddle Node SDK Client in [${resolvedEnv}] environment.`);
    paddleClient = new Paddle(apiKey, {
      environment: resolvedEnv === 'production' ? Environment.production : Environment.sandbox
    });
  }
  return paddleClient;
}

// Grant premium subject access in Supabase helper
async function grantPremiumAccess(userId: string, subjectId: string) {
  try {
    console.log(`Granting premium subject access: User ID ${userId}, Subject ID ${subjectId}`);
    
    // Fetch user permissions first to preserve other languages/grades
    const { data: existing, error: getErr } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (getErr) {
      console.error('Error reading existing user permissions:', getErr);
    }

    let subjectAccess = existing?.subject_access ? { ...existing.subject_access } : {};
    
    // Default premium length: 1 year from now
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const expiryStr = expiryDate.toISOString();

    if (subjectId === 'all' || subjectId === 'all_subjects' || !subjectId) {
      // Fetch all subjects and unlock them all
      const { data: subjects } = await supabaseAdmin.from('subjects').select('id');
      if (subjects && subjects.length > 0) {
        subjects.forEach(s => {
          subjectAccess[s.id] = expiryStr;
        });
      }
    } else {
      subjectAccess[subjectId] = expiryStr;
    }

    const { error: upsertErr } = await supabaseAdmin
      .from('user_permissions')
      .upsert({
        user_id: userId,
        allowed_languages: existing?.allowed_languages || ['en', 'ar', 'ku_sorani', 'ku_badini'],
        allowed_grades: existing?.allowed_grades || [12],
        subject_access: subjectAccess,
        role: existing?.role || 'student'
      });

    if (upsertErr) {
      console.error('Error upserting permissions in Supabase:', upsertErr);
    } else {
      console.log(`Successfully updated active premium subscriptions for user: ${userId}`);
    }
  } catch (err) {
    console.error('Unexpected exception inside grantPremiumAccess:', err);
  }
}

const port = process.env.PORT || 3000;

// Serve static files from the dist directory
const distPath = path.join(__dirname, 'dist');

// Config endpoint returning Paddle public keys & prices safely
app.get('/api/billing/config', (req, res) => {
  res.json({
    clientToken: process.env.PADDLE_CLIENT_TOKEN || 'test_token_not_configured',
    environment: getResolvePaddleEnvironment(),
    prices: {
      monthly: process.env.PADDLE_MONTHLY_PRICE_ID || 'pri_01he97abc_monthly',
      annual: process.env.PADDLE_ANNUAL_PRICE_ID || 'pri_01he97xyz_annual'
    }
  });
});

// Paddle Webhook API handler (verifying signature with Paddle Node SDK)
app.post('/api/webhooks/paddle', async (req: any, res) => {
  const signature = req.headers['paddle-signature'] as string;
  const rawBody = req.rawBody ? req.rawBody.toString() : '';
  const secret = process.env.PADDLE_WEBHOOK_SECRET || '';

  console.log('Received Paddle Webhook transaction trigger.');

  const client = getPaddleClient();
  if (!client) {
    console.warn('Paddle client is NOT configured. Running dev/simulation processor bypass.');
    // Fallback parser for sandbox simulation without official keys set up yet
    try {
      const payload = req.body;
      const data = payload?.data;
      if (data && payload.event_type) {
        const customData = data.custom_data || {};
        const userId = customData.user_id || customData.userId;
        const subjectId = customData.subject_id || customData.subjectId || 'all_subjects';
        if (userId) {
          console.log(`[Simulator] Simulating webhook premium access trigger for User: ${userId}`);
          await grantPremiumAccess(userId, subjectId);
          return res.json({ success: true, processed: 'simulated_fallback' });
        }
      }
    } catch (e: any) {
      console.error('Error in simulator webhook bypass:', e.message);
    }
    return res.status(400).json({ error: 'Paddle is not yet configured with environment variables.' });
  }

  try {
    const event = client.webhooks.unmarshal(rawBody, secret, signature);
    const eventType = event.eventType;
    const data = event.data;
    
    console.log(`Verified Paddle Webhook Event: ${eventType}`);

    if (eventType === 'transaction.completed' || eventType === 'subscription.created' || eventType === 'subscription.updated') {
      const customData = data.customData || {};
      const userId = customData.userId || customData.user_id;
      const subjectId = customData.subjectId || customData.subject_id || 'all_subjects';

      if (userId) {
        await grantPremiumAccess(userId, subjectId);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Signature verification error:', err.message);
    res.status(400).json({ error: 'Signature verification check failed.' });
  }
});

// Simulation API endpoint for instant client-side testing (bypass checkout)
app.post('/api/billing/simulate-purchase', async (req: any, res) => {
  try {
    const { userId, subjectId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }
    console.log(`Direct purchase simulator: user ${userId}, subject ${subjectId}`);
    await grantPremiumAccess(userId, subjectId || 'all_subjects');
    return res.json({ success: true, message: 'Simulated payment succeeded and unlocked access.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to inject environment variables into index.html
app.get('/', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Inject variables
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hgcxsbdtvkrpdjyjgwuv.supabase.co';
    const supabaseUrl = rawSupabaseUrl.startsWith('http') ? rawSupabaseUrl : 'https://' + rawSupabaseUrl;
    
    const envScript = `
      <script>
        window.GEMINI_API_KEY = "${process.env.GEMINI_API_KEY || ''}";
        window.SUPABASE_URL = "${supabaseUrl}";
        window.SUPABASE_ANON_KEY = "${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY3hzYmR0dmtycGRqeWpnd3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDU0ODcsImV4cCI6MjA3NjM4MTQ4N30.Wz6ho5eVeWSb8iYa0BunzghAwTGcfHVFn_rSU77yQsE'}";
        
        // Also set them as global constants for compatibility
        var GEMINI_API_KEY = window.GEMINI_API_KEY;
        var SUPABASE_URL = window.SUPABASE_URL;
        var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
      </script>
    `;
    
    html = html.replace('</head>', `${envScript}</head>`);
    res.send(html);
  } else {
    // Fallback if dist/index.html doesn't exist yet (e.g. during dev)
    res.status(404).send('Not Found. Please build the app first.');
  }
});

app.use(express.static(distPath));

// Handle SPA routing - return index.html for all non-api routes
app.get('/*any', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    let rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hgcxsbdtvkrpdjyjgwuv.supabase.co';
    let supabaseUrl = rawSupabaseUrl.startsWith('http') ? rawSupabaseUrl : 'https://' + rawSupabaseUrl;
    
    const envScript = `
      <script>
        window.GEMINI_API_KEY = "${process.env.GEMINI_API_KEY || ''}";
        window.SUPABASE_URL = "${supabaseUrl}";
        window.SUPABASE_ANON_KEY = "${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY3hzYmR0dmtycGRqeWpnd3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDU0ODcsImV4cCI6MjA3NjM4MTQ4N30.Wz6ho5eVeWSb8iYa0BunzghAwTGcfHVFn_rSU77yQsE'}";
        
        var GEMINI_API_KEY = window.GEMINI_API_KEY;
        var SUPABASE_URL = window.SUPABASE_URL;
        var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
      </script>
    `;
    html = html.replace('</head>', `${envScript}</head>`);
    res.send(html);
  } else {
    res.status(404).send('Not Found');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
