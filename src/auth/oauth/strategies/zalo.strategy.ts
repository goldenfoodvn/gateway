import axios from 'axios';
import { Request, Response } from 'express';

/**
 * Step 1: Redirect user to Zalo OAuth login page.
 */
export function redirectToZaloAuth(req: Request, res: Response) {
  const { ZALO_CLIENT_ID, ZALO_CALLBACK_URL } = process.env;
  const state = Date.now().toString();
  const authorizeUrl =
    `https://oauth.zaloapp.com/v4/authorize` +
    `?app_id=${ZALO_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(ZALO_CALLBACK_URL ?? '')}` +
    `&state=${state}`;
  res.redirect(authorizeUrl);
}

/**
 * Step 2: Zalo callback handler
 * Exchange code for access_token, get user profile.
 */
export async function handleZaloCallback(req: Request, res: Response) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing code from Zalo callback' });
  }
  try {
    const tokenRes = await axios.post('https://oauth.zaloapp.com/v4/access_token', {
      code,
      app_id: process.env.ZALO_CLIENT_ID,
      grant_type: 'authorization_code',
      redirect_uri: process.env.ZALO_CALLBACK_URL,
      app_secret: process.env.ZALO_CLIENT_SECRET
    });

    const access_token = tokenRes.data.access_token;
    if (!access_token) throw new Error('Failed to get access_token from Zalo');

    // Get Zalo user profile
    const profileRes = await axios.get('https://graph.zalo.me/v2.0/me', {
      params: { access_token },
      headers: { 'secret_key': process.env.ZALO_CLIENT_SECRET }
    });

    // TODO: Implement your logic to handle Zalo user here (find/create user, return JWT, etc.)
    // Example:
    const zaloUser = {
      id: profileRes.data.id,
      name: profileRes.data.name,
      gender: profileRes.data.gender,
      picture: profileRes.data.picture,
      access_token,
    };

    // For demo, simply return the user data as JSON:
    res.json({ user: zaloUser });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Zalo OAuth Failed',
      detail: err.response?.data || err.message,
    });
  }
}
