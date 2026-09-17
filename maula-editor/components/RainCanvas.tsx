import React, { useRef, useEffect, useCallback } from 'react';

interface Raindrop {
    x: number;
    y: number;
    length: number;
    speed: number;
    opacity: number;
    width: number;
}

interface WaterDrop {
    x: number;
    y: number;
    radius: number;
    opacity: number;
    slideSpeed: number;
    wobble: number;
    wobbleSpeed: number;
    wobblePhase: number;
    trail: { x: number; y: number; radius: number; opacity: number }[];
    life: number;
    maxLife: number;
}

interface Splash {
    x: number;
    y: number;
    particles: { dx: number; dy: number; life: number; maxLife: number; size: number }[];
}

interface RainCanvasProps {
    isActive: boolean;
    /** 'heavy' = big prominent drops for splash screens, 'normal' = subtle for panels */
    intensity?: 'normal' | 'heavy';
}

interface LightningBolt {
    segments: { x1: number; y1: number; x2: number; y2: number }[];
    life: number;
    maxLife: number;
    opacity: number;
    width: number;
    branches: { segments: { x1: number; y1: number; x2: number; y2: number }[]; opacity: number; width: number }[];
    flashIntensity: number;
}

const RainCanvas: React.FC<RainCanvasProps> = ({ isActive, intensity = 'normal' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const raindrops = useRef<Raindrop[]>([]);
    const waterDrops = useRef<WaterDrop[]>([]);
    const splashes = useRef<Splash[]>([]);
    const lightningBolts = useRef<LightningBolt[]>([]);
    const nextLightningTime = useRef<number>(0);
    const animFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const heavy = intensity === 'heavy';

    const createRaindrop = useCallback((w: number, h: number, startTop = false): Raindrop => {
        return {
            x: Math.random() * w,
            y: startTop ? -Math.random() * h * 0.5 : Math.random() * h,
            length: heavy ? 20 + Math.random() * 50 : 15 + Math.random() * 35,
            speed: heavy ? 10 + Math.random() * 18 : 8 + Math.random() * 14,
            opacity: heavy ? 0.05 + Math.random() * 0.08 : 0.08 + Math.random() * 0.18,
            width: heavy ? 0.4 + Math.random() * 0.8 : 0.5 + Math.random() * 1.2,
        };
    }, [heavy]);

    const createWaterDrop = useCallback((x: number, y: number): WaterDrop => {
        const radius = heavy ? 2 + Math.random() * 8 : 2 + Math.random() * 6;
        return {
            x,
            y,
            radius,
            opacity: heavy ? 0.10 + Math.random() * 0.15 : 0.25 + Math.random() * 0.35,
            slideSpeed: heavy ? 0.01 + Math.random() * 0.12 : 0.02 + Math.random() * 0.15,
            wobble: 0,
            wobbleSpeed: 0.5 + Math.random() * 2,
            wobblePhase: Math.random() * Math.PI * 2,
            trail: [],
            life: 0,
            maxLife: heavy ? 400 + Math.random() * 800 : 400 + Math.random() * 800,
        };
    }, [heavy]);

    const createSplash = useCallback((x: number, y: number): Splash => {
        const particleCount = 3 + Math.floor(Math.random() * 4);
        const particles = [];
        for (let i = 0; i < particleCount; i++) {
            const angle = -Math.PI * 0.2 + Math.random() * Math.PI * -0.6;
            const speed = 0.5 + Math.random() * 1.5;
            particles.push({
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                life: 0,
                maxLife: 15 + Math.random() * 20,
                size: heavy ? 1 + Math.random() * 2.5 : 0.5 + Math.random() * 1.5,
            });
        }
        return { x, y, particles };
    }, [heavy]);

    useEffect(() => {
        if (!isActive) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener('resize', resize);

        const w = window.innerWidth;
        const h = window.innerHeight;
        const dropCount = Math.floor((w * h) / (heavy ? 3000 : 4000));
        raindrops.current = [];
        for (let i = 0; i < dropCount; i++) {
            raindrops.current.push(createRaindrop(w, h, false));
        }

        waterDrops.current = [];
        const initialDrops = heavy ? 15 + Math.floor(Math.random() * 15) : 30 + Math.floor(Math.random() * 30);
        for (let i = 0; i < initialDrops; i++) {
            const drop = createWaterDrop(Math.random() * w, Math.random() * h);
            drop.life = Math.random() * drop.maxLife * 0.5;
            waterDrops.current.push(drop);
        }

        splashes.current = [];
        lightningBolts.current = [];
        nextLightningTime.current = performance.now() + 2000 + Math.random() * 4000;
        lastTimeRef.current = performance.now();

        const createLightningBolt = (cw: number, ch: number): LightningBolt => {
            const startX = cw * (0.1 + Math.random() * 0.8);
            const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
            let x = startX;
            let y = 0;
            const endY = ch * (0.5 + Math.random() * 0.4);
            const stepCount = 12 + Math.floor(Math.random() * 10);
            const stepY = endY / stepCount;

            for (let i = 0; i < stepCount; i++) {
                const nx = x + (Math.random() - 0.5) * 80;
                const ny = y + stepY + (Math.random() - 0.5) * stepY * 0.3;
                segments.push({ x1: x, y1: y, x2: nx, y2: ny });
                x = nx;
                y = ny;
            }

            const branches: LightningBolt['branches'] = [];
            const branchCount = 1 + Math.floor(Math.random() * 3);
            for (let b = 0; b < branchCount; b++) {
                const branchStart = Math.floor(Math.random() * (segments.length - 2)) + 1;
                const seg = segments[branchStart];
                const bSegs: { x1: number; y1: number; x2: number; y2: number }[] = [];
                let bx = seg.x2;
                let by = seg.y2;
                const bSteps = 3 + Math.floor(Math.random() * 5);
                const dir = Math.random() > 0.5 ? 1 : -1;
                for (let i = 0; i < bSteps; i++) {
                    const bnx = bx + dir * (20 + Math.random() * 40) + (Math.random() - 0.5) * 20;
                    const bny = by + stepY * (0.5 + Math.random() * 0.5);
                    bSegs.push({ x1: bx, y1: by, x2: bnx, y2: bny });
                    bx = bnx;
                    by = bny;
                }
                branches.push({ segments: bSegs, opacity: 0.4 + Math.random() * 0.3, width: 0.5 + Math.random() * 1 });
            }

            return {
                segments,
                life: 0,
                maxLife: 20 + Math.random() * 30,
                opacity: 0.9 + Math.random() * 0.1,
                width: 2.5 + Math.random() * 3,
                branches,
                flashIntensity: 0.25 + Math.random() * 0.25,
            };
        };

        const drawLightningSegments = (
            segs: { x1: number; y1: number; x2: number; y2: number }[],
            opacity: number,
            width: number,
            progress: number
        ) => {
            const visibleCount = Math.ceil(segs.length * Math.min(progress * 3, 1));

            // Wide atmospheric glow (outermost)
            ctx.save();
            ctx.shadowColor = `rgba(120, 160, 255, ${opacity * 0.5})`;
            ctx.shadowBlur = 60;
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            for (let i = 0; i < visibleCount && i < segs.length; i++) {
                const s = segs[i];
                if (i === 0) ctx.moveTo(s.x1, s.y1);
                ctx.lineTo(s.x2, s.y2);
            }
            ctx.strokeStyle = `rgba(100, 140, 220, ${opacity * 0.3})`;
            ctx.lineWidth = width * 6;
            ctx.stroke();
            ctx.restore();

            // Mid glow
            ctx.save();
            ctx.shadowColor = `rgba(160, 190, 255, ${opacity * 0.7})`;
            ctx.shadowBlur = 30;
            ctx.beginPath();
            for (let i = 0; i < visibleCount && i < segs.length; i++) {
                const s = segs[i];
                if (i === 0) ctx.moveTo(s.x1, s.y1);
                ctx.lineTo(s.x2, s.y2);
            }
            ctx.strokeStyle = `rgba(170, 200, 255, ${opacity * 0.6})`;
            ctx.lineWidth = width * 2.5;
            ctx.stroke();
            ctx.restore();

            // Core bolt
            ctx.save();
            ctx.shadowColor = `rgba(200, 220, 255, ${opacity})`;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            for (let i = 0; i < visibleCount && i < segs.length; i++) {
                const s = segs[i];
                if (i === 0) ctx.moveTo(s.x1, s.y1);
                ctx.lineTo(s.x2, s.y2);
            }
            ctx.strokeStyle = `rgba(210, 230, 255, ${opacity})`;
            ctx.lineWidth = width;
            ctx.stroke();
            ctx.restore();

            // Hot white center
            ctx.beginPath();
            for (let i = 0; i < visibleCount && i < segs.length; i++) {
                const s = segs[i];
                if (i === 0) ctx.moveTo(s.x1, s.y1);
                ctx.lineTo(s.x2, s.y2);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.95})`;
            ctx.lineWidth = width * 0.35;
            ctx.stroke();
        };

        const drawWaterDrop = (drop: WaterDrop) => {
            const { x, y, radius, opacity } = drop;

            // Trail behind sliding drop
            for (const t of drop.trail) {
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(174, 194, 224, ${t.opacity * 0.3})`;
                ctx.fill();
            }

            // Shadow underneath for 3D depth (heavy mode)
            if (heavy && radius > 6) {
                ctx.beginPath();
                ctx.ellipse(x + radius * 0.15, y + radius * 0.2, radius * 0.9, radius * 0.5, 0, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.15})`;
                ctx.fill();
            }

            // Main drop body - refraction look
            const grad = ctx.createRadialGradient(
                x - radius * 0.3, y - radius * 0.3, radius * 0.05,
                x, y, radius
            );
            if (heavy) {
                grad.addColorStop(0, `rgba(140, 160, 190, ${opacity * 0.5})`);
                grad.addColorStop(0.25, `rgba(100, 120, 150, ${opacity * 0.3})`);
                grad.addColorStop(0.5, `rgba(70, 90, 120, ${opacity * 0.18})`);
                grad.addColorStop(0.75, `rgba(40, 60, 90, ${opacity * 0.08})`);
                grad.addColorStop(1, `rgba(20, 40, 70, ${opacity * 0.02})`);
            } else {
                grad.addColorStop(0, `rgba(220, 235, 255, ${opacity * 0.9})`);
                grad.addColorStop(0.4, `rgba(174, 194, 224, ${opacity * 0.5})`);
                grad.addColorStop(0.7, `rgba(140, 170, 210, ${opacity * 0.3})`);
                grad.addColorStop(1, `rgba(100, 140, 190, ${opacity * 0.05})`);
            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Specular highlight — bright spot
            const hlX = x - radius * 0.25;
            const hlY = y - radius * 0.3;
            const hlR = heavy ? radius * 0.25 : radius * 0.35;
            ctx.beginPath();
            ctx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(180, 195, 215, ${opacity * (heavy ? 0.25 : 0.6)})`;
            ctx.fill();

            // Secondary smaller highlight for realism (heavy only)
            if (heavy && radius > 5) {
                ctx.beginPath();
                ctx.arc(x + radius * 0.2, y + radius * 0.15, radius * 0.1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(150, 165, 185, ${opacity * 0.12})`;
                ctx.fill();
            }

            // Edge ring — crisp border
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(80, 100, 130, ${opacity * (heavy ? 0.15 : 0.2)})`;
            ctx.lineWidth = heavy ? 0.4 : 0.5;
            ctx.stroke();
        };

        const animate = (time: number) => {
            const dt = Math.min((time - lastTimeRef.current) / 16.67, 3);
            lastTimeRef.current = time;

            const cw = window.innerWidth;
            const ch = window.innerHeight;

            ctx.clearRect(0, 0, cw, ch);

            // ---- Draw rain streaks ----
            for (let i = 0; i < raindrops.current.length; i++) {
                const drop = raindrops.current[i];
                drop.y += drop.speed * dt;
                drop.x += (heavy ? 0.5 : 0.3) * dt;

                if (drop.y > ch + 20) {
                    if (Math.random() < (heavy ? 0.07 : 0.04)) {
                        waterDrops.current.push(createWaterDrop(drop.x, ch - 5 - Math.random() * 10));
                    }
                    if (Math.random() < (heavy ? 0.08 : 0.06)) {
                        splashes.current.push(createSplash(drop.x, ch));
                    }
                    raindrops.current[i] = createRaindrop(cw, ch, true);
                    continue;
                }

                ctx.beginPath();
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x + 0.5, drop.y - drop.length);
                ctx.strokeStyle = `rgba(174, 194, 224, ${drop.opacity})`;
                ctx.lineWidth = drop.width;
                ctx.stroke();
            }

            // ---- Animate water drops on glass ----
            for (let i = waterDrops.current.length - 1; i >= 0; i--) {
                const drop = waterDrops.current[i];
                drop.life += dt;
                drop.y += drop.slideSpeed * dt;
                drop.wobble = Math.sin(drop.wobblePhase + drop.life * drop.wobbleSpeed * 0.02) * 0.3;
                drop.x += drop.wobble * dt;

                if (drop.slideSpeed > 0.05 && drop.life % 8 < dt) {
                    drop.trail.push({
                        x: drop.x + (Math.random() - 0.5) * 0.5,
                        y: drop.y - drop.radius,
                        radius: drop.radius * (0.2 + Math.random() * 0.3),
                        opacity: drop.opacity * 0.4,
                    });
                    if (drop.trail.length > (heavy ? 18 : 12)) drop.trail.shift();
                }

                for (let t = drop.trail.length - 1; t >= 0; t--) {
                    drop.trail[t].opacity -= 0.002 * dt;
                    if (drop.trail[t].opacity <= 0) drop.trail.splice(t, 1);
                }

                if (drop.y > ch + 20 || drop.life > drop.maxLife) {
                    waterDrops.current.splice(i, 1);
                    continue;
                }

                const ageFactor = 1 - Math.max(0, (drop.life - drop.maxLife * 0.7) / (drop.maxLife * 0.3));
                const savedOpacity = drop.opacity;
                drop.opacity *= ageFactor;
                drawWaterDrop(drop);
                drop.opacity = savedOpacity;
            }

            // ---- Splashes ----
            for (let i = splashes.current.length - 1; i >= 0; i--) {
                const splash = splashes.current[i];
                let allDead = true;
                for (const p of splash.particles) {
                    p.life += dt;
                    if (p.life >= p.maxLife) continue;
                    allDead = false;
                    const progress = p.life / p.maxLife;
                    const px = splash.x + p.dx * p.life * 2;
                    const py = splash.y + p.dy * p.life * 2;
                    const alpha = (1 - progress) * 0.3;
                    ctx.beginPath();
                    ctx.arc(px, py, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(174, 194, 224, ${alpha})`;
                    ctx.fill();
                }
                if (allDead) splashes.current.splice(i, 1);
            }

            // ---- Lightning (heavy only) ----
            if (heavy) {
                // Spawn new bolts
                if (time > nextLightningTime.current) {
                    lightningBolts.current.push(createLightningBolt(cw, ch));
                    // Sometimes double-strike
                    if (Math.random() < 0.35) {
                        setTimeout(() => {
                            lightningBolts.current.push(createLightningBolt(cw, ch));
                        }, 50 + Math.random() * 150);
                    }
                    nextLightningTime.current = time + 2000 + Math.random() * 5000;
                }

                // Draw + animate bolts
                for (let i = lightningBolts.current.length - 1; i >= 0; i--) {
                    const bolt = lightningBolts.current[i];
                    bolt.life += dt;
                    const progress = bolt.life / bolt.maxLife;
                    if (progress >= 1) {
                        lightningBolts.current.splice(i, 1);
                        continue;
                    }

                    // Flash fades: bright start, flicker, quick decay
                    let fade: number;
                    if (progress < 0.05) fade = progress / 0.05;
                    else if (progress < 0.15) fade = 1;
                    else if (progress < 0.2) fade = 0.4 + Math.random() * 0.3; // flicker
                    else if (progress < 0.3) fade = 0.7 + Math.random() * 0.3; // restrike 
                    else fade = 1 - ((progress - 0.3) / 0.7);
                    fade = Math.max(0, fade);

                    // Full screen flash — illuminates the whole storm
                    if (progress < 0.25) {
                        const flashFade = progress < 0.08 ? progress / 0.08 : Math.max(0, 1 - ((progress - 0.08) / 0.17));
                        ctx.fillStyle = `rgba(140, 170, 220, ${bolt.flashIntensity * flashFade})`;
                        ctx.fillRect(0, 0, cw, ch);
                    }

                    const op = bolt.opacity * fade;
                    drawLightningSegments(bolt.segments, op, bolt.width, progress);
                    for (const branch of bolt.branches) {
                        drawLightningSegments(branch.segments, op * branch.opacity, branch.width * 0.7, progress);
                    }
                }
            }

            // ---- Spawn new drops ----
            const maxDrops = heavy ? 40 : 80;
            const spawnRate = heavy ? 0.02 : 0.03;
            if (waterDrops.current.length < maxDrops && Math.random() < spawnRate) {
                waterDrops.current.push(createWaterDrop(
                    Math.random() * cw,
                    Math.random() * ch * (heavy ? 0.5 : 0.3)
                ));
            }

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animFrameRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [isActive, heavy, createRaindrop, createWaterDrop, createSplash]);

    if (!isActive) return null;

    return (
        <>
            <div
                className="absolute inset-0 pointer-events-none z-[1]"
                style={{
                    background: heavy
                        ? 'none'
                        : 'radial-gradient(ellipse at 30% 20%, rgba(100,150,200,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(80,130,180,0.03) 0%, transparent 50%)',
                }}
            />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-[2]"
            />
            <div
                className="absolute inset-0 pointer-events-none z-[3]"
                style={{
                    background: heavy
                        ? 'none'
                        : 'linear-gradient(to bottom, rgba(80,120,160,0.06) 0%, transparent 15%, transparent 80%, rgba(60,100,140,0.08) 100%), linear-gradient(to right, rgba(80,120,160,0.04) 0%, transparent 10%, transparent 90%, rgba(80,120,160,0.04) 100%)',
                }}
            />
        </>
    );
};

export default RainCanvas;
