import { useSyncExternalStore } from 'react'

/**
 * Which user actions are being sent right now, by key (`cart:add:3`, `logout`, ...). The set lives
 * outside React on purpose: a `disabled` button only takes effect after the next render, so two fast
 * clicks can both get through, while this check is synchronous. Every mutating action uses it, so
 * one user intent sends one request.
 */
const running = new Set<string>()
const listeners = new Set<() => void>()

const notify = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const isInFlight = (key: string) => running.has(key)

/**
 * Runs `action` unless one with the same key is still running; then it resolves `undefined` without
 * calling it. The key is released when the action settles, success or not.
 */
export async function runExclusive<T>(
  key: string,
  action: () => Promise<T>,
): Promise<T | undefined> {
  if (running.has(key)) return undefined
  running.add(key)
  notify()
  try {
    return await action()
  } finally {
    running.delete(key)
    notify()
  }
}

/** Whether an action with this key is running; use it for the button's `pending` state. */
export function useInFlight(key: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => running.has(key),
    () => false,
  )
}
