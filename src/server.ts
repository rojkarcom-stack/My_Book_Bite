
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

try {
  dotenv.config();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = fs.existsSync(path.join(process.cwd(), 'dist/index.html'))
    ? path.join(process.cwd(), 'dist')
    : (fs.existsSync(path.join(__dirname, '../dist/index.html'))
        ? path.join(__dirname, '../dist')
        : path.join(__dirname, 'dist'));

  const app = express();
  app.use(cors());
  app.use(express.json());

  const port = process.env.BACKEND_PORT || process.env.PORT || 3000;
  console.log(`Initializing Classroom Quiz Server on port ${port}...`);
  
  // Public SEO endpoints
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: https://school-quiz-pro.web.app/sitemap.xml`);
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://school-quiz-pro.web.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://school-quiz-pro.web.app/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

// Visitor analytics
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', port: port, timestamp: new Date().toISOString() });
  });
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hgcxsbdtvkrpdjyjgwuv.supabase.co';
const supabaseUrl = rawSupabaseUrl.startsWith('http') ? rawSupabaseUrl : 'https://' + rawSupabaseUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY3hzYmR0dmtycGRqeWpnd3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDU0ODcsImV4cCI6MjA3NjM4MTQ4N30.Wz6ho5eVeWSb8iYa0BunzghAwTGcfHVFn_rSU77yQsE';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Under Construction state persistence (Deprecated)
const stateFilePath = path.join(__dirname, 'under_construction_state.json');
try {
  if (fs.existsSync(stateFilePath)) {
    fs.unlinkSync(stateFilePath);
  }
} catch (e) {
  // Ignore
}

// Robust administrative check helper with self-healing profiles capability
async function checkIsAdmin(user: any): Promise<boolean> {
  const hardcodedAdmins = ['rojkarcom@gmail.com', 'wlat.ibrahim@gmail.com'];
  const isHardcoded = hardcodedAdmins.includes(user.email?.toLowerCase());
  
  if (isHardcoded) {
    try {
      // Self-healing: make sure is_admin is true in the database profiles table
      const { data: profile, error: getErr } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (getErr || !profile || !profile.is_admin) {
        console.log(`Self-healing: promoting ${user.email} with id ${user.id} to admin in the profiles database...`);
        const { error: upsertErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            is_admin: true
          }, { onConflict: 'id' });
        if (upsertErr) {
          console.error('Failed to promote hardcoded admin user in database profiles table:', upsertErr);
        } else {
          console.log(`Successfully promoted ${user.email} in database profiles table.`);
        }
      }
    } catch (dbErr) {
      console.error('Error during self-healing checkIsAdmin:', dbErr);
    }
    return true; // Hardcoded admins always return true
  }

  // Otherwise check profiles
  try {
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileErr && profile && profile.is_admin) {
      return true;
    }
  } catch (err) {
    console.error('Error in checkIsAdmin DB check:', err);
  }

  return false;
}

app.get('/api/settings/under-construction', (req, res) => {
  res.json({ underConstruction: false });
});

app.post('/api/settings/under-construction', (req: any, res) => {
  return res.json({ success: true, underConstruction: false });
});

// Robust User-Agent parser helper for visitor metrics
function parseUserAgent(ua: string = '') {
  const uaLower = ua.toLowerCase();
  let browser = 'Other';
  if (uaLower.includes('firefox')) browser = 'Firefox';
  else if (uaLower.includes('chrome') || uaLower.includes('chromium')) browser = 'Chrome';
  else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser = 'Safari';
  else if (uaLower.includes('edge') || uaLower.includes('edg')) browser = 'Edge';
  else if (uaLower.includes('msie') || uaLower.includes('trident')) browser = 'IE';
  
  let device = 'Desktop';
  if (uaLower.includes('mobi') || uaLower.includes('android') || uaLower.includes('iphone') || uaLower.includes('ipod')) {
    device = 'Mobile';
  } else if (uaLower.includes('ipad') || uaLower.includes('tablet') || uaLower.includes('playbook') || uaLower.includes('kindle')) {
    device = 'Tablet';
  }
  
  return { browser, device };
}

