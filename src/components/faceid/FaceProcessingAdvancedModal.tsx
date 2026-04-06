import React, { useEffect, useMemo, useRef, useState } from 'react';
import Delaunator from 'delaunator';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type Landmark = { x: number; y: number; z?: number };
type ScanPhase = 'idle' | 'points' | 'mesh' | 'done';

type FaceProcessingAdvancedModalProps = {
  open: boolean;
  imageSrc: string | null;
  progress: number;
  landmarks?: Landmark[] | null;
  enablePostScan3D?: boolean;
  title?: string;
  description?: string;
  details?: React.ReactNode;
  showProgress?: boolean;
  onOpenChange: (open: boolean) => void;
};

const connections = [
  [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
  [33, 160, 158, 133, 153, 144, 33],
  [362, 385, 387, 263, 373, 380, 362],
  [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308],
  [70, 63, 105, 66, 107],
  [336, 296, 334, 293, 300],
] as const;

const fallbackPoints = (): Landmark[] =>
  Array.from({ length: 468 }, (_, i) => {
    const angle = (i / 468) * Math.PI * 2;
    const radius = 0.25 + (i % 13) * 0.012;
    return {
      x: 0.5 + Math.cos(angle) * radius * 0.55,
      y: 0.5 + Math.sin(angle) * radius * 0.68,
      z: Math.sin(angle * 3) * 0.04,
    };
  });

const loadMediaPipe = async () => {
  const importFromUrl = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
  return importFromUrl('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/vision_bundle.mjs');
};

const landmarkCache = new Map<string, Landmark[]>();

const buildDenseMesh = (points: Landmark[]) => {
  const edges = new Set<string>();
  const triangles = Delaunator.from(points, (p) => p.x, (p) => p.y).triangles;

  const addEdge = (a: number, b: number) => {
    const i = Math.min(a, b);
    const j = Math.max(a, b);
    if (i === j) return;
    edges.add(`${i}-${j}`);
  };

  connections.forEach((group) => {
    for (let i = 0; i < group.length - 1; i++) addEdge(group[i], group[i + 1]);
  });

  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i];
    const b = triangles[i + 1];
    const c = triangles[i + 2];
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  return Array.from(edges).map((edge) => edge.split('-').map(Number) as [number, number]);
};

const cssHslToHsla = (token: string, alpha: number) => {
  const [h, s, l] = token
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => parseFloat(part.replace('%', '')));

  if ([h, s, l].some((value) => Number.isNaN(value))) {
    return `rgba(255,255,255,${alpha})`;
  }

  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
};

const getPhaseFromProgress = (progress: number): { phase: ScanPhase; ratio: number } => {
  const normalized = Math.max(0, Math.min(progress / 100, 1));

  if (normalized <= 0.5) {
    return { phase: 'points', ratio: normalized / 0.5 };
  }

  if (normalized < 1) {
    return { phase: 'mesh', ratio: (normalized - 0.5) / 0.5 };
  }

  return { phase: 'done', ratio: 1 };
};

const getContainedImageBounds = (
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
) => {
  if (!naturalWidth || !naturalHeight) {
    return { x: 0, y: 0, width: containerWidth, height: containerHeight };
  }

  const containerRatio = containerWidth / containerHeight;
  const imageRatio = naturalWidth / naturalHeight;

  if (imageRatio > containerRatio) {
    const width = containerWidth;
    const height = width / imageRatio;
    return { x: 0, y: (containerHeight - height) / 2, width, height };
  }

  const height = containerHeight;
  const width = height * imageRatio;
  return { x: (containerWidth - width) / 2, y: 0, width, height };
};

