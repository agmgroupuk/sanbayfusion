/**
 * Toast Notification System — Lightweight, zero-dependency
 * Uses React state + CSS animations (no zustand/framer-motion needed)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

// Global toast state — simple pub/sub pattern
let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

function notify() {
    toastListeners.forEach(fn => fn([...toasts]));
}

function addToast(item: Omit<ToastItem, 'id'>) {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    toasts = [...toasts, { ...item, id }].slice(-5);
    notify();
    // Auto-remove
    setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id);
        notify();
    }, item.duration || 3500);
    return id;
}

/** Convenience functions — import and call from anywhere */
export const toast = {
    success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => addToast({ type: 'info', title, message }),
};

const iconMap: Record<ToastType, React.ElementType> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colorMap: Record<ToastType, { border: string; icon: string; bg: string }> = {
    success: { border: 'border-emerald-500/30', icon: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-600/5' },
    error: { border: 'border-red-500/30', icon: 'text-red-400', bg: 'from-red-500/10 to-red-600/5' },
    warning: { border: 'border-amber-500/30', icon: 'text-amber-400', bg: 'from-amber-500/10 to-amber-600/5' },
    info: { border: 'border-cyan-500/30', icon: 'text-cyan-400', bg: 'from-cyan-500/10 to-cyan-600/5' },
};

/** Mount this once at app root */
const ToastContainer: React.FC = () => {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        toastListeners.push(setItems);
        return () => { toastListeners = toastListeners.filter(fn => fn !== setItems); };
    }, []);

    const dismiss = useCallback((id: string) => {
        toasts = toasts.filter(t => t.id !== id);
        notify();
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {items.map(item => {
                const Icon = iconMap[item.type];
                const colors = colorMap[item.type];
                return (
                    <div
                        key={item.id}
                        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border ${colors.border} bg-gradient-to-r ${colors.bg} backdrop-blur-xl shadow-lg max-w-sm animate-[slideIn_0.3s_ease-out]`}
                    >
                        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${colors.icon}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            {item.message && <p className="text-xs text-gray-400 mt-0.5">{item.message}</p>}
                        </div>
                        <button onClick={() => dismiss(item.id)} className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;
