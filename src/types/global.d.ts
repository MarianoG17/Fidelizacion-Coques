// src/types/global.d.ts
// Declaraciones de tipos para variables globales

declare global {
    var passkeyChallenges: Map<string, {
        challenge: string
        timestamp: number
    }> | undefined

    var loginChallenges: Map<string, number> | undefined
}

export { }
