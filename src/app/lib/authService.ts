'use client';
import axios from 'axios';
import { baseUrl } from '../utils/config';

export const login = async (username: string, password: string) => {
  const res = await axios.post(`${baseUrl}/api/users/auth/login`, { username, password });
  return res.data;
};

export const logout = async (token: string) => {
  await axios.post(`${baseUrl}/api/users/auth/logout`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