// Visitor stats persistence config
const visitorFilePath = path.join(__dirname, 'visitor_stats.json');
let visitorStats = {
  totalViews: 0,
  uniqueVisitorIds: [] as string[],
  dailyStats: {} as Record<string, { views: number; visitors: number }>,
  recentVisits: [] as any[]
};

try {
  if (fs.existsSync(visitorFilePath)) {
    const data = JSON.parse(fs.readFileSync(visitorFilePath, 'utf8'));
    visitorStats = {
      totalViews: Number(data.totalViews || 0),
      uniqueVisitorIds: Array.isArray(data.uniqueVisitorIds) ? data.uniqueVisitorIds : [],
      dailyStats: data.dailyStats || {},
      recentVisits: Array.isArray(data.recentVisits) ? data.recentVisits : []
    };
    console.log(`Loaded visitor statistics: ${visitorStats.totalViews} total views, ${visitorStats.uniqueVisitorIds.length} unique visitors.`);
  } else {
    // Write an initial empty file
    fs.writeFileSync(visitorFilePath, JSON.stringify(visitorStats, null, 2), 'utf8');
  }
} catch (e) {
  console.error('Failed to read or init visitor stats file:', e);
}

function saveVisitorStats() {
  try {
    fs.writeFileSync(visitorFilePath, JSON.stringify(visitorStats, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write visitor stats file:', e);
  }
}

// Public API endpoint: track visitor page view
app.post('/api/analytics/track-visit', (req, res) => {
  try {
    const { visitorId, language, email } = req.body;
    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId parameter is required' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    const rawUa = req.headers['user-agent'] || '';
    const { browser, device } = parseUserAgent(rawUa);
    
    // Register total page view count
    visitorStats.totalViews++;

    // Track unique visitor status
    const isNewVisitor = !visitorStats.uniqueVisitorIds.includes(visitorId);
    if (isNewVisitor) {
      visitorStats.uniqueVisitorIds.push(visitorId);
      // Prevent unbounded memory footprint by keeping maximum of 10k unique IDs in file cache
      if (visitorStats.uniqueVisitorIds.length > 10000) {
        visitorStats.uniqueVisitorIds.shift();
      }
    }

    // Capture daily statistics mapped by date key (YYYY-MM-DD in local time)
    const todayStr = new Date().toISOString().split('T')[0];
    if (!visitorStats.dailyStats[todayStr]) {
      visitorStats.dailyStats[todayStr] = { views: 0, visitors: 0 };
    }
    
    visitorStats.dailyStats[todayStr].views++;
    if (isNewVisitor) {
      visitorStats.dailyStats[todayStr].visitors++;
    }

    // Limit daily chart history to most recent 90 days
    const dayKeys = Object.keys(visitorStats.dailyStats);
    if (dayKeys.length > 90) {
      const sortedDays = dayKeys.sort();
      delete visitorStats.dailyStats[sortedDays[0]]; // remove the oldest
    }

    // Record visitor session registration details
    const cleanIp = String(ip).split(',')[0].trim();
    const visitorRecord = {
      timestamp: new Date().toISOString(),
      language: language || 'en',
      browser,
      device,
      email: email || 'Anonymous Student',
      ip: cleanIp === '::1' || cleanIp === '127.0.0.1' ? 'Local System' : cleanIp
    };

    visitorStats.recentVisits.unshift(visitorRecord);
    if (visitorStats.recentVisits.length > 100) {
      visitorStats.recentVisits.pop(); // keep last 100 visits max
    }

    saveVisitorStats();

    return res.json({
      success: true,
      totalViews: visitorStats.totalViews,
      uniqueCount: visitorStats.uniqueVisitorIds.length
    });
  } catch (err: any) {
    console.error('Error tracking client visit:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Admin-Secure API endpoint: fetch visitor analytics
app.get('/api/analytics/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: No authorization token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(token);
    if (jwtError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session' });
    }
    
    const isAuthorized = await checkIsAdmin(user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Requester does not have administrator privileges' });
    }

    return res.json({
      totalViews: visitorStats.totalViews,
      uniqueCount: visitorStats.uniqueVisitorIds.length,
      dailyStats: visitorStats.dailyStats,
      recentVisits: visitorStats.recentVisits
    });
  } catch (err: any) {
    console.error('Error during visitor analytics extraction:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Helper to check premium status
async function isUserPremium(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  
  if (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
  
  return data?.plan === "premium" || data?.plan === "pro";
}

// Grant premium subject access in Supabase helper
async function grantPremiumAccess(
  userId: string, 
  subjectIdOrLang: string, 
  fallbackEmail?: string, 
  gradeSelection?: { grade: number; language: string; branch?: string | null }
) {
  try {
    console.log(`Granting premium subject access: User ID ${userId}, Subject ID/Language ${subjectIdOrLang}, Has Grade Selection: ${!!gradeSelection}`);
    
    let userEmail = fallbackEmail || 'user@example.com';
    let finalUserId: string | null = null;

    // Helper regex to check UUID format to avoid Postgres casting errors
    const isValidUUID = (id: string): boolean => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    };

    // 1. Try to find the user in Supabase auth system if userId looks like a valid UUID
    let userExistsInAuth = false;
    if (userId && isValidUUID(userId)) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUser?.user) {
          userExistsInAuth = true;
          finalUserId = authUser.user.id;
          if (authUser.user.email) {
            userEmail = authUser.user.email;
          }
        }
      } catch (authErr) {
        console.warn('Could not fetch user by ID from auth admin:', authErr);
      }
    }

    // 2. If not found by ID or if ID is invalid, check if user exists under fallback email in auth system
    if (!userExistsInAuth && userEmail && userEmail !== 'user@example.com') {
      try {
        const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && userData?.users) {
          const foundUser = userData.users.find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase());
          if (foundUser) {
            userExistsInAuth = true;
            finalUserId = foundUser.id;
            userEmail = foundUser.email || userEmail;
            console.log(`Self-healed: found matching auth user ID ${finalUserId} for email ${userEmail}`);
          }
        }
      } catch (listErr) {
        console.warn('Could not list users from auth admin:', listErr);
      }
    }

    // 3. If STILL not found anywhere in auth.users and we have a valid email, auto-create this user in auth.users
    if (!userExistsInAuth && userEmail && userEmail !== 'user@example.com') {
      try {
        console.log(`Attempting to auto-create auth user for ${userEmail} because they paid but do not exist in Auth yet.`);
        const { data: newUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: { is_premium_pending: true }
        });

        if (newUser?.user) {
          userExistsInAuth = true;
          finalUserId = newUser.user.id;
          console.log(`Successfully auto-created auth user with ID ${finalUserId} for email ${userEmail}`);
        } else {
          console.error('Failed to create auth user:', createAuthErr);
        }
      } catch (createErr) {
        console.error('Exception when auto-creating auth user:', createErr);
      }
    }

    // 4. Default to standard/simulated fallback only if no valid auth registry could be generated
    if (!finalUserId || !isValidUUID(finalUserId)) {
      console.error(`Cannot grant access: no valid auth user could be found or created for ID "${userId}" / email "${userEmail}"`);
      return;
    }

    // Map to verified auth user UUID
    userId = finalUserId;

    // Safely check if the profile exists first
    const { data: existingProfile, error: profileGetErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (profileGetErr) {
      console.error('Error reading profiles from Supabase:', JSON.stringify(profileGetErr, null, 2));
    }

    if (existingProfile) {
      // Just update the plan to pro
      const { error: profileUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({ plan: 'pro' })
        .eq('id', userId);
      if (profileUpdateErr) {
        console.error('Error updating existing profile plan:', JSON.stringify(profileUpdateErr, null, 2));
      }
    } else {
      // Profile does not exist. Check for email unique constraint conflict first.
      const { data: profileWithEmail } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (profileWithEmail) {
        console.warn(`Email ${userEmail} already registered to profile ${profileWithEmail.id}. Altering ID mapping to matching primary key instead of target input ID ${userId}.`);
        userId = profileWithEmail.id;
        
        // Update plan of the matching user
        await supabaseAdmin
          .from('profiles')
          .update({ plan: 'pro' })
          .eq('id', userId);
      } else {
        // Safe to insert new profile
        const { error: profileInsertErr } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            plan: 'pro'
          });
        if (profileInsertErr) {
          console.error('Error inserting new profile record:', JSON.stringify(profileInsertErr, null, 2));
        }
      }
    }

    // Fetch user permissions first to preserve other languages/grades
    const { data: existing, error: getErr } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (getErr) {
      console.error('Error reading existing user permissions:', JSON.stringify(getErr, null, 2));
    }

    let subjectAccess = existing?.subject_access ? { ...existing.subject_access } : {};
    
    // Default premium length: 1 year from now
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const expiryStr = expiryDate.toISOString();

    if (gradeSelection) {
      // Query subjects matching selected grade, language, branch
      const { grade, language, branch } = gradeSelection;
      console.log(`Unlocking specific subjects for selection: Language=${language}, Grade=${grade}, Branch=${branch}`);
      
      // Let's verify and deduct 29.9 tokens from the student's account
      const isAdminUser = userEmail === 'rojkarcom@gmail.com' || userEmail === 'wlat.ibrahim@gmail.com' || !!(existingProfile as any)?.is_admin || existing?.is_premium;
      const currentTokens = Number(subjectAccess['tokens_balance'] || 0);
      
      if (!isAdminUser) {
        if (currentTokens < 29.9) {
          throw new Error('Insufficient tokens to unlock this grade curriculum. Please purchase a token first ($29.90).');
        }
        subjectAccess['tokens_balance'] = Number((currentTokens - 29.9).toFixed(2));
        console.log(`Deducted 29.9 pro tokens from user ${userId}. Remaining: ${subjectAccess['tokens_balance']}`);
      } else {
        console.log(`User is admin/master premium. Bypassing token deduction.`);
      }

      let query = supabaseAdmin
        .from('subjects')
        .select('id')
        .eq('grade', Number(grade))
        .eq('language', language);
        
      if (branch) {
        query = query.eq('branch', branch);
      } else {
        query = query.is('branch', null);
      }

      const { data: subjects, error: subjErr } = await query;
      if (subjErr) {
        console.error('Error querying matching subjects:', JSON.stringify(subjErr, null, 2));
      } else if (subjects && subjects.length > 0) {
        console.log(`Unlocking ${subjects.length} subjects for user ${userId}`);
        subjects.forEach(s => {
          subjectAccess[s.id] = expiryStr;
        });
      } else {
        console.warn(`No subjects matching language=${language}, grade=${grade}, branch=${branch} were found in the database.`);
      }
    } else {
      // Regular payment completed or direct simulator purchase without grade Selection.
      // This represents buying a credit token worth $29.90.
      const currentTokens = Number(subjectAccess['tokens_balance'] || 0);
      subjectAccess['tokens_balance'] = Number((currentTokens + 29.9).toFixed(2));
      console.log(`Successfully added 29.9 pro tokens to user ${userId} via standard purchase. Total available tokens: ${subjectAccess['tokens_balance']}`);
    }

    let allowedGrades = existing?.allowed_grades ? [...existing.allowed_grades] : [12];
    if (gradeSelection && !allowedGrades.includes(Number(gradeSelection.grade))) {
      allowedGrades.push(Number(gradeSelection.grade));
    }

    let allowedLanguages = existing?.allowed_languages ? [...existing.allowed_languages] : ['en', 'ar', 'ku_sorani', 'ku_badini'];
    if (gradeSelection && !allowedLanguages.includes(gradeSelection.language as any)) {
      allowedLanguages.push(gradeSelection.language as any);
    }

    // Set is_premium to true only if they are an admin or master account, to ensure students use grade tokens.
    const isAdminUser = userEmail === 'rojkarcom@gmail.com' || userEmail === 'wlat.ibrahim@gmail.com' || !!(existingProfile as any)?.is_admin || existing?.role === 'admin';
    const shouldBePremium = isAdminUser ? true : false;

    const upsertPayload: any = {
      user_id: userId,
      allowed_languages: allowedLanguages,
      allowed_grades: allowedGrades,
      subject_access: subjectAccess,
      is_premium: shouldBePremium
    };

    let { error: upsertErr } = await supabaseAdmin
      .from('user_permissions')
      .upsert(upsertPayload, { onConflict: 'user_id' });

    if (upsertErr && JSON.stringify(upsertErr).includes('is_premium')) {
      console.warn('Omit is_premium from user_permissions upsert due to schema cache restrictions.');
      delete upsertPayload.is_premium;
      const secondTry = await supabaseAdmin
        .from('user_permissions')
        .upsert(upsertPayload, { onConflict: 'user_id' });
      upsertErr = secondTry.error;
    }

    if (upsertErr) {
      console.error('Error upserting permissions in Supabase:', JSON.stringify(upsertErr, null, 2));
    } else {
      console.log(`Successfully updated active premium subscriptions & tokens for user: ${userId}`);
    }
  } catch (err) {
    console.error('Unexpected exception inside grantPremiumAccess:', err);
  }
}

// Serve static files from the dist directory
// Note: During dev, dist/index.html might not exist, but express.static won't crash.

// Config endpoint returning Freemius keys & prices safely
app.get('/api/billing/config', (req, res) => {
  try {
    res.json({
      pluginId: process.env.FREEMIUS_PLUGIN_ID || '31983',
      publicKey: process.env.FREEMIUS_PUBLIC_KEY || 'pk_mock_public_key',
      plans: {
        monthly: process.env.FREEMIUS_MONTHLY_PLAN_ID || '52466',
        annual: process.env.FREEMIUS_ANNUAL_PLAN_ID || 'mock_annual_id'
      },
      sandbox: process.env.FREEMIUS_SANDBOX !== 'false'
    });
  } catch (err: any) {
    console.error('Error in /api/billing/config:', err);
    res.status(500).json({ error: err.message });
  }
});

// Freemius Webhook API handler
app.get('/api/webhooks/freemius', async (req, res) => {
  const { email, user_id, plan_id } = req.query;

  // If this is a redirect from checkout (indicated by having email or user_id in GET query params)
  if (email || user_id) {
    console.log(`Detected Freemius browser success redirect: email=${email}, user_id=${user_id}, plan_id=${plan_id}`);
    
    try {
      if (email) {
        const userEmail = String(email);
        console.log(`Processing GET redirect: automatically granting premium access for email ${userEmail}`);
        // Grant premium access to the user
        await grantPremiumAccess('generate-new-user-id', 'all_subjects', userEmail);
      }
    } catch (grantErr) {
      console.error('Error granting premium access during GET redirect:', grantErr);
    }

    // Redirect the user back to the main frontend SPA with a success query param
    const redirectUrl = `/payment-success?checkout_success=true&email=${encodeURIComponent(String(email || ''))}&user_id=${encodeURIComponent(String(user_id || ''))}`;
    console.log(`Redirecting buyer to SPA: ${redirectUrl}`);
    return res.redirect(redirectUrl);
  }

  // Otherwise, return standard health check JSON
  res.json({
    status: 'active',
    message: 'Freemius Webhook endpoint is fully functional. Please configure your Freemius Developer Dashboard to send POST webhook events to this URL.',
    endpoint: '/api/webhooks/freemius',
    supported_events: [
      'payment.completed',
      'subscription.created',
      'subscription.activated',
      'subscription.renewed',
      'subscription.trial_started'
    ]
  });
});

app.post('/api/webhooks/freemius', async (req: any, res) => {
  try {
    const webhookSecret = process.env.FREEMIUS_WEBHOOK_SECRET;
    
    // If a webhook secret is configured, require it via a custom header or query param.
    // In production, Freemius computes an HMAC signature using your secret key.
    // As a rudimentary protective measure, we reject if the secret doesn't match over simple auth.
    // Better still, uncomment and implement the standard HMAC signature verification.
    if (webhookSecret) {
       const providedSecret = req.headers['x-freemius-secret'] || req.query.secret;
       if (providedSecret !== webhookSecret) {
           console.warn('Webhook rejected: unauthorized secret');
           return res.status(401).json({ error: 'Unauthorized webhook call' });
       }
    }

    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Empty payload' });
    }
    console.log('Received Freemius Webhook:', payload.event);
    console.log('Webhook Payload:', JSON.stringify(payload, null, 2));

    // Freemius sends events like 'payment.completed'
    if (
      payload.event === 'payment.completed' ||
      payload.event === 'subscription.created' ||
      payload.event === 'subscription.activated' ||
      payload.event === 'subscription.renewed' ||
      payload.event === 'subscription.trial_started'
    ) {
      const data = payload.data || {};
      const customData = payload.custom || {};
      const userId = customData.user_id || customData.userId || customData.id || payload.user?.id;
      const userEmail = data.user?.email || payload.user?.email;

      console.log(`Webhook processing: userId=${userId}, userEmail=${userEmail}`);

      // Look for the requested language code in custom query fields or metadata
      const selectedLanguage = customData.selected_language || customData.selectedLanguage || customData.language || payload.selected_language;

      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (userId && isUuid(userId)) {
        console.log(`Found complete Supabase UUID ${userId} in checkout payload. Incrementing 29.9 Pro Tokens ($29.90 value)...`);
        await grantPremiumAccess(userId, selectedLanguage || 'all_subjects', userEmail);
      } else if (userEmail) {
        console.log(`Searching for matching Supabase user by email (case-insensitive): ${userEmail}`);
        const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        let userToGrant = userData?.users?.find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase());
        
        if (userToGrant) {
          console.log(`Matching user ${userToGrant.id} found in Auth table. Converting $29.90 payment to student pro token...`);
          await grantPremiumAccess(userToGrant.id, selectedLanguage || 'all_subjects', userEmail);
        } else {
          console.warn(`User with email ${userEmail} does not exist in Auth. Triggering automatic signup and profile creation to hold the $29.90 token value...`);
          // Calling grantPremiumAccess with an arbitrary ID triggers auto signup!
          await grantPremiumAccess('generate-new-user-id', selectedLanguage || 'all_subjects', userEmail);
        }
      } else {
        console.warn('Freemius webhook received but both user_id and email are missing from payload.');
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Freemius Webhook Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Client-side authenticated activation endpoint to immediately unlock a language or specific grade subjects
app.post('/api/billing/activate-purchase', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: No authorization token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(token);
    if (jwtError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session' });
    }

    const { language, gradeSelection } = req.body;
    if (!language) {
      return res.status(400).json({ error: 'language parameter is required' });
    }

    console.log(`User ${user.email} is activating purchase. Language=${language}, Has Grade Selection=${!!gradeSelection}`);
    await grantPremiumAccess(user.id, language, undefined, gradeSelection);
    
    return res.json({ success: true, message: `Access elements unlocked successfully.` });
  } catch (err: any) {
    console.error('Error in /api/billing/activate-purchase:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin manual user registration endpoint
app.post('/api/admin/create-user', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: No authorization token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    
    // Validate session token with Supabase Auth
    const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(token);
    if (jwtError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session' });
    }
    
    const isAuthorized = await checkIsAdmin(user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Requester does not have administrator privileges' });
    }

    const { email, password, allowedLanguages, allowedGrades, role, isAdminUser } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required parameters' });
    }

    console.log(`Admin ${user.email} is manually creating user: ${email}`);

    // Create the user in Supabase auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (authError) {
      return res.status(400).json({ error: authError.message });
    }
    
    const newUserId = authData.user.id;
    
    // Since the database trigger on_auth_user_created automatically creates 
    // basic profiles & user_permissions, we'll wait briefly or perform direct upserts
    // to override the default permissions with the specified options.
    
    // 1. Update Profile (is_admin field)
    const { error: profileUpdateErr } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: !!isAdminUser || role === 'admin' })
      .eq('id', newUserId);
      
    if (profileUpdateErr) {
      console.error('Error updating profiles associated with manually created user:', profileUpdateErr);
    }
    
    // 2. Update User Permissions (safely using update instead of upsert since handle_new_user trigger already inserted a default record)
    const { error: permissionsUpdateErr } = await supabaseAdmin
      .from('user_permissions')
      .update({
        allowed_languages: allowedLanguages || ['en', 'ar', 'ku_sorani', 'ku_badini'],
        allowed_grades: allowedGrades || [12],
        subject_access: {}
      })
      .eq('user_id', newUserId);
      
    if (permissionsUpdateErr) {
      console.error('Error updating user permissions associated with manually created user:', JSON.stringify(permissionsUpdateErr, null, 2));
      return res.status(400).json({ 
        error: 'Database permissions update failed', 
        details: permissionsUpdateErr.message || permissionsUpdateErr 
      });
    }

    return res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUserId,
        email: email,
        is_admin: !!isAdminUser
      }
    });

  } catch (err: any) {
    console.error('Error in /api/admin/create-user:', err.message);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred during user creation.' });
  }
});

