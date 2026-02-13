'use client';
import axios from 'axios';
import { baseUrl } from '../utils/config';

export const login = async (username: string, password: string) => {
  const res = await axios.post(`${baseUrl}/api/users/auth/login`, { username, password });
  return res.data;
};

export const sendOTP = async (email: string) => {
  const res = await axios.post(`${baseUrl}/api/users/auth/send-otp`, { email });
  return res.data;
};

export const verifyOTP = async (email: string, otp: string) => {
  const res = await axios.post(`${baseUrl}/api/users/auth/verify-otp`, { email, otp });
  return res.data;
};

export const logout = async () => {
  await axios.post(`${baseUrl}/api/users/auth/logout`, {}, { withCredentials: true });
};

export const refreshAccessToken = async () => {
  const res = await axios.post(`${baseUrl}/api/users/auth/refresh-token`, {}, { withCredentials: true });
  return res.data.token;
};
