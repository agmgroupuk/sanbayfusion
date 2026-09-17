'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { gsap, SplitText, ScrollTrigger } from '@/lib/gsap';

gsap.registerPlugin(SplitText, ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   HERO — "The Warp"

   You're falling through a cosmic tunnel. Stars streak past you.
   A vortex pulls everything inward. The camera drifts forward
   into an infinite depth. You don't look at it — you're IN it.
   ═══════════════════════════════════════════════════════════════ */

export default function HeroSectionGSAP() {
    const containerRef = useRef<HTMLDivElement>(null);
    const mountRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const descRef = useRef<HTMLParagraphElement>(null);
    const buttonsRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);
    const mouseTarget = useRef({ x: 0, y: 0 });
    const mouseCurrent = useRef({ x: 0, y: 0 });
    const scrollProgress = useRef(0);

    const initScene = useCallback(() => {
        if (!mountRef.current) return;

        const W = window.innerWidth;
        const H = window.innerHeight;

        /* ───── Renderer ───── */
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        mountRef.current.appendChild(renderer.domElement);
        Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0' });

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 2000);
        camera.position.set(0, 0, 0);

        const PR = Math.min(window.devicePixelRatio, 2);

        /* ══════════════════════════════════════════════════
           LAYER 1 — WARP STARS
           4000 stars in a tunnel formation. They fly PAST the
           camera continuously, recycling from far to near.
           Stretched into streaks by velocity.
           ══════════════════════════════════════════════════ */
        const STAR_COUNT = 4000;
        const TUNNEL_LENGTH = 500;
        const TUNNEL_RADIUS = 80;

        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(STAR_COUNT * 3);
        const starVelocities = new Float32Array(STAR_COUNT);
        const starSizes = new Float32Array(STAR_COUNT);
        const starBrightness = new Float32Array(STAR_COUNT);

        for (let i = 0; i < STAR_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            // Stars distributed in a hollow cylinder — more at edges, fewer at center
            const r = 3 + Math.pow(Math.random(), 0.6) * TUNNEL_RADIUS;
            starPositions[i * 3] = Math.cos(angle) * r;
            starPositions[i * 3 + 1] = Math.sin(angle) * r;
            starPositions[i * 3 + 2] = -Math.random() * TUNNEL_LENGTH;
            starVelocities[i] = 0.4 + Math.random() * 1.2;
            starSizes[i] = 0.5 + Math.random() * 2.0;
            starBrightness[i] = 0.3 + Math.random() * 0.7;
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeo.setAttribute('aVelocity', new THREE.BufferAttribute(starVelocities, 1));
        starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
        starGeo.setAttribute('aBright', new THREE.BufferAttribute(starBrightness, 1));

        const starMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSpeed: { value: 1.0 },
                uPR: { value: PR },
            },
            vertexShader: /* glsl */ `
        attribute float aVelocity;
        attribute float aSize;
        attribute float aBright;
        uniform float uTime;
        uniform float uSpeed;
        uniform float uPR;
        varying float vAlpha;
        varying float vDepthFade;

        void main() {
          vec3 pos = position;

          // Stars fall AWAY from camera into the tunnel depth
          float speed = aVelocity * uSpeed;
          pos.z = mod(pos.z - uTime * speed * 50.0, -500.0);
          // Rotate around Z axis as they fall — unified spinning
          float angle = uTime * 0.12 * (0.5 + aVelocity);
          float cosA = cos(angle);
          float sinA = sin(angle);
          vec2 rotated = vec2(pos.x * cosA - pos.y * sinA, pos.x * sinA + pos.y * cosA);
          pos.x = rotated.x;
          pos.y = rotated.y;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          float depth = -mvPos.z;

          // Nearer = brighter, farther = dimmer (falling away)
          float nearFactor = smoothstep(500.0, 2.0, depth);
          vAlpha = aBright * nearFactor * (0.5 + 0.5 * sin(uTime * 2.5 + position.x * 0.5));
          vDepthFade = nearFactor;

          gl_PointSize = aSize * uPR * (250.0 / max(depth, 1.0));
          gl_PointSize = min(gl_PointSize, 16.0);

          gl_Position = projectionMatrix * mvPos;
        }
      `,
            fragmentShader: /* glsl */ `
        varying float vAlpha;
        varying float vDepthFade;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;

          float core = smoothstep(0.5, 0.0, d);
          // Blue-white, brighter when near
          vec3 color = mix(vec3(0.4, 0.6, 1.0), vec3(0.9, 0.95, 1.0), vDepthFade);
          gl_FragColor = vec4(color, core * vAlpha);
        }
      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const stars = new THREE.Points(starGeo, starMat);
        scene.add(stars);

        /* ══════════════════════════════════════════════════
           LAYER 3 — WORMHOLE CENTER GLOW
           A bright focal point at the end of the tunnel
           that everything is being pulled toward.
           ══════════════════════════════════════════════════ */
        const wormholeGlowTex = (() => {
            const s = 512;
            const c = document.createElement('canvas');
            c.width = s; c.height = s;
            const cx = c.getContext('2d')!;

            // Outer halo
            const g1 = cx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g1.addColorStop(0, 'rgba(120,180,255,0.8)');
            g1.addColorStop(0.15, 'rgba(80,140,255,0.5)');
            g1.addColorStop(0.3, 'rgba(50,100,220,0.2)');
            g1.addColorStop(0.6, 'rgba(30,60,180,0.05)');
            g1.addColorStop(1, 'rgba(0,0,0,0)');
            cx.fillStyle = g1;
            cx.fillRect(0, 0, s, s);

            // Bright core
            const g2 = cx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.08);
            g2.addColorStop(0, 'rgba(200,230,255,1)');
            g2.addColorStop(0.5, 'rgba(150,200,255,0.6)');
            g2.addColorStop(1, 'rgba(100,160,255,0)');
            cx.fillStyle = g2;
            cx.fillRect(0, 0, s, s);

            return new THREE.CanvasTexture(c);
        })();

        const wormhole = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: wormholeGlowTex,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.9,
            }),
        );
        wormhole.position.set(0, 0, -TUNNEL_LENGTH + 20);
        wormhole.scale.set(50, 50, 1);
        scene.add(wormhole);

        // Secondary deeper glow
        const deepGlow = wormhole.clone();
        deepGlow.position.z = -TUNNEL_LENGTH;
        deepGlow.scale.set(80, 80, 1);
        (deepGlow.material as THREE.SpriteMaterial).opacity = 0.4;
        scene.add(deepGlow);

        /* ══════════════════════════════════════════════════
           LAYER 4 — SPIRAL ENERGY STREAMS
           Particle streams spiraling INTO the vortex center
           giving that "gravity pull" feeling.
           ══════════════════════════════════════════════════ */
        const STREAM_COUNT = 800;
        const streamGeo = new THREE.BufferGeometry();
        const sPos = new Float32Array(STREAM_COUNT * 3);
        const sPhase = new Float32Array(STREAM_COUNT);
        const sSpeed = new Float32Array(STREAM_COUNT);
        const sRadius = new Float32Array(STREAM_COUNT);

        for (let i = 0; i < STREAM_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 5 + Math.random() * 40;
            sPos[i * 3] = Math.cos(angle) * r;
            sPos[i * 3 + 1] = Math.sin(angle) * r;
            sPos[i * 3 + 2] = -Math.random() * TUNNEL_LENGTH * 0.6;
            sPhase[i] = Math.random() * Math.PI * 2;
            sSpeed[i] = 0.3 + Math.random() * 0.8;
            sRadius[i] = r;
        }

        streamGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
        streamGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPhase, 1));
        streamGeo.setAttribute('aSpeed', new THREE.BufferAttribute(sSpeed, 1));
        streamGeo.setAttribute('aRadius', new THREE.BufferAttribute(sRadius, 1));

        const streamMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPR: { value: PR },
            },
            vertexShader: /* glsl */ `
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aRadius;
        uniform float uTime;
        uniform float uPR;
        varying float vAlpha;

        void main() {
          float t = uTime * aSpeed + aPhase;
          // Spiral inward + fall into depth simultaneously
          float spiralProgress = fract(t * 0.06);
          // Radius tightens as it falls deeper
          float currentRadius = aRadius * (1.0 - spiralProgress * 0.9);
          // Spin faster as radius tightens (angular momentum)
          float angle = t * 1.8 + aPhase + spiralProgress * 4.0;
          // Fall into the depth (same direction as stars)
          float depth = -spiralProgress * 350.0;

          vec3 pos = vec3(
            cos(angle) * currentRadius,
            sin(angle) * currentRadius,
            depth
          );

          // Brighter near camera, fades as it falls
          vAlpha = (1.0 - spiralProgress) * 0.55;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (1.5 + (1.0 - spiralProgress) * 2.0) * uPR * (180.0 / max(-mvPos.z, 1.0));
          gl_PointSize = min(gl_PointSize, 10.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
            fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, d);
          vec3 color = vec3(0.4, 0.7, 1.0);
          gl_FragColor = vec4(color, glow * vAlpha);
        }
      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const streams = new THREE.Points(streamGeo, streamMat);
        scene.add(streams);

        /* ══════════════════════════════════════════════════
           LAYER 5 — NEBULA FOG (volumetric sprites)
           Passing through wisps of cosmic gas
           ══════════════════════════════════════════════════ */
        const nebTex = (() => {
            const s = 256;
            const c = document.createElement('canvas');
            c.width = s; c.height = s;
            const cx = c.getContext('2d')!;
            const g = cx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, 'rgba(40,80,160,0.08)');
            g.addColorStop(0.5, 'rgba(20,40,100,0.03)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            cx.fillStyle = g;
            cx.fillRect(0, 0, s, s);
            return new THREE.CanvasTexture(c);
        })();

        const nebulae: THREE.Sprite[] = [];
        for (let i = 0; i < 12; i++) {
            const sp = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: nebTex,
                    transparent: true,
                    opacity: 0.15 + Math.random() * 0.15,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                }),
            );
            const angle = (i / 12) * Math.PI * 2;
            const r = 15 + Math.random() * 30;
            sp.position.set(
                Math.cos(angle) * r,
                Math.sin(angle) * r,
                -30 - i * 30,
            );
            sp.scale.setScalar(20 + Math.random() * 25);
            nebulae.push(sp);
            scene.add(sp);
        }

        /* ══════════════════════════════════════════════════
           ANIMATION — The continuous pull forward
           ══════════════════════════════════════════════════ */
        let raf: number = 0;
        const clock = new THREE.Clock();
        // Camera starts pulled back, GSAP will animate it forward
        camera.position.z = 30;

        const animate = () => {
            raf = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            // Smooth mouse follow
            mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * 0.03;
            mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * 0.03;

            // Camera: mouse causes subtle lateral + rotational shift
            camera.position.x = mouseCurrent.current.x * 1.5;
            camera.position.y = mouseCurrent.current.y * 1.0;
            // Slight roll from mouse-x for disorientation
            camera.rotation.z = -mouseCurrent.current.x * 0.03;
            // Look slightly toward center-depth, offset by mouse
            camera.lookAt(
                mouseCurrent.current.x * 0.3,
                mouseCurrent.current.y * 0.2,
                camera.position.z - 100,
            );

            // Smooth warp speed linked to full page scroll
            const scrollY = window.scrollY || 0;
            const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
            const targetProgress = scrollY / maxScroll;
            scrollProgress.current += (targetProgress - scrollProgress.current) * 0.04;

            // Update shader uniforms
            const baseSpeed = 1.0 + scrollProgress.current * 3.0;
            (starMat.uniforms.uTime as { value: number }).value = t;
            (starMat.uniforms.uSpeed as { value: number }).value = baseSpeed;
            (streamMat.uniforms.uTime as { value: number }).value = t;

            // Wormhole pulse
            const pulseIntensity = 0.85 + Math.sin(t * 0.7) * 0.1;
            (wormhole.material as THREE.SpriteMaterial).opacity = pulseIntensity;
            wormhole.scale.setScalar(45 + Math.sin(t * 0.5) * 5);
            deepGlow.scale.setScalar(75 + Math.sin(t * 0.3) * 8);

            // Nebulae drift slowly
            nebulae.forEach((n, i) => {
                n.position.x += Math.sin(t * 0.1 + i * 2) * 0.02;
                n.position.y += Math.cos(t * 0.08 + i * 3) * 0.015;
            });

            renderer.render(scene, camera);
        };
        animate();

        /* ── Resize ── */
        const onResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        /* ── Mouse ── */
        const onMouse = (e: MouseEvent) => {
            mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseTarget.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('mousemove', onMouse);

        return { renderer, scene, camera, onResize, onMouse, raf };
    }, []);

    /* ─────────────────────────────────────────
       MOUNT + GSAP SEQUENCE
       ───────────────────────────────────────── */
    useEffect(() => {
        const sceneData = initScene();
        if (!sceneData) return;
        const { renderer, scene: threeScene, camera, onResize, onMouse, raf } = sceneData;

        const ctx = gsap.context(() => {
            /* ── CAMERA PULL-IN  ──
               The hero moment — camera starts at z=30 (pulled back)
               and smoothly accelerates into the tunnel. This creates
               the "being sucked in" feeling on page load. */
            gsap.to(camera.position, {
                z: -2,
                duration: 3.5,
                ease: 'power2.inOut',
                delay: 0.3,
            });

            // Then continuous slow drift forward (the endless pull)
            gsap.to(camera.position, {
                z: -15,
                duration: 40,
                ease: 'none',
                delay: 4,
                repeat: -1,
                yoyo: true,
            });

            /* ── Subtle FOV breathing — deepens depth perception ── */
            gsap.to(camera, {
                fov: 82,
                duration: 4,
                ease: 'sine.inOut',
                delay: 0.5,
                repeat: -1,
                yoyo: true,
                onUpdate: () => camera.updateProjectionMatrix(),
            });

            /* ── TEXT SEQUENCE ── */
            const tl = gsap.timeline({ delay: 1.2 });

            // Badge
            tl.fromTo('.hero-badge',
                { opacity: 0, y: -15, scale: 0.95 },
                { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power2.out' },
            );

            // Title chars — emerge from depth blur
            if (titleRef.current) {
                const split = new SplitText(titleRef.current, { type: 'chars' });
                gsap.set(split.chars, { opacity: 0, scale: 0.3, filter: 'blur(12px)' });
                tl.to(split.chars, {
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                    duration: 0.8,
                    stagger: 0.04,
                    ease: 'power3.out',
                }, '-=0.2');

                // Brief glow flash
                tl.fromTo(titleRef.current,
                    { textShadow: '0 0 0px rgba(100,180,255,0)' },
                    { textShadow: '0 0 60px rgba(100,180,255,0.5), 0 0 120px rgba(60,130,246,0.2)', duration: 0.5 },
                    '-=0.3',
                );
                tl.to(titleRef.current, {
                    textShadow: '0 0 20px rgba(100,180,255,0.08)',
                    duration: 2,
                    ease: 'power2.out',
                });
            }

            // Subtitle — slides up from below
            if (subtitleRef.current) {
                tl.fromTo(subtitleRef.current,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
                    '-=2',
                );
            }

            // Description
            if (descRef.current) {
                tl.fromTo(descRef.current,
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
                    '-=1.5',
                );
            }

            // Buttons
            if (buttonsRef.current) {
                tl.fromTo(
                    Array.from(buttonsRef.current.children),
                    { opacity: 0, y: 22, scale: 0.95 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.2)' },
                    '-=1',
                );
            }

            // Stats
            if (statsRef.current) {
                tl.fromTo(
                    Array.from(statsRef.current.children),
                    { opacity: 0, y: 16 },
                    { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
                    '-=0.5',
                );
            }

            // Scroll cue
            tl.fromTo('.scroll-cue', { opacity: 0 }, { opacity: 1, duration: 0.5 }, '-=0.2');
            gsap.to('.scroll-arrow', { y: 5, duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });

            /* ── Pin hero: lock on screen, content dissolves into the tunnel ── */
            ScrollTrigger.create({
                trigger: containerRef.current,
                start: 'top top',
                end: '+=100%',
                pin: true,
                pinSpacing: true,
                scrub: true,
                onUpdate: (self) => {
                    const p = self.progress;
                    gsap.set('.hero-content', {
                        opacity: 1 - p * 1.5,
                        scale: 1 + p * 0.3,
                    });
                    gsap.set('.scroll-cue', {
                        opacity: Math.max(0, 1 - p * 4),
                    });
                },
            });
        }, containerRef);

        return () => {
            ctx.revert();
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('mousemove', onMouse);
            renderer.dispose();
            threeScene.clear();
            if (mountRef.current && renderer.domElement.parentNode) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, [initScene]);

    return (
        <>
            {/* ═══ FIXED WARP TUNNEL BACKGROUND ═══
                 Stays behind ALL page content, always visible */}
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                <div ref={mountRef} className="absolute inset-0" />
                {/* Radial vignette — darkens edges, focuses center depth */}
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse at center, transparent 30%, rgba(3,3,4,0.4) 65%, rgba(3,3,4,0.85) 100%)',
                }} />
            </div>

            {/* ═══ HERO SECTION — pinned on screen ═══ */}
            <section ref={containerRef} className="relative min-h-screen" style={{ zIndex: 2 }}>

                {/* ═══ CONTENT ═══ */}
                <div className="hero-content relative flex items-center justify-center min-h-screen px-4 sm:px-6" style={{ zIndex: 10 }}>
                    <div className="text-center max-w-5xl mx-auto pt-20 pb-28">

                        {/* Badge */}
                        <div
                            className="hero-badge inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-10 opacity-0"
                            style={{
                                background: 'rgba(100,180,255,0.05)',
                                border: '1px solid rgba(100,180,255,0.12)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400/60" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                            </span>
                            <span className="text-sm font-medium text-blue-200/80">
                                Now with Canvas Builder &amp; AI Labs
                            </span>
                        </div>

                        {/* Title */}
                        <h1
                            ref={titleRef}
                            className="text-[2.6rem] sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight mb-6 whitespace-nowrap"
                            style={{ color: '#ffffff' }}
                        >
                            Unleash AI Magic
                        </h1>

                        {/* Subtitle */}
                        <p
                            ref={subtitleRef}
                            className="text-lg sm:text-xl md:text-2xl lg:text-[1.65rem] font-light mb-5 opacity-0"
                            style={{ color: 'rgba(180,210,255,0.7)' }}
                        >
                            Transform ideas into intelligent AI agents instantly
                        </p>

                        {/* Description */}
                        <p
                            ref={descRef}
                            className="text-sm md:text-base max-w-xl mx-auto mb-12 leading-relaxed opacity-0"
                            style={{ color: 'rgba(148,163,184,0.5)' }}
                        >
                            Zero code. Pure innovation. Deploy powerful AI that thinks, learns, and evolves.
                        </p>

                        {/* Buttons */}
                        <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
                            <Link
                                href="https://canvas.sanbayfusion.com"
                                className="group relative inline-flex items-center gap-3 px-9 py-4 rounded-xl font-bold text-white overflow-hidden transition-all duration-400 hover:scale-105"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.55) 0%, rgba(37,99,235,0.4) 100%)',
                                    border: '1px solid rgba(100,180,255,0.18)',
                                    backdropFilter: 'blur(16px)',
                                    boxShadow: '0 8px 40px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
                                }}
                            >
                                <span className="relative z-10">Start Building</span>
                                <svg className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </Link>

                            <Link
                                href="/lab"
                                className="group inline-flex items-center gap-3 px-9 py-4 rounded-xl font-semibold transition-all duration-400 hover:scale-105"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'rgba(200,220,255,0.8)',
                                    backdropFilter: 'blur(16px)',
                                }}
                            >
                                <span>Explore Labs</span>
                                <span className="text-lg group-hover:scale-110 transition-transform">🧪</span>
                            </Link>
                        </div>

                        {/* Stats */}
                        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-3xl mx-auto">
                            {[
                                { value: '20+', label: 'AI Agents', icon: '🤖' },
                                { value: '99.9%', label: 'Uptime', icon: '⚡' },
                                { value: '10K+', label: 'Users', icon: '👥' },
                                { value: '24/7', label: 'Support', icon: '🛡️' },
                            ].map((stat, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl p-4 text-center transition-all duration-400 hover:scale-105"
                                    style={{
                                        background: 'rgba(255,255,255,0.025)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(12px)',
                                    }}
                                >
                                    <div className="text-xs mb-1 opacity-40">{stat.icon}</div>
                                    <div className="text-2xl md:text-3xl font-bold text-white/90 mb-0.5">{stat.value}</div>
                                    <div className="text-[11px] uppercase tracking-wider text-white/20">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Scroll cue */}
                <div className="scroll-cue absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0" style={{ zIndex: 12 }}>
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/20">Dive In</span>
                        <svg className="scroll-arrow w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </div>
                </div>
            </section>
        </>
    );
}