// Admin manual user update endpoint
app.post('/api/admin/update-user', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: No authorization token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    
    // Validate session token with Supabase Auth
    const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(token);
    if (jwtError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session' });
    }
    
    const isAuthorized = await checkIsAdmin(user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Requester does not have administrator privileges' });
    }

    const { targetUserId, password, allowedLanguages, allowedGrades, role, isAdminUser, isPremium } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is a required parameter' });
    }

    console.log(`Admin ${user.email} is modifying user ${targetUserId}`);

    // 1. If password is provided, update it using Admin Auth API
    if (password && password.trim().length >= 6) {
      const { error: passwordUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: password.trim() }
      );
      if (passwordUpdateErr) {
        return res.status(400).json({ error: `Failed to update password: ${passwordUpdateErr.message}` });
      }
    }

    // 2. Update Profile level fields (is_admin, plan, etc.)
    const isUserAdmin = !!isAdminUser || role === 'admin';
    const newPlanValue = isPremium ? 'pro' : 'free';
    const { error: profileUpdateErr } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: isUserAdmin, plan: newPlanValue })
      .eq('id', targetUserId);
      
    if (profileUpdateErr) {
      console.error('Error updating profiles associated with manually created user:', profileUpdateErr);
    }
    
    // 3. Update User Permissions
    const updatePayload: any = {
      allowed_languages: allowedLanguages,
      allowed_grades: allowedGrades,
      is_premium: !!isPremium
    };

    let { error: permissionsUpdateErr } = await supabaseAdmin
      .from('user_permissions')
      .update(updatePayload)
      .eq('user_id', targetUserId);

    if (permissionsUpdateErr && JSON.stringify(permissionsUpdateErr).includes('is_premium')) {
      console.warn('Omit is_premium from user_permissions update due to schema cache restrictions.');
      delete updatePayload.is_premium;
      const secondTry = await supabaseAdmin
        .from('user_permissions')
        .update(updatePayload)
        .eq('user_id', targetUserId);
      permissionsUpdateErr = secondTry.error;
    }
      
    if (permissionsUpdateErr) {
      console.error('Error updating user permissions:', JSON.stringify(permissionsUpdateErr, null, 2));
      return res.status(400).json({ 
        error: 'Database permissions update failed', 
        details: permissionsUpdateErr.message || permissionsUpdateErr 
      });
    }

    return res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (err: any) {
    console.error('Error in /api/admin/update-user:', err.message);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred during user update.' });
  }
});

