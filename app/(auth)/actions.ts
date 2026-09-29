"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export interface AuthActionResult {
  error?: string
  success?: boolean
  message?: string
}

/**
 * Server action to authenticate a user with email and password.
 */
export async function login(formData: FormData): Promise<AuthActionResult | void> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/today")
}

/**
 * Server action to terminate the authenticated session and redirect to /login.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/**
 * Server action to send a password recovery email.
 */
export async function forgotPassword(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get("email") as string

  if (!email) {
    return { error: "Email address is required." }
  }

  const headersList = await headers()
  const origin = headersList.get("origin") || ""
  const redirectTo = `${origin}/auth/callback?next=/reset-password`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    message: "If an account exists with this email, password reset instructions have been sent.",
  }
}

/**
 * Server action to update the user's password during a reset flow.
 */
export async function resetPassword(formData: FormData): Promise<AuthActionResult | void> {
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!password || !confirmPassword) {
    return { error: "Password and confirmation are required." }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/today")
}