const FaceProcessingAdvancedModal = ({
  open,
  imageSrc,
  progress,
  landmarks: providedLandmarks,
  enablePostScan3D = false,
  title = 'Verificação facial em andamento',
  description = 'Mapeando landmarks faciais e refinando malha biométrica em tempo real.',
  details,
  showProgress = true,
  onOpenChange,
}: FaceProcessingAdvancedModalProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [meshEdges, setMeshEdges] = useState<[number, number][]>([]);
  const [foregroundToken, setForegroundToken] = useState('0 0% 100%');
  const [isPreparingAnimation, setIsPreparingAnimation] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setForegroundToken(styles.getPropertyValue('--foreground').trim() || '0 0% 100%');
  }, []);

  useEffect(() => {
    if (!open) {
      setViewMode('2d');
    }
  }, [open, imageSrc]);

  useEffect(() => {
    if (enablePostScan3D && progress >= 100 && landmarks.length > 0) {
      setViewMode('3d');
    }
  }, [enablePostScan3D, progress, landmarks.length]);

  useEffect(() => {
    let cancelled = false;

    const detect = async () => {
      if (!open || !imageSrc) {
        setIsPreparingAnimation(false);
        return;
      }

      setIsPreparingAnimation(true);

      if (providedLandmarks && providedLandmarks.length > 0) {
        if (cancelled) return;
        setLandmarks(providedLandmarks);
        setMeshEdges(buildDenseMesh(providedLandmarks));
        setIsPreparingAnimation(false);
        return;
      }

      const cached = landmarkCache.get(imageSrc);
      if (cached && cached.length > 0) {
        if (cancelled) return;
        setLandmarks(cached);
        setMeshEdges(buildDenseMesh(cached));
        setIsPreparingAnimation(false);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      let points = fallbackPoints();

      try {
        const { FaceLandmarker, FilesetResolver } = await loadMediaPipe();
        const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm');
        const detector = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          numFaces: 1,
        });
        const result = detector.detect(img);
        const found = result.faceLandmarks?.[0] as Landmark[] | undefined;
        if (found && found.length > 100) points = found;
      } catch {
        points = fallbackPoints();
      }

      landmarkCache.set(imageSrc, points);
      if (cancelled) return;
      setLandmarks(points);
      setMeshEdges(buildDenseMesh(points));
      setIsPreparingAnimation(false);
    };

    detect();

    return () => {
      cancelled = true;
    };
  }, [open, imageSrc, providedLandmarks]);

  const pointOrder = useMemo(() => {
    if (landmarks.length === 0) return [] as Array<{ i: number; y: number; centerDistance: number }>;

    let minX = 1;
    let maxX = 0;
    for (let i = 0; i < landmarks.length; i++) {
      const x = landmarks[i].x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    const centerX = (minX + maxX) * 0.5;

    return landmarks
      .map((p, i) => ({ i, y: p.y, centerDistance: Math.abs(p.x - centerX) }))
      .sort((a, b) => (a.y !== b.y ? a.y - b.y : a.centerDistance - b.centerDistance));
  }, [landmarks]);

  useEffect(() => {
    if (!open || isPreparingAnimation || !canvasRef.current || !imageRef.current || landmarks.length === 0) return;

    const canvas = canvasRef.current;
    const image = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = image.clientWidth || 1;
    const height = image.clientHeight || 1;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const imageBounds = getContainedImageBounds(
      width,
      height,
      image.naturalWidth || width,
      image.naturalHeight || height,
    );

    const toCanvasPoint = (point: Landmark) => ({
      x: imageBounds.x + point.x * imageBounds.width,
      y: imageBounds.y + point.y * imageBounds.height,
    });

    const { phase, ratio } = getPhaseFromProgress(progress);
    const pointsVisibleCount = phase === 'points' ? Math.floor(landmarks.length * ratio) : landmarks.length;
    const visiblePoints = new Uint8Array(landmarks.length);
    for (let i = 0; i < pointsVisibleCount; i++) {
      const item = pointOrder[i];
      if (!item) continue;
      visiblePoints[item.i] = 1;
    }

    const meshVisibleCount = phase === 'mesh' ? Math.floor(meshEdges.length * ratio) : phase === 'done' ? meshEdges.length : 0;
    const revealScanY = imageBounds.y + ratio * imageBounds.height;
    const scanLineProgressLoop =
      phase === 'points' || phase === 'mesh'
        ? ratio <= 0.5
          ? ratio * 2
          : (1 - ratio) * 2
        : 1;
    const scanY = imageBounds.y + scanLineProgressLoop * imageBounds.height;

    for (let i = 0; i < landmarks.length; i++) {
      if (!visiblePoints[i]) continue;
      const p = landmarks[i];
      const { x, y } = toCanvasPoint(p);
      if (phase === 'points' && y > revealScanY + 10) continue;

      const pulseBoost = phase === 'points' ? Math.max(0, 1 - Math.abs((y - scanY) / 24)) : 0;
      const pointRadius = 0.85 + pulseBoost * 0.85;

      ctx.beginPath();
      ctx.fillStyle = cssHslToHsla(foregroundToken, phase === 'done' ? 0.98 : 0.9);
      ctx.shadowBlur = 0;
      ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (meshVisibleCount > 0) {
      ctx.strokeStyle = cssHslToHsla(foregroundToken, 0.6);
      ctx.lineWidth = 0.45;

      for (let i = 0; i < meshVisibleCount; i++) {
        const [a, b] = meshEdges[i];
        if (!visiblePoints[a] || !visiblePoints[b]) continue;
        const pa = landmarks[a];
        const pb = landmarks[b];
        const cpa = toCanvasPoint(pa);
        const cpb = toCanvasPoint(pb);
        const yA = cpa.y;
        const yB = cpb.y;
        if ((phase === 'points' || phase === 'mesh') && (yA > revealScanY + 10 || yB > revealScanY + 10)) continue;

        ctx.beginPath();
        ctx.moveTo(cpa.x, yA);
        ctx.lineTo(cpb.x, yB);
        ctx.stroke();
      }

      for (let g = 0; g < connections.length; g++) {
        const group = connections[g];
        for (let i = 0; i < group.length - 1; i++) {
          const a = group[i];
          const b = group[i + 1];
          if (!visiblePoints[a] || !visiblePoints[b]) continue;
          const pa = landmarks[a];
          const pb = landmarks[b];
          const cpa = toCanvasPoint(pa);
          const cpb = toCanvasPoint(pb);
          const yA = cpa.y;
          const yB = cpb.y;
          if ((phase === 'points' || phase === 'mesh') && (yA > revealScanY + 10 || yB > revealScanY + 10)) continue;

          ctx.beginPath();
          ctx.moveTo(cpa.x, yA);
          ctx.lineTo(cpb.x, yB);
          ctx.stroke();
        }
      }

      if (phase === 'mesh' || phase === 'done') {
        ctx.fillStyle = cssHslToHsla(foregroundToken, 0.5);
        for (let i = 0; i < landmarks.length; i++) {
          if (!visiblePoints[i]) continue;
          const cp = landmarks[i];
          const cpoint = toCanvasPoint(cp);
          ctx.beginPath();
          ctx.arc(cpoint.x, cpoint.y, 0.72, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (phase === 'points' || phase === 'mesh') {
      ctx.strokeStyle = cssHslToHsla(foregroundToken, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(imageBounds.x, scanY);
      ctx.lineTo(imageBounds.x + imageBounds.width, scanY);
      ctx.stroke();
    }
  }, [open, landmarks, meshEdges, pointOrder, progress, foregroundToken, isPreparingAnimation]);

  useEffect(() => {
    if (!open || viewMode !== '3d' || !canvas3dRef.current || landmarks.length === 0) return;

    const canvas = canvas3dRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = landmarks.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + (p.z ?? 0) }),
      { x: 0, y: 0, z: 0 }
    );

    center.x /= landmarks.length;
    center.y /= landmarks.length;
    center.z /= landmarks.length;

    const maxRadius = Math.max(
      0.001,
      ...landmarks.map((p) =>
        Math.sqrt(
          (p.x - center.x) * (p.x - center.x) +
            (p.y - center.y) * (p.y - center.y) +
            ((p.z ?? 0) - center.z) * ((p.z ?? 0) - center.z)
        )
      )
    );

    let raf = 0;
    let angle = 0;

    const draw = () => {
      if (!canvas.parentElement) return;
      const width = canvas.parentElement.clientWidth || 1;
      const height = canvas.parentElement.clientHeight || 1;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const cx = width * 0.5;
      const cy = height * 0.52;
      const scale = Math.min(width, height) * 0.36;

      ctx.clearRect(0, 0, width, height);

      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);
      const tilt = 0.22;
      const cosX = Math.cos(tilt);
      const sinX = Math.sin(tilt);

      const projected = landmarks.map((p) => {
        const nx = (p.x - center.x) / maxRadius;
        const ny = (p.y - center.y) / maxRadius;
        const nz = ((p.z ?? 0) - center.z) / maxRadius;

        const ryX = nx * cosY - nz * sinY;
        const ryZ = nx * sinY + nz * cosY;

        const rxY = ny * cosX - ryZ * sinX;
        const rxZ = ny * sinX + ryZ * cosX;

        const perspective = 1 / (1 + (rxZ + 1.2) * 0.45);

        return {
          x: cx + ryX * scale * perspective,
          y: cy + rxY * scale * perspective,
          z: rxZ,
          perspective,
        };
      });

      ctx.lineWidth = 0.55;
      for (let i = 0; i < meshEdges.length; i++) {
        const [a, b] = meshEdges[i];
        const pa = projected[a];
        const pb = projected[b];
        if (!pa || !pb) continue;
        const alpha = 0.18 + Math.max(pa.perspective, pb.perspective) * 0.45;
        ctx.strokeStyle = cssHslToHsla(foregroundToken, alpha);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const alpha = 0.45 + p.perspective * 0.45;
        ctx.fillStyle = cssHslToHsla(foregroundToken, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.7 + p.perspective * 1.45, 0, Math.PI * 2);
        ctx.fill();
      }

      angle += 0.015;
      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [open, viewMode, landmarks, meshEdges, foregroundToken]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-md border bg-muted/20">
            {imageSrc ? (
              <>
                {isPreparingAnimation ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground sm:h-80">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Preparando animação biométrica...</span>
                  </div>
                ) : (
                  <>
                    {viewMode === '3d' ? (
                      <div className="relative h-64 w-full bg-background/60 sm:h-80">
                        <canvas ref={canvas3dRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                      </div>
                    ) : (
                      <>
                        <img
                          ref={imageRef}
                          src={imageSrc}
                          alt="Face enviada para validação"
                          className="h-64 w-full object-contain bg-background/60 sm:h-80"
                          loading="lazy"
                        />
                        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Aguardando imagem</div>
            )}
        </div>

        {enablePostScan3D && progress >= 100 && landmarks.length > 0 ? (
          <div className="flex items-center justify-end gap-2">
            <Button variant={viewMode === '2d' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('2d')}>
              Visualização 2D
            </Button>
            <Button variant={viewMode === '3d' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('3d')}>
              Visualização 3D
            </Button>
          </div>
        ) : null}

        {showProgress ? (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">Reconstrução facial profissional • {Math.round(progress)}%</p>
          </div>
        ) : null}

        {details ? <div className="rounded-md border bg-muted/20 p-3 text-sm">{details}</div> : null}
      </DialogContent>
    </Dialog>
  );
};

export default FaceProcessingAdvancedModal;