import { useEffect, useRef } from 'react';
import { TrendingTopic } from '../types';

interface BubbleChartProps {
  topics: TrendingTopic[];
  maxDisplay: number;
  theme: 'dark' | 'light';
  onBubbleTimingUpdate?: (nextPopTime: number | null, createdTime?: number, lifetime?: number) => void;
}

interface Bubble {
  topic: TrendingTopic;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  createdAt: number;
  lifetime: number;
  isPopping?: boolean;
  popProgress?: number;
  isSpawning?: boolean;
  spawnProgress?: number;
}

export default function BubbleChart({ topics, maxDisplay, theme, onBubbleTimingUpdate }: BubbleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const animationFrameRef = useRef<number>();
  const displayedIndicesRef = useRef<Set<number>>(new Set());
  const nextIndexRef = useRef<number>(0);

  const bubbleLifetimes = [40000, 60000, 80000, 100000, 120000];

  const handleCanvasClick = (event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (const bubble of bubblesRef.current) {
      const dx = x - bubble.x;
      const dy = y - bubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= bubble.radius && bubble.topic.url) {
        window.open(bubble.topic.url, '_blank');
        break;
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = (window.innerHeight - 150) * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = (window.innerHeight - 150) + 'px';
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    canvas.addEventListener('click', handleCanvasClick);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      let isOverBubble = false;
      for (const bubble of bubblesRef.current) {
        const dx = x - bubble.x;
        const dy = y - bubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= bubble.radius && bubble.topic.url) {
          isOverBubble = true;
          break;
        }
      }

      canvas.style.cursor = isOverBubble ? 'pointer' : 'default';
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const volumes = topics.map(t => t.searchVolume).sort((a, b) => b - a);
    const maxSearchVolume = volumes[0];
    const medianVolume = volumes[Math.floor(volumes.length / 2)];
    const minVolume = volumes[volumes.length - 1];

    const volumeRange = maxSearchVolume - minVolume;
    const hasHighVariance = volumeRange > medianVolume * 2;

    const calculateBubbleSize = (searchVolume: number) => {
      const isMobile = window.innerWidth < 768;
      const displayCount = Math.min(maxDisplay, topics.length);
      const densityFactor = Math.min(1, Math.sqrt(50 / displayCount));

      const normalizedScale = (searchVolume - minVolume) / (maxSearchVolume - minVolume || 1);

      const exponentialScale = Math.pow(normalizedScale, 0.5);

      const baseMin = (isMobile ? 18 : 24) * densityFactor;
      const baseMax = (isMobile ? 60 : 80) * densityFactor;

      const scaledSize = baseMin + exponentialScale * (baseMax - baseMin);

      return Math.max(baseMin, scaledSize);
    };

    const getRandomColor = (index: number) => {
      const colors = [
        '#3B82F6', '#10B981', '#EAB308', '#EF4444',
        '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
        '#8B5CF6', '#84CC16', '#F59E0B', '#6366F1'
      ];
      return colors[index % colors.length];
    };

    const createBubble = (topicIndex: number, existingBubbles: Bubble[] = []): Bubble => {
      const topic = topics[topicIndex];
      const randomLifetime = bubbleLifetimes[Math.floor(Math.random() * bubbleLifetimes.length)];
      const radius = calculateBubbleSize(topic.searchVolume);
      const dpr = window.devicePixelRatio || 1;
      const canvasDisplayWidth = canvas.width / dpr;
      const canvasDisplayHeight = canvas.height / dpr;

      let x, y;
      let attempts = 0;
      const maxAttempts = 50;

      do {
        x = Math.random() * (canvasDisplayWidth - radius * 2 - 100) + radius + 50;
        y = Math.random() * (canvasDisplayHeight - radius * 2 - 100) + radius + 50;
        attempts++;

        const hasOverlap = existingBubbles.some(other => {
          const dx = x - other.x;
          const dy = y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < radius + other.radius + 10;
        });

        if (!hasOverlap || attempts >= maxAttempts) break;
      } while (true);

      return {
        topic,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius,
        color: getRandomColor(topicIndex),
        createdAt: Date.now(),
        lifetime: randomLifetime,
        isSpawning: true,
        spawnProgress: 0,
      };
    };

    displayedIndicesRef.current.clear();
    const initialCount = Math.min(maxDisplay, topics.length);
    bubblesRef.current = [];
    for (let i = 0; i < initialCount; i++) {
      displayedIndicesRef.current.add(i);
      bubblesRef.current.push(createBubble(i, bubblesRef.current));
    }
    nextIndexRef.current = initialCount;

    const checkCollision = (b1: Bubble, b2: Bubble) => {
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < b1.radius + b2.radius;
    };

    const resolveCollision = (b1: Bubble, b2: Bubble) => {
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) return;

      const minDist = b1.radius + b2.radius;
      const overlap = minDist - distance;

      if (overlap <= 0) return;

      const nx = dx / distance;
      const ny = dy / distance;

      const separationForce = overlap * 0.5;
      b1.x -= nx * separationForce;
      b1.y -= ny * separationForce;
      b2.x += nx * separationForce;
      b2.y += ny * separationForce;

      const relativeVelocityX = b1.vx - b2.vx;
      const relativeVelocityY = b1.vy - b2.vy;
      const speed = relativeVelocityX * nx + relativeVelocityY * ny;

      if (speed < 0) return;

      const impulse = speed * 0.3;
      b1.vx -= impulse * nx;
      b1.vy -= impulse * ny;
      b2.vx += impulse * nx;
      b2.vy += impulse * ny;
    };

    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const now = Date.now();

      if (topics.length > maxDisplay) {
        bubblesRef.current.forEach((bubble) => {
          if (!bubble.isPopping && !bubble.isSpawning && (now - bubble.createdAt) >= bubble.lifetime) {
            bubble.isPopping = true;
            bubble.popProgress = 0;
          }
        });
      }

      bubblesRef.current.forEach((bubble) => {
        const speedLimit = 1.5;
        const currentSpeed = Math.sqrt(bubble.vx * bubble.vx + bubble.vy * bubble.vy);
        if (currentSpeed > speedLimit) {
          bubble.vx = (bubble.vx / currentSpeed) * speedLimit;
          bubble.vy = (bubble.vy / currentSpeed) * speedLimit;
        }

        bubble.vx *= 0.998;
        bubble.vy *= 0.998;

        if (bubble.isSpawning) {
          bubble.spawnProgress = Math.min((bubble.spawnProgress || 0) + 0.05, 1);
          if (bubble.spawnProgress >= 1) {
            bubble.isSpawning = false;
            bubble.createdAt = Date.now();
          }
        }

        if (bubble.isPopping) {
          bubble.popProgress = Math.min((bubble.popProgress || 0) + 0.08, 1);
        }

        if (!bubble.isPopping) {
          bubble.x += bubble.vx;
          bubble.y += bubble.vy;

          const canvasDisplayWidth = canvas.width / dpr;
          const canvasDisplayHeight = canvas.height / dpr;

          if (bubble.x - bubble.radius < 0 || bubble.x + bubble.radius > canvasDisplayWidth) {
            bubble.vx *= -1;
            bubble.x = Math.max(bubble.radius, Math.min(canvasDisplayWidth - bubble.radius, bubble.x));
          }
          if (bubble.y - bubble.radius < 0 || bubble.y + bubble.radius > canvasDisplayHeight) {
            bubble.vy *= -1;
            bubble.y = Math.max(bubble.radius, Math.min(canvasDisplayHeight - bubble.radius, bubble.y));
          }
        }
      });

      for (let i = 0; i < bubblesRef.current.length; i++) {
        for (let j = i + 1; j < bubblesRef.current.length; j++) {
          if (checkCollision(bubblesRef.current[i], bubblesRef.current[j])) {
            resolveCollision(bubblesRef.current[i], bubblesRef.current[j]);
          }
        }
      }

      const bubblesToAdd: Bubble[] = [];
      // Update parent component with next bubble pop time
      if (onBubbleTimingUpdate && bubblesRef.current.length > 0) {
        const oldestBubble = bubblesRef.current.reduce((oldest, bubble) => {
          const bubbleExpiry = bubble.createdAt + bubble.lifetime;
          const oldestExpiry = oldest.createdAt + oldest.lifetime;
          return bubbleExpiry < oldestExpiry ? bubble : oldest;
        });
        const nextPopTime = oldestBubble.createdAt + oldestBubble.lifetime;
        onBubbleTimingUpdate(nextPopTime, oldestBubble.createdAt, oldestBubble.lifetime);
      }

      bubblesRef.current = bubblesRef.current.filter((bubble) => {
        if (bubble.isPopping && (bubble.popProgress || 0) >= 1) {
          const topicIndex = topics.findIndex(t => t.name === bubble.topic.name);
          if (topicIndex !== -1) {
            displayedIndicesRef.current.delete(topicIndex);
          }

          let nextIndex = nextIndexRef.current;
          if (nextIndex >= topics.length) {
            nextIndex = 0;
            nextIndexRef.current = 0;
          }

          if (topics.length > 0) {
            const newBubble = createBubble(nextIndex, bubblesRef.current);
            displayedIndicesRef.current.add(nextIndex);
            nextIndexRef.current = nextIndex + 1;
            bubblesToAdd.push(newBubble);
          }
          return false;
        }
        return true;
      });

      bubblesRef.current.push(...bubblesToAdd);

      bubblesRef.current.forEach((bubble) => {
        const colorRgb = bubble.color.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [60, 130, 246];

        let displayRadius = bubble.radius;
        let opacity = 1;

        const age = Date.now() - bubble.createdAt;
        const ageRatio = Math.min(age / bubble.lifetime, 1);
        const colorIntensity = theme === 'dark' ? (1 - ageRatio * 0.6) : 1;

        if (bubble.isSpawning) {
          const progress = bubble.spawnProgress || 0;
          displayRadius = bubble.radius * progress;
          opacity = progress;
        } else if (bubble.isPopping) {
          const progress = bubble.popProgress || 0;
          displayRadius = bubble.radius * (1 + progress * 0.5);
          opacity = 1 - progress;
        }

        const innerGlow = ctx.createRadialGradient(
          bubble.x,
          bubble.y,
          displayRadius,
          bubble.x,
          bubble.y,
          Math.max(0, displayRadius - 10)
        );
        if (theme === 'dark') {
          innerGlow.addColorStop(0, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, ${0.8 * opacity * colorIntensity})`);
          innerGlow.addColorStop(1, 'rgba(20, 20, 20, 0)');
        } else {
          innerGlow.addColorStop(0, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, ${0.4 * opacity})`);
          innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        const gradient = ctx.createRadialGradient(
          bubble.x - displayRadius * 0.3,
          bubble.y - displayRadius * 0.3,
          0,
          bubble.x,
          bubble.y,
          displayRadius
        );

        if (theme === 'dark') {
          gradient.addColorStop(0, `rgba(50, 50, 50, ${0.9 * opacity})`);
          gradient.addColorStop(0.5, `rgba(30, 30, 30, ${0.85 * opacity})`);
          gradient.addColorStop(1, `rgba(20, 20, 20, ${0.9 * opacity})`);
        } else {
          gradient.addColorStop(0, `rgba(250, 250, 255, ${0.95 * opacity})`);
          gradient.addColorStop(0.5, `rgba(240, 242, 250, ${0.9 * opacity})`);
          gradient.addColorStop(1, `rgba(230, 235, 245, ${0.95 * opacity})`);
        }

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerGlow;
        ctx.fill();

        if (bubble.isSpawning) {
          const glowIntensity = bubble.spawnProgress || 0;
          ctx.shadowColor = bubble.color;
          ctx.shadowBlur = Math.max(15, displayRadius / 3) * glowIntensity;
        } else {
          ctx.shadowColor = bubble.color;
          ctx.shadowBlur = theme === 'dark' ? Math.max(8, displayRadius / 8) * colorIntensity : Math.max(8, displayRadius / 8);
        }

        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, displayRadius, 0, Math.PI * 2);
        ctx.strokeStyle = bubble.color;
        ctx.globalAlpha = theme === 'dark' ? opacity * colorIntensity : opacity;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (opacity > 0.1) {
          ctx.globalAlpha = opacity;
          const textBrightness = theme === 'dark' ? (1 - ageRatio * 0.3) : 1;
          const textAlpha = theme === 'dark' ? textBrightness : 1;
          ctx.fillStyle = theme === 'dark' ? `rgba(255, 255, 255, ${textAlpha})` : 'rgb(30, 30, 30)';
          const isMobile = window.innerWidth < 768;
          const fontSize = Math.max(isMobile ? 9 : 10, displayRadius / (isMobile ? 3.2 : 3.5));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const cleanName = bubble.topic.name.replace(/"/g, '');
          const maxWidth = displayRadius * 1.6;
          const words = cleanName.split(' ');
          const lines: string[] = [];
          let currentLine = '';

          words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });
          if (currentLine) lines.push(currentLine);

          const maxLines = 3;
          const displayLines = lines.slice(0, maxLines);
          if (lines.length > maxLines) {
            const lastLine = displayLines[maxLines - 1];
            displayLines[maxLines - 1] = lastLine.length > 10 ? lastLine.slice(0, 10) + '...' : lastLine + '...';
          }

          const lineHeight = fontSize * 1.2;
          const totalTextHeight = displayLines.length * lineHeight;
          const startY = bubble.y - totalTextHeight / 2 + fontSize / 2;

          displayLines.forEach((line, i) => {
            ctx.fillText(line, bubble.x, startY + i * lineHeight);
          });

          ctx.font = `${Math.max(8, displayRadius / 5)}px sans-serif`;
          const volumeAlpha = theme === 'dark' ? 0.9 * textBrightness : 0.9;
          ctx.fillStyle = theme === 'dark' ? `rgba(200, 200, 200, ${volumeAlpha * opacity})` : `rgba(60, 60, 60, ${0.9 * opacity})`;
          const volumeY = startY + displayLines.length * lineHeight + Math.max(4, displayRadius / 10);
          const cleanVolume = bubble.topic.searchVolumeRaw.replace(/"/g, '');
          ctx.fillText(cleanVolume, bubble.x, volumeY);
          ctx.globalAlpha = 1;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('click', handleCanvasClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [topics, maxDisplay, theme]);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
