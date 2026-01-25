/**
 * Chain-specific matchers for chain-mock.
 *
 * Note: Standard vitest matchers (toHaveBeenCalled, toHaveBeenCalledWith, etc.)
 * work directly with chain mocks since they are vitest-compatible.
 *
 * This file is reserved for future chain-specific matchers that operate across
 * the full chain path (e.g., matching the entire call sequence).
 */

// Placeholder for future chain-specific matchers
// For now, use standard vitest matchers:
// - expect(mock.select).toHaveBeenCalled()
// - expect(mock.select.from).toHaveBeenCalledWith('users')
// - expect(mock.select.from.where).toHaveBeenCalledTimes(1)
