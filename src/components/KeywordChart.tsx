import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getBrandColor } from './BrandSelector';

interface MonthlyData {
  brand: string;
  month: string;
  total_volume: number;
  keyword_count: number;
  top_keywords: Array<{ keyword: string; volume: number }>;
}

interface KeywordChartProps {
  data: MonthlyData[];
  selectedBrands: string[];
  availableBrands: string[];
}

export default function KeywordChart({ data, selectedBrands, availableBrands }: KeywordChartProps) {
  const trendRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !trendRef.current) return;

    const filteredData = selectedBrands.length > 0
      ? data.filter(d => selectedBrands.includes(d.brand))
      : data;

    if (!filteredData.length) return;

    drawTrendChart(filteredData);
  }, [data, selectedBrands, availableBrands]);


  const drawTrendChart = (chartData: MonthlyData[]) => {
    const svg = d3.select(trendRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const groupedByBrand = d3.group(chartData, d => d.brand);

    const parseDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date() : date;
    };

    const x = d3.scaleTime()
      .domain(d3.extent(chartData, d => parseDate(d.month)) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.total_volume) || 0])
      .nice()
      .range([height, 0]);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6))
      .selectAll('text')
      .style('font-size', '12px');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(d as number / 1000).toFixed(0)}K`))
      .selectAll('text')
      .style('font-size', '12px');

    const line = d3.line<MonthlyData>()
      .x(d => x(parseDate(d.month)))
      .y(d => y(d.total_volume))
      .curve(d3.curveMonotoneX);

    groupedByBrand.forEach((brandData, brand) => {
      const sortedData = brandData.sort((a, b) =>
        parseDate(a.month).getTime() - parseDate(b.month).getTime()
      );

      const brandColor = getBrandColor(brand, availableBrands);

      g.append('path')
        .datum(sortedData)
        .attr('fill', 'none')
        .attr('stroke', brandColor)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      g.selectAll(`.dot-${brand.replace(/\s/g, '-')}`)
        .data(sortedData)
        .enter()
        .append('circle')
        .attr('class', `dot-${brand.replace(/\s/g, '-')}`)
        .attr('cx', d => x(parseDate(d.month)))
        .attr('cy', d => y(d.total_volume))
        .attr('r', 4)
        .attr('fill', brandColor)
        .append('title')
        .text(d => `${brand}\n${d.month}\n${d.total_volume.toLocaleString()} searches`);
    });

    if (groupedByBrand.size > 1) {
      const legend = g.append('g')
        .attr('transform', `translate(${width - 120}, 10)`);

      Array.from(groupedByBrand.keys()).forEach((brand, i) => {
        const brandColor = getBrandColor(brand, availableBrands);
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('circle')
          .attr('cx', 6)
          .attr('cy', 6)
          .attr('r', 5)
          .attr('fill', brandColor);

        legendRow.append('text')
          .attr('x', 18)
          .attr('y', 10)
          .style('font-size', '12px')
          .style('font-weight', '500')
          .text(brand);
      });
    }
  };

  const generateTrendAriaLabel = () => {
    const brandList = selectedBrands.join(', ');
    return `Line chart showing search volume trends over time for ${brandList}`;
  };

  if (!data.length) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No search volume data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <svg
          ref={trendRef}
          className="w-full"
          aria-label={generateTrendAriaLabel()}
          title="Search volume trends over time"
          role="img"
        ></svg>
      </div>

    </div>
  );
}