// Admin manual user deletion endpoint
app.post('/api/admin/delete-user', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: No authorization token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    
    // Validate session token with Supabase Auth
    const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(token);
    if (jwtError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session' });
    }
    
    const isAuthorized = await checkIsAdmin(user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Requester does not have administrator privileges' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is a required parameter' });
    }

    // You cannot delete yourself
    if (userId === user.id) {
      return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
    }

    console.log(`Admin ${user.email} is deleting user: ${userId}`);

    // Delete from auth.users using supabaseAdmin
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('Error in /api/admin/delete-user:', err.message);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred during user deletion.' });
  }
});

// Freemius API to get premium users
app.get('/api/freemius/premium-users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: No authorization token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(token);
    if (jwtError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session' });
    }
    const isAuthorized = await checkIsAdmin(user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Requester does not have administrator privileges' });
    }

    const publicKey = process.env.FREEMIUS_PUBLIC_KEY;
    const secretKey = process.env.FREEMIUS_SECRET_KEY;
    const pluginId = process.env.FREEMIUS_PRODUCT_ID || process.env.FREEMIUS_PLUGIN_ID || '31983';

    if (!publicKey || !secretKey || !pluginId) {
      return res.status(500).json({ error: 'Freemius credentials not configured' });
    }

    // Fetch users from Freemius
    // Assuming standard Freemius API structure for listing users with subscriptions
    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
    const response = await fetch(`https://api.freemius.com/v1/plugins/${pluginId}/users.json`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Freemius API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // Filter users who have active premium subscriptions
    const premiumUsers = data.users.filter((user: any) => user.is_paying); // Assumingis_paying flag

    return res.json({ success: true, users: premiumUsers });
  } catch (err: any) {
    console.error('Error in /api/freemius/premium-users:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Lazy-initialized Gemini Client with dynamic key change detection and telemetry headers
let serverAi: GoogleGenAI | null = null;
let lastUsedKey: string | undefined = undefined;

function getServerAI(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
  }

  if (!serverAi || lastUsedKey !== key) {
    serverAi = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    lastUsedKey = key;
  }
  return serverAi;
}

// Server-side Gemini proxy endpoint to route calls securely without exceeding client quota
app.post('/api/gemini/generateContent', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: No authorization token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(token);
    
    if (jwtError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session' });
    }

    const { model, contents, config } = req.body;
    
    if (!model) {
      return res.status(400).json({ error: 'model is a required parameter' });
    }
    if (!contents) {
      return res.status(400).json({ error: 'contents is a required parameter' });
    }

    const ai = getServerAI();
    const result = await ai.models.generateContent({
      model,
      contents,
      config
    });

    // Handle different response formats based on SDK version/provider
    let extractedText = '';
    
    const response = result;
    
    if (typeof response.text === 'string') {
      extractedText = response.text;
    } else if (response.candidates && response.candidates[0].content.parts[0].text) {
      extractedText = response.candidates[0].content.parts[0].text;
    }

    return res.json({ 
      text: extractedText,
      candidates: response.candidates 
    });
  } catch (error: any) {
    console.error('Server-side Gemini proxy call failed:', error);
    
    // Extract error status/code if available from Google Gen AI SDK
    const status = error?.status || error?.code || 500;
    const message = error?.message || 'Failed to generate content with Gemini';
    
    return res.status(status >= 200 && status < 600 ? status : 500).json({ 
      error: message,
      status: error?.status,
      code: error?.code
    });
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
        window.SUPABASE_URL = "${supabaseUrl}";
        window.SUPABASE_ANON_KEY = "${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY3hzYmR0dmtycGRqeWpnd3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDU0ODcsImV4cCI6MjA3NjM4MTQ4N30.Wz6ho5eVeWSb8iYa0BunzghAwTGcfHVFn_rSU77yQsE'}";
        
        // Also set them as global constants for compatibility
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
        window.SUPABASE_URL = "${supabaseUrl}";
        window.SUPABASE_ANON_KEY = "${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY3hzYmR0dmtycGRqeWpnd3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDU0ODcsImV4cCI6MjA3NjM4MTQ4N30.Wz6ho5eVeWSb8iYa0BunzghAwTGcfHVFn_rSU77yQsE'}";
        
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

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
} catch (err) {
  console.error('CRITICAL: Server failed to start:', err);
  process.exit(1);
}
