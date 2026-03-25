import axios from 'axios';

const API_URL = "http://127.0.0.1:5000/api/auth";

/**
 * Sends an OTP to the specified email.
 */
export const sendOTP = async (email, type) => {
  try {
    const response = await axios.post(`${API_URL}/send-otp`, { email, type });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Error sending OTP" };
  }
};

/**
 * Verifies the OTP for the specified email.
 */
export const verifyOTP = async (email, otp, type) => {
  try {
    const response = await axios.post(`${API_URL}/verify-otp`, { email, otp, type });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Invalid or expired OTP" };
  }
};
