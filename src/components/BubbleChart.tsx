import { useEffect, useRef, useState } from 'react';
import { TrendingTopic, CryptoTimeframe } from '../types';
import BubbleTooltip from './BubbleTooltip';
import { supabase } from '../lib/supabase';
import { BubbleLayout } from './FilterMenu';
import { X } from 'lucide-react';

export type AnimationStyle = 'default' | 'bounce' | 'elastic' | 'spiral' | 'drop' | 'pulse' | 'shimmer';

interface BubbleChartProps {
  topics: TrendingTopic[];
  maxDisplay: number;
  theme: 'dark' | 'light';
  layout?: BubbleLayout;
  onBubbleTimingUpdate?: (nextPopTime: number | null, createdTime?: number, lifetime?: number) => void;
  comparingTopics?: Set<string>;
  onComparingTopicsChange?: (topics: Set<string>) => void;
  useCryptoColors?: boolean;
  cryptoTimeframe?: CryptoTimeframe;
  animationStyle?: AnimationStyle;
}

interface Bubble {
  topic: TrendingTopic;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  createdAt: number;
  lifetime: number;
  isPopping?: boolean;
  popProgress?: number;
  isSpawning?: boolean;
  spawnProgress?: number;
  isHovered?: boolean;
  isComparing?: boolean;
  isPinned?: boolean;
  layoutX?: number;
  layoutY?: number;
  rotation?: number;
  initialY?: number;
}

