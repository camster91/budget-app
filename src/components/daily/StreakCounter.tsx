"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Flame, Award } from "lucide-react";

interface StreakCounterProps {
    streak: number; // positive = under-budget streak, negative = over-budget streak
    bestStreak?: number;
}

export function StreakCounter({ streak, bestStreak = 0 }: StreakCounterProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isPositive = streak >= 0;
    const abs = Math.abs(streak);

    const triggerExplosion = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            radius: number;
            alpha: number;
            decay: number;
        }

        const particles: Particle[] = [];
        const colors = ["#fb923c", "#f97316", "#ea580c", "#c2410c", "#fde047", "#eab308"];

        // Start explosion at the horizontal center, near the top Flame icon
        const startX = canvas.width / 2;
        const startY = 32;

        for (let i = 0; i < 45; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4.5;
            particles.push({
                x: startX,
                y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5, // bias upward
                color: colors[Math.floor(Math.random() * colors.length)],
                radius: 2.5 + Math.random() * 4,
                alpha: 1,
                decay: 0.012 + Math.random() * 0.008,
            });
        }

        const render = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.09; // gravity
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    particles.splice(index, 1);
                    return;
                }

                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                
                // Add soft fire glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.fill();
                ctx.restore();
            });

            if (particles.length > 0) {
                requestAnimationFrame(render);
            }
        };

        render();
    };

    useEffect(() => {
        if (isPositive && abs > 0) {
            const timer = setTimeout(triggerExplosion, 500);
            return () => clearTimeout(timer);
        }
    }, [streak, isPositive, abs]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={triggerExplosion}
            className="glass-card rounded-2xl p-5 text-center relative overflow-hidden cursor-pointer select-none group active:scale-[0.98] transition-transform duration-100"
        >
            {/* Celebration Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 rounded-2xl" />

            <div className="flex items-center justify-center gap-2 mb-3 relative z-20">
                {isPositive ? (
                    <Flame className="h-5 w-5 text-orange-400 group-hover:scale-110 transition-transform duration-200" />
                ) : (
                    <Flame className="h-5 w-5 text-rose-400" />
                )}
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">
                    {isPositive ? "On Fire" : "Slow Down"}
                </h3>
            </div>

            <div className="flex items-baseline justify-center gap-1 relative z-20">
                <span className={isPositive ? "text-4xl font-black text-orange-400" : "text-4xl font-black text-rose-400"}>
                    {abs}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                    day{abs !== 1 ? "s" : ""}
                </span>
            </div>

            <p className="text-xs text-muted-foreground mt-1 relative z-20">
                {isPositive
                    ? "Consecutive days under your daily budget"
                    : "Consecutive days over your daily budget"}
            </p>

            {bestStreak > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5 relative z-20">
                    <Award className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400/80 font-medium">Best streak: {bestStreak} days</span>
                </div>
            )}
        </motion.div>
    );
}
