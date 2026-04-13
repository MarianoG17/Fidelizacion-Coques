'use client'
// src/app/admin/components/Emails.tsx
// Módulo unificado: campañas manuales + comunicaciones automáticas
import { useState } from 'react'
import { Campanas } from './Campanas'
import { Comunicaciones } from './Comunicaciones'

type SubTab = 'campanas' | 'automaticos'

export function Emails({ adminKey }: { adminKey: string }) {
    const [subTab, setSubTab] = useState<SubTab>('automaticos')

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit">
                {([
                    { key: 'automaticos', label: '⚙️ Automáticos' },
                    { key: 'campanas',    label: '✉️ Campañas' },
                ] as { key: SubTab; label: string }[]).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setSubTab(t.key)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                            subTab === t.key
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {subTab === 'automaticos' && <Comunicaciones adminKey={adminKey} />}
            {subTab === 'campanas'    && <Campanas adminKey={adminKey} />}
        </div>
    )
}