export default function BubbleChart({ topics, maxDisplay, theme, layout = 'force', onBubbleTimingUpdate, comparingTopics: externalComparingTopics, onComparingTopicsChange, useCryptoColors = false, cryptoTimeframe = '1h', animationStyle = 'default' }: BubbleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const animationFrameRef = useRef<number>();
  const displayedIndicesRef = useRef<Set<number>>(new Set());
  const displayedTopicNamesRef = useRef<Set<string>>(new Set());
  const nextIndexRef = useRef<number>(0);
  const initialLoadQueueRef = useRef<number[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const hoveredBubbleRef = useRef<Bubble | null>(null);
  const shrinkFactorRef = useRef<number>(1.0);
  const [tooltipData, setTooltipData] = useState<{ topic: TrendingTopic; x: number; y: number } | null>(null);
  const [pinnedTopics, setPinnedTopics] = useState<Set<string>>(new Set());
  const [internalComparingTopics, setInternalComparingTopics] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [showMaxCompareMessage, setShowMaxCompareMessage] = useState(false);

  const comparingTopics = externalComparingTopics || internalComparingTopics;
  const setComparingTopics = onComparingTopicsChange || setInternalComparingTopics;

  const bubbleLifetimes = [40000, 60000, 80000, 100000, 120000];

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    loadUserData();
  }, []);

  const handleTogglePin = (topicName: string) => {
    setPinnedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicName)) {
        next.delete(topicName);
        bubblesRef.current.forEach(b => {
          if (b.topic.name === topicName) b.isPinned = false;
        });
      } else {
        next.add(topicName);
        bubblesRef.current.forEach(b => {
          if (b.topic.name === topicName) b.isPinned = true;
        });
      }
      return next;
    });
  };


  const handleToggleCompare = (topicName: string) => {
    setComparingTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicName)) {
        next.delete(topicName);
        bubblesRef.current.forEach(b => {
          if (b.topic.name === topicName) b.isComparing = false;
        });
      } else {
        if (next.size >= 5) {
          setShowMaxCompareMessage(true);
          setTimeout(() => setShowMaxCompareMessage(false), 3000);
          return prev;
        }
        next.add(topicName);
        bubblesRef.current.forEach(b => {
          if (b.topic.name === topicName) b.isComparing = true;
        });
      }
      return next;
    });
  };

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

      if (distance <= bubble.radius) {
        event.preventDefault();
        event.stopPropagation();
        setTooltipData({
          topic: bubble.topic,
          x: event.clientX,
          y: event.clientY
        });
        break;
      }
    }
  };

  const handleCanvasTouch = (event: TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    for (const bubble of bubblesRef.current) {
      const dx = x - bubble.x;
      const dy = y - bubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= bubble.radius) {
        event.preventDefault();
        event.stopPropagation();
        setTooltipData({
          topic: bubble.topic,
          x: touch.clientX,
          y: touch.clientY
        });
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
      const isMobile = window.innerWidth < 768;
      const heightOffset = isMobile ? 0 : 150;
      canvas.width = rect.width * dpr;
      canvas.height = (window.innerHeight - heightOffset) * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = (window.innerHeight - heightOffset) + 'px';
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasTouch);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      let isOverBubble = false;
      hoveredBubbleRef.current = null;

      for (const bubble of bubblesRef.current) {
        const dx = x - bubble.x;
        const dy = y - bubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        bubble.isHovered = false;

        if (distance <= bubble.radius) {
          isOverBubble = true;
          bubble.isHovered = true;
          hoveredBubbleRef.current = bubble;
          break;
        }
      }

      canvas.style.cursor = isOverBubble ? 'pointer' : 'default';
    };

    // Only add mousemove listener on non-touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
      canvas.addEventListener('mousemove', handleMouseMove);
    }

    const getCryptoValue = (topic: TrendingTopic): number => {
      if (!topic.crypto_data || !useCryptoColors) return topic.searchVolume;

      const timeframeMap = {
        '1h': topic.crypto_data.change_1h,
        '24h': topic.crypto_data.change_24h,
        '7d': topic.crypto_data.change_7d,
        '30d': topic.crypto_data.change_30d,
        '1y': topic.crypto_data.change_1y,
      };

      const changeValue = timeframeMap[cryptoTimeframe];
      return Math.floor(Math.abs(changeValue) * 100000);
    };

    const getCryptoDisplayText = (topic: TrendingTopic): string => {
      if (!topic.crypto_data || !useCryptoColors) return topic.searchVolumeRaw;

      const timeframeMap = {
        '1h': topic.crypto_data.formatted.change_1h,
        '24h': topic.crypto_data.formatted.change_24h,
        '7d': topic.crypto_data.formatted.change_7d,
        '30d': topic.crypto_data.formatted.change_30d,
        '1y': topic.crypto_data.formatted.change_1y,
      };

      const timeframeLabel = {
        '1h': '1h',
        '24h': '24h',
        '7d': '7d',
        '30d': '30d',
        '1y': '1y',
      };

      return `${timeframeMap[cryptoTimeframe]}% (${timeframeLabel[cryptoTimeframe]}) • ${topic.crypto_data.formatted.price} • ${topic.crypto_data.formatted.volume}`;
    };

    const volumes = topics.map(t => getCryptoValue(t)).sort((a, b) => b - a);
    const maxSearchVolume = volumes[0];
    const medianVolume = volumes[Math.floor(volumes.length / 2)];
    const minVolume = Math.max(1, volumes[volumes.length - 1]);

    const volumeRange = maxSearchVolume - minVolume;
    const hasHighVariance = volumeRange > medianVolume * 2;

    const rangeRatio = maxSearchVolume / Math.max(1, minVolume);
    const hasExtremeRange = rangeRatio > 1000;

    const calculateBubbleSize = (searchVolume: number) => {
      const isMobile = window.innerWidth < 768;
      const displayCount = Math.min(maxDisplay, topics.length);
      const densityFactor = Math.min(1, Math.sqrt(50 / displayCount));

      // Apply square root to maintain proper area proportionality
      const sqrtVolume = Math.sqrt(searchVolume);
      const sqrtMin = Math.sqrt(minVolume);
      const sqrtMax = Math.sqrt(maxSearchVolume);

      const normalizedScale = (sqrtVolume - sqrtMin) / (sqrtMax - sqrtMin || 1);

      // For extreme ranges, use much wider size range to show differences
      let baseMin, baseMax;
      if (hasExtremeRange) {
        baseMin = (isMobile ? 15 : 20) * densityFactor;
        baseMax = (isMobile ? 120 : 180) * densityFactor;
      } else {
        baseMin = (isMobile ? 30 : 40) * densityFactor;
        baseMax = (isMobile ? 80 : 120) * densityFactor;
      }

      const scaledSize = baseMin + normalizedScale * (baseMax - baseMin);

      const layoutScaleFactor = layout === 'force' ? 1.0 : 0.4;

      return Math.max(baseMin * layoutScaleFactor, scaledSize * layoutScaleFactor);
    };

    const getCryptoColorByGain = (searchVolume: number, searchVolumeRaw: string) => {
      // Extract the 24h percentage from searchVolumeRaw
      const match = searchVolumeRaw.match(/^([+-]?\d+\.?\d*)%/);
      if (!match) return '#22C55E'; // Default to green if parsing fails

      const percentChange = parseFloat(match[1]);

      // Green shades for gains
      if (percentChange >= 5) return '#0D7C4E';  // Dark green
      if (percentChange >= 2) return '#16A34A';  // Medium green
      if (percentChange >= 0) return '#22C55E';  // Light green

      // Red shades for losses
      if (percentChange >= -2) return '#DC2626'; // Light red
      if (percentChange >= -5) return '#B91C1C'; // Medium red
      return '#991B1B'; // Dark red
    };

    const getRandomColor = (index: number) => {
      const colors = [
        '#3B82F6', '#10B981', '#EAB308', '#EF4444',
        '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
        '#8B5CF6', '#84CC16', '#F59E0B', '#6366F1'
      ];
      return colors[index % colors.length];
    };

    const findNonOverlappingPosition = (
      initialX: number,
      initialY: number,
      radius: number,
      canvasDisplayWidth: number,
      canvasDisplayHeight: number,
      existingBubbles: Bubble[],
      allowWideSearch: boolean = true
    ): { x: number; y: number } => {
      const minSpacing = 20;
      const padding = 60;

      const checkPosition = (testX: number, testY: number): boolean => {
        if (testX - radius < padding || testX + radius > canvasDisplayWidth - padding) return false;
        if (testY - radius < padding || testY + radius > canvasDisplayHeight - padding) return false;

        return !existingBubbles.some(other => {
          const dx = testX - other.x;
          const dy = testY - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const requiredDistance = radius + other.radius + minSpacing;
          return dist < requiredDistance;
        });
      };

      if (checkPosition(initialX, initialY)) {
        return { x: initialX, y: initialY };
      }

      if (!allowWideSearch) {
        return { x: initialX, y: initialY };
      }

      const spiralAttempts = 300;
      let spiralAngle = 0;
      let spiralDistance = minSpacing;

      for (let i = 0; i < spiralAttempts; i++) {
        spiralAngle += 0.4;
        spiralDistance += 1.5;

        const x = initialX + Math.cos(spiralAngle) * spiralDistance;
        const y = initialY + Math.sin(spiralAngle) * spiralDistance;

        if (checkPosition(x, y)) {
          return { x, y };
        }
      }

      const gridSearchRadius = 300;
      const gridStep = Math.max(radius * 2 + minSpacing, 30);
      for (let offsetX = -gridSearchRadius; offsetX <= gridSearchRadius; offsetX += gridStep) {
        for (let offsetY = -gridSearchRadius; offsetY <= gridSearchRadius; offsetY += gridStep) {
          const x = initialX + offsetX;
          const y = initialY + offsetY;
          if (checkPosition(x, y)) {
            return { x, y };
          }
        }
      }

      return { x: initialX, y: initialY };
    };

    const calculateLayoutPosition = (
      topicIndex: number,
      radius: number,
      canvasDisplayWidth: number,
      canvasDisplayHeight: number,
      existingBubbles: Bubble[]
    ): { x: number; y: number } => {
      const topic = topics[topicIndex];
      const padding = 100;
      let initialX: number, initialY: number;

      switch (layout) {
        case 'grid': {
          const displayCount = Math.min(maxDisplay, topics.length);
          const cols = Math.ceil(Math.sqrt(displayCount));
          const rows = Math.ceil(displayCount / cols);

          const availableWidth = canvasDisplayWidth - padding * 2;
          const availableHeight = canvasDisplayHeight - padding * 2;

          const cellWidth = availableWidth / cols;
          const cellHeight = availableHeight / rows;

          const row = Math.floor(topicIndex / cols);
          const col = topicIndex % cols;

          initialX = padding + col * cellWidth + cellWidth / 2;
          initialY = padding + row * cellHeight + cellHeight / 2;
          return { x: initialX, y: initialY };
        }

        case 'circular': {
          const centerX = canvasDisplayWidth / 2;
          const centerY = canvasDisplayHeight / 2;
          const maxRadius = Math.min(canvasDisplayWidth, canvasDisplayHeight) / 2 - padding - radius * 2;

          const displayCount = Math.min(maxDisplay, topics.length);
          // Increase items per ring to reduce overlap
          const itemsPerRing = Math.max(8, Math.ceil(Math.sqrt(displayCount * 1.5)));
          const volumeRatio = topic.searchVolume / (Math.max(...topics.map(t => t.searchVolume)) || 1);

          const ringCount = Math.ceil(displayCount / itemsPerRing);
          const ringIndex = Math.floor(topicIndex / itemsPerRing);
          const posInRing = topicIndex % itemsPerRing;
          const itemsInThisRing = Math.min(itemsPerRing, displayCount - ringIndex * itemsPerRing);

          // Spread rings more evenly across the space
          const distance = ringCount === 1
            ? maxRadius * 0.5
            : maxRadius * (0.2 + (ringIndex / (ringCount - 1)) * 0.75);
          const angleStep = (Math.PI * 2) / itemsInThisRing;
          const angle = posInRing * angleStep;

          initialX = centerX + Math.cos(angle) * distance;
          initialY = centerY + Math.sin(angle) * distance;
          return { x: initialX, y: initialY };
        }

        case 'timeline': {
          const sortedTopics = [...topics].sort((a, b) => {
            const dateA = new Date(a.createdAt || a.pubDate || '').getTime();
            const dateB = new Date(b.createdAt || b.pubDate || '').getTime();
            return dateA - dateB;
          });

          const sortedIndex = sortedTopics.findIndex(t => t.name === topic.name);
          const displayCount = Math.min(maxDisplay, topics.length);

          // Use more horizontal space and ensure minimum spacing
          const availableWidth = canvasDisplayWidth - padding * 2;
          const minSpacing = radius * 2.5;
          const calculatedSpacing = availableWidth / Math.max(1, displayCount);
          const spacing = Math.max(minSpacing, calculatedSpacing);
          initialX = padding + sortedIndex * spacing + spacing / 2;

          // Spread bubbles more vertically to reduce overlap
          const normalizedVolume = topic.searchVolume / (Math.max(...topics.map(t => t.searchVolume)) || 1);
          const availableHeight = canvasDisplayHeight - padding * 2;
          const minY = padding + radius * 2;
          const maxY = canvasDisplayHeight - padding - radius * 2;
          initialY = maxY - normalizedVolume * (maxY - minY) * 0.8;

          return { x: initialX, y: initialY };
        }

        case 'importance': {
          const centerX = canvasDisplayWidth / 2;
          const centerY = canvasDisplayHeight / 2;
          const sortedByVolume = [...topics].sort((a, b) => b.searchVolume - a.searchVolume);
          const volumeIndex = sortedByVolume.findIndex(t => t.name === topic.name);

          if (volumeIndex === 0) {
            return { x: centerX, y: centerY };
          }

          // Increase items per ring based on ring number to reduce overlap
          const baseItemsPerRing = 6;
          const ring = volumeIndex === 0 ? 0 : Math.floor((volumeIndex - 1) / baseItemsPerRing) + 1;
          const itemsInPreviousRings = ring === 0 ? 0 : 1 + (ring - 1) * baseItemsPerRing;
          const posInRing = volumeIndex - itemsInPreviousRings - 1;
          const itemsPerRing = ring === 0 ? 1 : baseItemsPerRing + (ring - 1) * 2;

          const averageRadius = bubblesRef.current.length > 0
            ? bubblesRef.current.reduce((sum, b) => sum + b.baseRadius, 0) / bubblesRef.current.length
            : radius;

          // Increase ring spacing to prevent overlap
          const ringSpacing = Math.max(averageRadius * 5, 140);
          const ringRadius = ring * ringSpacing;
          const angle = (posInRing / itemsPerRing) * Math.PI * 2;

          initialX = centerX + Math.cos(angle) * ringRadius;
          initialY = centerY + Math.sin(angle) * ringRadius;
          return { x: initialX, y: initialY };
        }

        case 'hierarchical': {
          const categoryGroups = topics.reduce((acc, t) => {
            const cat = t.category || 'Uncategorized';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(t);
            return acc;
          }, {} as Record<string, TrendingTopic[]>);

          const categories = Object.keys(categoryGroups);
          const topicCategory = topic.category || 'Uncategorized';
          const categoryIndex = categories.indexOf(topicCategory);
          const topicsInCategory = categoryGroups[topicCategory];
          const indexInCategory = topicsInCategory.findIndex(t => t.name === topic.name);

          const cols = Math.ceil(Math.sqrt(categories.length));
          const rows = Math.ceil(categories.length / cols);
          const categoryCol = categoryIndex % cols;
          const categoryRow = Math.floor(categoryIndex / cols);

          const availableWidth = canvasDisplayWidth - padding * 2;
          const availableHeight = canvasDisplayHeight - padding * 2;
          const clusterWidth = availableWidth / cols;
          const clusterHeight = availableHeight / rows;

          const clusterCenterX = padding + categoryCol * clusterWidth + clusterWidth / 2;
          const clusterCenterY = padding + categoryRow * clusterHeight + clusterHeight / 2;

          const itemsPerRow = Math.ceil(Math.sqrt(topicsInCategory.length));
          const itemCol = indexInCategory % itemsPerRow;
          const itemRow = Math.floor(indexInCategory / itemsPerRow);

          const clusterPadding = Math.min(clusterWidth, clusterHeight) * 0.2;
          const itemSpacing = (Math.min(clusterWidth, clusterHeight) - clusterPadding * 2) / (itemsPerRow + 1);

          initialX = clusterCenterX - (itemsPerRow * itemSpacing) / 2 + itemCol * itemSpacing + itemSpacing;
          initialY = clusterCenterY - (itemsPerRow * itemSpacing) / 2 + itemRow * itemSpacing + itemSpacing;
          return { x: initialX, y: initialY };
        }

        case 'scatter': {
          const ageInDays = topic.createdAt || topic.pubDate
            ? (Date.now() - new Date(topic.createdAt || topic.pubDate || '').getTime()) / (1000 * 60 * 60 * 24)
            : topicIndex * 5;

          const maxAge = Math.max(...topics.map(t => {
            const date = t.createdAt || t.pubDate;
            return date ? (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24) : 0;
          }), 1);

          const availableWidth = canvasDisplayWidth - padding * 2 - radius * 4;
          const availableHeight = canvasDisplayHeight - padding * 2 - radius * 4;

          initialX = padding + radius * 2 + (ageInDays / maxAge) * availableWidth;
          const normalizedVolume = topic.searchVolume / (Math.max(...topics.map(t => t.searchVolume)) || 1);
          initialY = canvasDisplayHeight - padding - radius * 2 - normalizedVolume * availableHeight;

          return { x: initialX, y: initialY };
        }

        case 'packed': {
          const centerX = canvasDisplayWidth / 2;
          const centerY = canvasDisplayHeight / 2;
          const sortedByVolume = [...topics].sort((a, b) => b.searchVolume - a.searchVolume);
          const volumeIndex = sortedByVolume.findIndex(t => t.name === topic.name);

          if (volumeIndex === 0) {
            return { x: centerX, y: centerY };
          }

          let placed = false;
          let attempts = 0;
          let x = centerX, y = centerY;
          const spiralIncrement = 0.3;
          let spiralRadius = radius * 3;
          let spiralAngle = volumeIndex * 0.8;

          while (!placed && attempts < 300) {
            spiralAngle += spiralIncrement;
            spiralRadius += spiralIncrement * 3;

            x = centerX + Math.cos(spiralAngle) * spiralRadius;
            y = centerY + Math.sin(spiralAngle) * spiralRadius;

            if (x < padding + radius || x > canvasDisplayWidth - padding - radius ||
                y < padding + radius || y > canvasDisplayHeight - padding - radius) {
              attempts++;
              continue;
            }

            const hasOverlap = existingBubbles.some(other => {
              const dx = x - other.x;
              const dy = y - other.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              return dist < radius + other.radius + 10;
            });

            if (!hasOverlap) placed = true;
            attempts++;
          }

          return { x, y };
        }

        case 'force':
        default: {
          let x, y;
          let attempts = 0;
          const maxAttempts = 50;

          do {
            x = Math.random() * (canvasDisplayWidth - radius * 2 - padding * 2) + radius + padding;
            y = Math.random() * (canvasDisplayHeight - radius * 2 - padding * 2) + radius + padding;
            attempts++;

            const hasOverlap = existingBubbles.some(other => {
              const dx = x - other.x;
              const dy = y - other.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance < radius + other.radius + 10;
            });

            if (!hasOverlap || attempts >= maxAttempts) break;
          } while (true);

          return { x, y };
        }
      }
    };

    const createBubble = (topicIndex: number, existingBubbles: Bubble[] = []): Bubble => {
      const topic = topics[topicIndex];
      const randomLifetime = bubbleLifetimes[Math.floor(Math.random() * bubbleLifetimes.length)];
      const cryptoValue = getCryptoValue(topic);
      const radius = calculateBubbleSize(cryptoValue);
      const dpr = window.devicePixelRatio || 1;
      const canvasDisplayWidth = canvas.width / dpr;
      const canvasDisplayHeight = canvas.height / dpr;

      const { x, y } = calculateLayoutPosition(topicIndex, radius, canvasDisplayWidth, canvasDisplayHeight, existingBubbles);

      const usePhysics = layout === 'force';

      const isStaticLayout = !usePhysics;

      // For spawning bubbles, start from 0 for smooth animation
      // For static layouts, start at full size
      // The shrink factor will be applied during animation
      const initialRadius = isStaticLayout ? radius : 0;

      return {
        topic,
        x,
        y,
        layoutX: x,
        layoutY: y,
        vx: usePhysics ? (Math.random() - 0.5) * 0.25 : 0,
        vy: usePhysics ? (Math.random() - 0.5) * 0.25 : 0,
        radius: initialRadius,
        baseRadius: radius,
        color: useCryptoColors ? getCryptoColorByGain(cryptoValue, getCryptoDisplayText(topic)) : getRandomColor(topicIndex),
        createdAt: Date.now(),
        lifetime: randomLifetime,
        isSpawning: !isStaticLayout,
        spawnProgress: isStaticLayout ? 1 : 0,
        isPinned: pinnedTopics.has(topic.name),
        isComparing: comparingTopics.has(topic.name),
        rotation: 0,
        initialY: y,
      };
    };

    displayedIndicesRef.current.clear();
    displayedTopicNamesRef.current.clear();
    const initialCount = Math.min(maxDisplay, topics.length);
    bubblesRef.current = [];
    initialLoadQueueRef.current = [];

    if (layout === 'force') {
      for (let i = initialCount - 1; i >= 0; i--) {
        initialLoadQueueRef.current.push(i);
      }
    } else {
      for (let i = 0; i < initialCount; i++) {
        displayedIndicesRef.current.add(i);
        displayedTopicNamesRef.current.add(topics[i].name);
        bubblesRef.current.push(createBubble(i, bubblesRef.current));
      }
    }

    nextIndexRef.current = initialCount;
    lastSpawnTimeRef.current = Date.now();

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

      if (initialLoadQueueRef.current.length > 0) {
        const displayCount = Math.min(maxDisplay, topics.length);
        let spawnDelay = 100;
        if (displayCount < 30) {
          spawnDelay = 300;
        } else if (displayCount <= 50) {
          spawnDelay = 200;
        }

        if (now - lastSpawnTimeRef.current >= spawnDelay) {
          const nextTopicIndex = initialLoadQueueRef.current.shift();
          if (nextTopicIndex !== undefined) {
            displayedIndicesRef.current.add(nextTopicIndex);
            displayedTopicNamesRef.current.add(topics[nextTopicIndex].name);
            bubblesRef.current.push(createBubble(nextTopicIndex, bubblesRef.current));
            lastSpawnTimeRef.current = now;
          }
        }
      } else if (topics.length > maxDisplay) {
        bubblesRef.current.forEach((bubble) => {
          if (!bubble.isPopping && !bubble.isSpawning && !bubble.isPinned && (now - bubble.createdAt) >= bubble.lifetime) {
            bubble.isPopping = true;
            bubble.popProgress = 0;
          }
        });
      }

      bubblesRef.current.forEach((bubble) => {
        if (layout === 'force') {
          const speedLimit = 1.5;
          const currentSpeed = Math.sqrt(bubble.vx * bubble.vx + bubble.vy * bubble.vy);
          if (currentSpeed > speedLimit) {
            bubble.vx = (bubble.vx / currentSpeed) * speedLimit;
            bubble.vy = (bubble.vy / currentSpeed) * speedLimit;
          }

          bubble.vx *= 0.998;
          bubble.vy *= 0.998;
        }

        if (bubble.isSpawning) {
          const displayCount = Math.min(maxDisplay, topics.length);
          let baseSpawnSpeed = 0.05;
          if (displayCount < 30) {
            baseSpawnSpeed = 0.02;
          } else if (displayCount <= 50) {
            baseSpawnSpeed = 0.035;
          }

          const sizeRatio = bubble.baseRadius / 100;
          const sizeMultiplier = 1 / (1 + sizeRatio * 0.8);
          const spawnSpeed = baseSpawnSpeed * sizeMultiplier;

          bubble.spawnProgress = Math.min((bubble.spawnProgress || 0) + spawnSpeed, 1);
          if (bubble.spawnProgress >= 1) {
            bubble.isSpawning = false;
            bubble.createdAt = Date.now();
          }
        }

        if (bubble.isPopping) {
          bubble.popProgress = Math.min((bubble.popProgress || 0) + 0.08, 1);
        }

        if (!bubble.isPopping && layout === 'force') {
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

      if (layout === 'force') {
        for (let i = 0; i < bubblesRef.current.length; i++) {
          for (let j = i + 1; j < bubblesRef.current.length; j++) {
            if (checkCollision(bubblesRef.current[i], bubblesRef.current[j])) {
              resolveCollision(bubblesRef.current[i], bubblesRef.current[j]);
            }
          }
        }
      } else {
        bubblesRef.current.forEach((bubble) => {
          if (!bubble.isSpawning && !bubble.isPinned && bubble.layoutX !== undefined && bubble.layoutY !== undefined) {
            const dx = bubble.layoutX - bubble.x;
            const dy = bubble.layoutY - bubble.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0.5) {
              const pullStrength = 0.05;
              bubble.x += dx * pullStrength;
              bubble.y += dy * pullStrength;
            }
          }
        });
      }

      // Calculate density and apply uniform shrinking (maintains proportional accuracy)
      const canvasDisplayWidth = canvas.width / dpr;
      const canvasDisplayHeight = canvas.height / dpr;

      let shrinkFactor = 1.0;

      if (layout === 'force') {
        const canvasArea = canvasDisplayWidth * canvasDisplayHeight;

        // Calculate total bubble area
        const totalBubbleArea = bubblesRef.current.reduce((sum, bubble) => {
          return sum + Math.PI * bubble.baseRadius * bubble.baseRadius;
        }, 0);

        // Density ratio: how much of the canvas is covered by bubbles
        const densityRatio = totalBubbleArea / canvasArea;

        // Start shrinking when density exceeds threshold
        const isMobile = window.innerWidth < 768;
        const densityThreshold = isMobile ? 0.65 : 0.6;
        const shrinkAmount = isMobile ? 0.4 : 0.4;

        if (densityRatio > densityThreshold) {
          const excessDensity = Math.min(densityRatio - densityThreshold, 0.2) / 0.2;
          shrinkFactor = 1.0 - (excessDensity * shrinkAmount);
        }
      }

      // Store shrink factor for use when creating new bubbles
      shrinkFactorRef.current = shrinkFactor;

      // Apply uniform scaling to maintain proportional accuracy
      bubblesRef.current.forEach((bubble) => {
        const isMobile = window.innerWidth < 768;
        const hoverScale = (!isMobile && bubble.isHovered) ? 1.5 : 1.0;
        // All bubbles get same shrinkFactor, maintaining their relative proportions
        const targetRadius = bubble.baseRadius * shrinkFactor * hoverScale;
        // Faster transition for spawning bubbles, slower for others
        const transitionSpeed = bubble.isSpawning ? 0.5 : 0.1;
        bubble.radius += (targetRadius - bubble.radius) * transitionSpeed;
      });

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
          displayedTopicNamesRef.current.delete(bubble.topic.name);

          if (layout === 'force') {
            let nextIndex = nextIndexRef.current;
            if (nextIndex >= topics.length) {
              nextIndex = 0;
              nextIndexRef.current = 0;
            }

            if (topics.length > 0 && !displayedTopicNamesRef.current.has(topics[nextIndex].name)) {
              const newBubble = createBubble(nextIndex, bubblesRef.current);
              displayedIndicesRef.current.add(nextIndex);
              displayedTopicNamesRef.current.add(topics[nextIndex].name);
              nextIndexRef.current = nextIndex + 1;
              bubblesToAdd.push(newBubble);
            } else {
              nextIndexRef.current = nextIndex + 1;
            }
          }
          return false;
        }
        return true;
      });

      bubblesRef.current.push(...bubblesToAdd);

      if (layout !== 'force' && bubblesRef.current.length < maxDisplay && topics.length > 0) {
        const missingCount = maxDisplay - bubblesRef.current.length;
        const currentBubbles = [...bubblesRef.current];

        for (let i = 0; i < missingCount; i++) {
          let nextIndex = nextIndexRef.current;
          if (nextIndex >= topics.length) {
            nextIndex = 0;
            nextIndexRef.current = 0;
          }

          if (!displayedIndicesRef.current.has(nextIndex) && !displayedTopicNamesRef.current.has(topics[nextIndex].name)) {
            const newBubble = createBubble(nextIndex, currentBubbles);
            displayedIndicesRef.current.add(nextIndex);
            displayedTopicNamesRef.current.add(topics[nextIndex].name);
            currentBubbles.push(newBubble);
            bubblesRef.current.push(newBubble);
          }

          nextIndexRef.current = nextIndex + 1;
        }
      }

      bubblesRef.current.forEach((bubble) => {
        const colorRgb = bubble.color.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [60, 130, 246];

        let displayRadius = bubble.radius;
        let opacity = 1;

        const age = Date.now() - bubble.createdAt;
        const ageRatio = bubble.isPinned ? 0 : Math.min(age / bubble.lifetime, 1);
        const brightnessBoost = bubble.isHovered ? 0.3 : 0;
        const colorIntensity = theme === 'dark' ? (1 - ageRatio * 0.6 + brightnessBoost) : (1 + brightnessBoost);

        if (bubble.isSpawning) {
          const progress = bubble.spawnProgress || 0;
          const displayCount = Math.min(maxDisplay, topics.length);

          const sizeRatio = bubble.baseRadius / 100;
          const isLargeBubble = sizeRatio > 0.8;

          let easedProgress = progress;
          if (displayCount < 30 || isLargeBubble) {
            easedProgress = 1 - Math.pow(1 - progress, 4);
          } else if (displayCount <= 50) {
            easedProgress = 1 - Math.pow(1 - progress, 3);
          } else {
            easedProgress = 1 - Math.pow(1 - progress, 2.5);
          }

          switch (animationStyle) {
            case 'bounce':
              const bounceProgress = easedProgress < 0.8
                ? easedProgress / 0.8
                : 1 + Math.sin((easedProgress - 0.8) * Math.PI * 5) * 0.1;
              displayRadius = bubble.radius * bounceProgress;
              opacity = Math.min(easedProgress * 1.5, 1);
              break;

            case 'elastic':
              const elasticProgress = easedProgress === 1
                ? 1
                : Math.pow(2, -10 * easedProgress) * Math.sin((easedProgress - 0.1) * 5 * Math.PI) + 1;
              displayRadius = bubble.radius * elasticProgress;
              opacity = Math.min(easedProgress * 1.5, 1);
              break;

            case 'spiral':
              bubble.rotation = (1 - easedProgress) * Math.PI * 4;
              displayRadius = bubble.radius * easedProgress;
              opacity = easedProgress;
              break;

            case 'drop':
              const dropY = -100 * (1 - easedProgress) * (1 - easedProgress);
              bubble.y = (bubble.initialY || bubble.layoutY || bubble.y) + dropY;
              displayRadius = bubble.radius * easedProgress;
              opacity = easedProgress;
              break;

            case 'pulse':
              const pulseScale = 1 + Math.sin(progress * Math.PI * 3) * 0.2 * (1 - easedProgress);
              displayRadius = bubble.radius * easedProgress * pulseScale;
              opacity = easedProgress;
              break;

            case 'shimmer':
              displayRadius = bubble.radius * easedProgress;
              opacity = easedProgress;
              break;

            default:
              displayRadius = bubble.radius * easedProgress;
              opacity = easedProgress;
          }
        } else if (bubble.isPopping) {
          const progress = bubble.popProgress || 0;
          displayRadius = bubble.radius * (1 + progress * 0.5);
          opacity = 1 - progress;
        }

        if (theme === 'dark') {
          // Save context for rotation
          ctx.save();

          // Apply rotation for spiral animation
          if (bubble.isSpawning && animationStyle === 'spiral' && bubble.rotation !== undefined) {
            ctx.translate(bubble.x, bubble.y);
            ctx.rotate(bubble.rotation);
            ctx.translate(-bubble.x, -bubble.y);
          }

          // Dark theme: gradients and glows
          const innerGlow = ctx.createRadialGradient(
            bubble.x,
            bubble.y,
            displayRadius,
            bubble.x,
            bubble.y,
            Math.max(0, displayRadius - 10)
          );
          innerGlow.addColorStop(0, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, ${0.8 * opacity * colorIntensity})`);
          innerGlow.addColorStop(1, 'rgba(20, 20, 20, 0)');

          const gradient = ctx.createRadialGradient(
            bubble.x - displayRadius * 0.3,
            bubble.y - displayRadius * 0.3,
            0,
            bubble.x,
            bubble.y,
            displayRadius
          );
          gradient.addColorStop(0, `rgba(50, 50, 50, ${0.9 * opacity})`);
          gradient.addColorStop(0.5, `rgba(30, 30, 30, ${0.85 * opacity})`);
          gradient.addColorStop(1, `rgba(20, 20, 20, ${0.9 * opacity})`);

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
            const displayCount = Math.min(maxDisplay, topics.length);
            ctx.shadowColor = bubble.color;
            let shadowBlur = Math.max(15, displayRadius / 3) * glowIntensity;

            if (displayCount < 30) {
              shadowBlur = Math.max(30, displayRadius / 2) * glowIntensity;
            } else if (displayCount <= 50) {
              shadowBlur = Math.max(22, displayRadius / 2.5) * glowIntensity;
            }

            // Enhanced glow for pulse and shimmer
            if (animationStyle === 'pulse' || animationStyle === 'shimmer') {
              shadowBlur *= 1.5;
            }

            ctx.shadowBlur = shadowBlur;
          } else {
            ctx.shadowColor = bubble.color;
            ctx.shadowBlur = Math.max(8, displayRadius / 8) * colorIntensity;
          }

          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, displayRadius, 0, Math.PI * 2);
          ctx.strokeStyle = bubble.color;
          ctx.globalAlpha = opacity * colorIntensity;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;

          // Shimmer sparkles effect
          if (bubble.isSpawning && animationStyle === 'shimmer') {
            const progress = bubble.spawnProgress || 0;
            const numSparkles = 8;
            for (let i = 0; i < numSparkles; i++) {
              const angle = (i / numSparkles) * Math.PI * 2;
              const distance = displayRadius * (0.8 + Math.sin(progress * Math.PI * 4 + angle) * 0.3);
              const sparkleX = bubble.x + Math.cos(angle) * distance;
              const sparkleY = bubble.y + Math.sin(angle) * distance;
              const sparkleSize = 2 * progress;

              ctx.beginPath();
              ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, ${opacity * 0.8})`;
              ctx.fill();
            }
          }

          ctx.restore();
        } else {
          // Light theme: flat solid color, no gradients or shadows
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, displayRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, ${opacity})`;
          ctx.fill();
        }

        const isMobile = window.innerWidth < 768;

        if (bubble.isPinned) {
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, displayRadius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#A855F7';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        if (bubble.isComparing) {
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, displayRadius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (isMobile && bubble.isHovered && !bubble.isPinned && !bubble.isComparing) {
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, displayRadius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = theme === 'dark' ? '#FFFFFF' : '#000000';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        if (opacity > 0.1) {
          ctx.globalAlpha = opacity;
          const textBrightness = theme === 'dark' ? (1 - ageRatio * 0.3) : 1;
          const textAlpha = theme === 'dark' ? textBrightness : 1;
          ctx.fillStyle = theme === 'dark' ? `rgba(255, 255, 255, ${textAlpha})` : 'rgba(255, 255, 255, 0.95)';
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

          if (useCryptoColors) {
            ctx.font = `${Math.max(8, displayRadius / 5)}px sans-serif`;
            const volumeAlpha = theme === 'dark' ? 0.9 * textBrightness : 0.9;
            ctx.fillStyle = theme === 'dark' ? `rgba(200, 200, 200, ${volumeAlpha * opacity})` : `rgba(255, 255, 255, ${0.85 * opacity})`;
            const volumeY = startY + displayLines.length * lineHeight + Math.max(4, displayRadius / 10);
            const displayText = getCryptoDisplayText(bubble.topic);
            const cleanVolume = displayText.replace(/"/g, '');
            const gainPercentage = cleanVolume.split('•')[0].trim();
            ctx.fillText(gainPercentage, bubble.x, volumeY);
          } else {
            ctx.font = `${Math.max(8, displayRadius / 5)}px sans-serif`;
            const volumeAlpha = theme === 'dark' ? 0.9 * textBrightness : 0.9;
            ctx.fillStyle = theme === 'dark' ? `rgba(200, 200, 200, ${volumeAlpha * opacity})` : `rgba(255, 255, 255, ${0.85 * opacity})`;
            const volumeY = startY + displayLines.length * lineHeight + Math.max(4, displayRadius / 10);
            const cleanVolume = bubble.topic.searchVolumeRaw.replace(/"/g, '');
            ctx.fillText(cleanVolume, bubble.x, volumeY);
          }
          ctx.globalAlpha = 1;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('touchstart', handleCanvasTouch);
      if (!isTouchDevice) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [topics, maxDisplay, theme, layout, cryptoTimeframe, useCryptoColors, animationStyle]);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ background: 'transparent' }}
      />
      {tooltipData && (
        <BubbleTooltip
          topic={tooltipData.topic}
          x={tooltipData.x}
          y={tooltipData.y}
          theme={theme}
          isPinned={pinnedTopics.has(tooltipData.topic.name)}
          onTogglePin={() => handleTogglePin(tooltipData.topic.name)}
          onCompare={() => handleToggleCompare(tooltipData.topic.name)}
          isComparing={comparingTopics.has(tooltipData.topic.name)}
          onClose={() => setTooltipData(null)}
          cryptoTimeframe={cryptoTimeframe}
        />
      )}
      {showMaxCompareMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <p className="text-sm font-medium">You can compare up to 5 topics at a time</p>
            <button
              onClick={() => setShowMaxCompareMessage(false)}
              className="p-1 hover:bg-orange-600 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
