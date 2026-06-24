import { useState, useEffect, useRef, useCallback } from 'react';

interface Point { x: number; y: number }

interface BaseDrawing {
  id: string;
  type: 'trendline' | 'horizontal' | 'vertical' | 'fib' | 'rectangle' | 'orderblock' | 'fvg' | 'bos' | 'choch' | 'liquidity';
  color: string;
}

interface TrendLine extends BaseDrawing { type: 'trendline'; start: Point; end: Point }
interface HorizontalLine extends BaseDrawing { type: 'horizontal'; y: number; label?: string }
interface VerticalLine extends BaseDrawing { type: 'vertical'; x: number }
interface FibRetracement extends BaseDrawing { type: 'fib'; start: Point; end: Point }
interface Rectangle extends BaseDrawing { type: 'rectangle'; start: Point; end: Point }
interface OrderBlock extends BaseDrawing { type: 'orderblock'; start: Point; end: Point }
interface FVG extends BaseDrawing { type: 'fvg'; x1: number; x2: number; y1: number; y2: number }
interface BOSMark extends BaseDrawing { type: 'bos'; y: number; label?: string }
interface CHOCHMark extends BaseDrawing { type: 'choch'; y: number; label?: string }
interface LiquidityMark extends BaseDrawing { type: 'liquidity'; y: number; label?: string }

type Drawing = TrendLine | HorizontalLine | VerticalLine | FibRetracement | Rectangle | OrderBlock | FVG | BOSMark | CHOCHMark | LiquidityMark;

const DRAW_STORAGE_KEY = 'warroom.drawings';

