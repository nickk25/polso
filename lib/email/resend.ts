import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.EMAIL_FROM;
export const FROM_FOUNDER = process.env.EMAIL_FROM_FOUNDER;
