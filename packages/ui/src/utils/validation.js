import { PASSWORD_PROBLEM_MESSAGES, getPasswordProblem } from "./passwordPolicy";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;

export const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export const isValidEmail = (value) => typeof value === "string" && EMAIL_PATTERN.test(value.trim());

export const isValidPhone = (value) => typeof value === "string" && PHONE_PATTERN.test(value.trim());

export const getPasswordError = (value, options) => {
  const problem = getPasswordProblem(value, options);
  return problem ? PASSWORD_PROBLEM_MESSAGES[problem] : undefined;
};

export const firstErrorField = (errors, order) => order.find((field) => errors[field]);

export const focusField = (form, field) => {
  form?.querySelector(`[name="${field}"]`)?.focus();
};