function loadDrawings(symbol: string): Drawing[] {
  try {
    const raw = localStorage.getItem(DRAW_STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, Drawing[]>;
    return all[symbol] ?? [];
  } catch { return []; }
}

function saveDrawings(symbol: string, drawings: Drawing[]) {
  try {
    const raw = localStorage.getItem(DRAW_STORAGE_KEY);
    const all: Record<string, Drawing[]> = raw ? JSON.parse(raw) : {};
    all[symbol] = drawings;
    localStorage.setItem(DRAW_STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent */ }
}

const TOOLS: { id: Drawing['type']; label: string; icon: string }[] = [
  { id: 'trendline',   label: 'Trend Line',     icon: '/' },
  { id: 'horizontal',  label: 'Horizontal',     icon: '--' },
  { id: 'vertical',    label: 'Vertical',       icon: '|' },
  { id: 'fib',         label: 'Fib',            icon: 'f' },
  { id: 'rectangle',   label: 'Rectangle',      icon: '[]' },
  { id: 'orderblock',  label: 'Order Block',    icon: 'OB' },
  { id: 'fvg',         label: 'FVG',            icon: 'FG' },
  { id: 'bos',         label: 'BOS',            icon: 'B↓' },
  { id: 'choch',       label: 'CHoCH',          icon: '↶' },
  { id: 'liquidity',   label: 'Liquidity',      icon: 'LQ' },
];

const COLORS = ['#ff4444', '#10b981', '#38bdf8', '#f59e0b', '#a855f7', '#ff8800'];

function distance(a: Point, b: Point) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

interface DrawingToolsProps {
  symbol: string;
  onToolChange: (tool: string | null) => void;
}

export function DrawingTools({ symbol, onToolChange }: DrawingToolsProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>(() => loadDrawings(symbol));
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setDrawings(loadDrawings(symbol));
  }, [symbol]);

  useEffect(() => {
    saveDrawings(symbol, drawings);
  }, [drawings, symbol]);

  useEffect(() => {
    onToolChange(activeTool);
  }, [activeTool, onToolChange]);

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    for (const d of drawings) {
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);

      switch (d.type) {
        case 'trendline':
          ctx.beginPath();
          ctx.moveTo(d.start.x, d.start.y);
          ctx.lineTo(d.end.x, d.end.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(d.start.x, d.start.y, 3, 0, Math.PI * 2);
          ctx.arc(d.end.x, d.end.y, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'horizontal':
          ctx.beginPath();
          ctx.moveTo(0, d.y);
          ctx.lineTo(w, d.y);
          ctx.stroke();
          break;
        case 'vertical':
          ctx.beginPath();
          ctx.moveTo(d.x, 0);
          ctx.lineTo(d.x, h);
          ctx.stroke();
          break;
        case 'fib': {
          const top = Math.min(d.start.y, d.end.y);
          const bot = Math.max(d.start.y, d.end.y);
          const levels = [1, 0.786, 0.618, 0.5, 0.382, 0.236, 0];
          ctx.setLineDash([4, 4]);
          for (const lv of levels) {
            const y = top + (bot - top) * (1 - lv);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.strokeStyle = `${d.color}60`;
            ctx.stroke();
          }
          ctx.setLineDash([]);
          break;
        }
        case 'rectangle':
        case 'orderblock':
          ctx.strokeRect(d.start.x, d.start.y, d.end.x - d.start.x, d.end.y - d.start.y);
          if (d.type === 'orderblock') {
            ctx.fillStyle = `${d.color}15`;
            ctx.fillRect(d.start.x, d.start.y, d.end.x - d.start.x, d.end.y - d.start.y);
            ctx.fillStyle = d.color;
          }
          break;
        case 'fvg':
          ctx.fillStyle = `${d.color}12`;
          ctx.fillRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
          ctx.strokeStyle = d.color;
          ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
          break;
        case 'bos':
        case 'choch':
        case 'liquidity': {
          const markLabel = d.type === 'bos' ? 'BOS' : d.type === 'choch' ? 'CHoCH' : 'LIQ';
          ctx.strokeStyle = d.color;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(0, d.y);
          ctx.lineTo(w, d.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = d.color;
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(markLabel, 6, d.y - 4);
          break;
        }
      }
    }

    if (dragging && start && current && activeTool) {
      ctx.strokeStyle = selectedColor;
      ctx.fillStyle = selectedColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      switch (activeTool) {
        case 'trendline':
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(current.x, current.y);
          ctx.stroke();
          break;
        case 'horizontal':
          ctx.beginPath();
          ctx.moveTo(0, current.y);
          ctx.lineTo(w, current.y);
          ctx.stroke();
          break;
        case 'vertical':
          ctx.beginPath();
          ctx.moveTo(current.x, 0);
          ctx.lineTo(current.x, h);
          ctx.stroke();
          break;
        case 'fib': {
          const top = Math.min(start.y, current.y);
          const bot = Math.max(start.y, current.y);
          const levels = [1, 0.786, 0.618, 0.5, 0.382, 0.236, 0];
          ctx.setLineDash([4, 4]);
          for (const lv of levels) {
            const y = top + (bot - top) * (1 - lv);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.strokeStyle = `${selectedColor}60`;
            ctx.stroke();
          }
          ctx.setLineDash([]);
          break;
        }
        case 'rectangle':
        case 'orderblock':
          ctx.strokeRect(start.x, start.y, current.x - start.x, current.y - start.y);
          if (activeTool === 'orderblock') {
            ctx.fillStyle = `${selectedColor}15`;
            ctx.fillRect(start.x, start.y, current.x - start.x, current.y - start.y);
            ctx.fillStyle = selectedColor;
          }
          break;
        case 'fvg':
          ctx.fillStyle = `${selectedColor}12`;
          ctx.fillRect(start.x || 0, start.y || 0, Math.abs(current.x - start.x), Math.abs(current.y - start.y));
          ctx.strokeStyle = selectedColor;
          ctx.strokeRect(start.x || 0, start.y || 0, Math.abs(current.x - start.x), Math.abs(current.y - start.y));
          break;
        case 'bos':
        case 'choch':
        case 'liquidity': {
          const dl = activeTool === 'bos' ? 'BOS' : activeTool === 'choch' ? 'CHoCH' : 'LIQ';
          ctx.strokeStyle = selectedColor;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(0, current.y);
          ctx.lineTo(w, current.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = selectedColor;
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(dl, 6, current.y - 4);
          break;
        }
      }
    }
  }, [drawings, dragging, start, current, activeTool, selectedColor]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool) return;
    setDragging(true);
    setStart(getPos(e));
    setCurrent(getPos(e));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !start) return;
    setCurrent(getPos(e));
  };

  const handleMouseUp = () => {
    if (!dragging || !start || !current || !activeTool) {
      setDragging(false);
      setStart(null);
      setCurrent(null);
      return;
    }
    const dist = distance(start, current);
    if (dist < 5) {
      setDragging(false);
      setStart(null);
      setCurrent(null);
      return;
    }

    const id = `${activeTool}-${Date.now()}`;
    let drawing: Drawing;
    switch (activeTool) {
      case 'trendline':
        drawing = { id, type: 'trendline', start, end: current, color: selectedColor };
        break;
      case 'horizontal':
        drawing = { id, type: 'horizontal', y: current.y, color: selectedColor };
        break;
      case 'vertical':
        drawing = { id, type: 'vertical', x: current.x, color: selectedColor };
        break;
      case 'fib':
        drawing = { id, type: 'fib', start, end: current, color: selectedColor };
        break;
      case 'rectangle':
      case 'orderblock':
        drawing = { id, type: activeTool, start: { x: Math.min(start.x, current.x), y: Math.min(start.y, current.y) }, end: { x: Math.max(start.x, current.x), y: Math.max(start.y, current.y) }, color: selectedColor };
        break;
      case 'fvg':
        drawing = { id, type: 'fvg', x1: Math.min(start.x, current.x), x2: Math.max(start.x, current.x), y1: Math.min(start.y, current.y), y2: Math.max(start.y, current.y), color: selectedColor };
        break;
      case 'bos':
        drawing = { id, type: 'bos', y: current.y, color: selectedColor };
        break;
      case 'choch':
        drawing = { id, type: 'choch', y: current.y, color: selectedColor };
        break;
      case 'liquidity':
        drawing = { id, type: 'liquidity', y: current.y, color: selectedColor };
        break;
      default:
        setDragging(false);
        setStart(null);
        setCurrent(null);
        return;
    }

    setDrawings(prev => [...prev, drawing]);
    setDragging(false);
    setStart(null);
    setCurrent(null);
  };

  const clearAll = () => {
    setDrawings([]);
    saveDrawings(symbol, []);
  };

  const undo = () => {
    setDrawings(prev => prev.slice(0, -1));
  };

  return (
    <div className="absolute inset-0 z-10" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1 px-2 py-1.5 bg-black/60 border-b border-white/[0.05]">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setActiveTool(activeTool === t.id ? null : t.id)}
            className="w-7 h-7 flex items-center justify-center rounded text-[10px] font-bold transition-all"
            style={{
              background: activeTool === t.id ? 'rgba(212,138,60,0.2)' : 'transparent',
              color: activeTool === t.id ? '#D48A3C' : 'rgba(255,255,255,0.4)',
              border: activeTool === t.id ? '1px solid rgba(212,138,60,0.3)' : '1px solid transparent',
            }}
            title={t.label}>
            {t.icon}
          </button>
        ))}
        <div className="w-px h-5 mx-1 bg-white/[0.08]" />
        {COLORS.map(c => (
          <button key={c} onClick={() => setSelectedColor(c)}
            className="w-4 h-4 rounded-full border transition-all"
            style={{
              background: c,
              borderColor: selectedColor === c ? 'white' : 'transparent',
              boxShadow: selectedColor === c ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
            }} />
        ))}
        <div className="flex-1" />
        <button onClick={undo} className="text-[9px] text-white/30 hover:text-white/60 px-1">U</button>
        <button onClick={clearAll} className="text-[9px] text-red-400/50 hover:text-red-400 px-1">X</button>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{
          top: 32, left: 0, right: 0, bottom: 0,
          width: '100%', height: 'calc(100% - 32px)',
          cursor: activeTool ? 'crosshair' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
