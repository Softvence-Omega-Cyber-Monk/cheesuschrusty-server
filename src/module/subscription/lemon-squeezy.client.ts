import axios from 'axios';

export const lemon = axios.create({
  baseURL: 'https://api.lemonsqueezy.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
  },
});
