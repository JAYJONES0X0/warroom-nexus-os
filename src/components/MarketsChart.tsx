import { useEffect, useRef, useCallback } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type HistogramData, ColorType, CrosshairMode } from 'lightweight-charts';
import { useCandles } from '@/hooks/useCandles';
import { usePriceTick } from '@/hooks/usePriceTick';

interface MarketsChartProps {
  symbol: string;
  timeframe: string;
  selectedTool: string | null;
  onChartReady?: (chart: IChartApi) => void;
}

const TF_MAP: Record<string, number> = {
  '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800,
};

export function MarketsChart({ symbol, timeframe, selectedTool, onChartReady }: MarketsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const { candles, loading } = useCandles(symbol, timeframe);
  const tick = usePriceTick(symbol);

  const initChart = useCallback(() => {
    if (!containerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontFamily: 'monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.12)', width: 1, style: 2, labelBackgroundColor: '#1a1a2e' },
        horzLine: { color: 'rgba(255,255,255,0.12)', width: 1, style: 2, labelBackgroundColor: '#1a1a2e' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.05, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const d = new Date(time * 1000);
          const tfSec = TF_MAP[timeframe] ?? 3600;
          if (tfSec >= 86400) return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
          return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
        },
      },
      handleScroll: { vertTouchDrag: true },
      handleScale: { axisPressedMouseMove: true },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
      priceFormat: { type: 'price', minMove: symbol.includes('JPY') ? 0.001 : symbol === 'XAUUSD' ? 0.01 : 0.00001 },
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      borderColor: 'rgba(255,255,255,0.06)',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    if (onChartReady) onChartReady(chart);
  }, [symbol, timeframe, onChartReady]);

  useEffect(() => {
    initChart();
    const ro = new ResizeObserver(() => {
      chartRef.current?.resize(containerRef.current?.clientWidth ?? 600, containerRef.current?.clientHeight ?? 400);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [initChart]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !candles.length) return;
    const cd: CandlestickData[] = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const vd: HistogramData[] = candles.map(c => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
    }));
    candleSeriesRef.current.setData(cd);
    volumeSeriesRef.current.setData(vd);
  }, [candles]);

  useEffect(() => {
    if (!tick?.price || !candleSeriesRef.current || !candles.length) return;
    const tfSec = TF_MAP[timeframe] ?? 3600;
    const ts = Math.floor(Date.now() / 1000);
    const candleTime = Math.floor(ts / tfSec) * tfSec;
    const last = candles[candles.length - 1];
    if (Math.floor(last.time) === candleTime) {
      candleSeriesRef.current.update({
        time: candleTime as any,
        open: last.open,
        high: Math.max(last.high, tick.price),
        low: Math.min(last.low, tick.price),
        close: tick.price,
      });
    }
  }, [tick, timeframe, candles]);

  if (loading && !candles.length) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-[10px] text-white/20 font-mono animate-pulse">Loading chart data...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full" style={{ cursor: selectedTool ? 'crosshair' : undefined }} />
  );
}
