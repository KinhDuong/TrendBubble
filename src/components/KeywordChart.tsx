import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface MonthlyData {
  brand: string;
  month: string;
  total_volume: number;
  keyword_count: number;
  top_keywords: Array<{ keyword: string; volume: number }>;
}

interface KeywordChartProps {
  data: MonthlyData[];
  selectedBrand: string | null;
}

export default function KeywordChart({ data, selectedBrand }: KeywordChartProps) {
  const trendRef = useRef<SVGSVGElement>(null);
  const keywordsRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !trendRef.current) return;

    const filteredData = selectedBrand
      ? data.filter(d => d.brand === selectedBrand)
      : data;

    if (!filteredData.length) return;

    drawTrendChart(filteredData);
  }, [data, selectedBrand]);

  useEffect(() => {
    if (!data.length || !keywordsRef.current || !selectedBrand) return;

    const brandData = data.filter(d => d.brand === selectedBrand);
    if (!brandData.length) return;

    const latestMonth = brandData.sort((a, b) =>
      new Date(b.month).getTime() - new Date(a.month).getTime()
    )[0];

    drawKeywordsChart(latestMonth.top_keywords);
  }, [data, selectedBrand]);

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

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

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

      g.append('path')
        .datum(sortedData)
        .attr('fill', 'none')
        .attr('stroke', colorScale(brand))
        .attr('stroke-width', 2)
        .attr('d', line);

      g.selectAll(`.dot-${brand.replace(/\s/g, '-')}`)
        .data(sortedData)
        .enter()
        .append('circle')
        .attr('class', `dot-${brand.replace(/\s/g, '-')}`)
        .attr('cx', d => x(parseDate(d.month)))
        .attr('cy', d => y(d.total_volume))
        .attr('r', 4)
        .attr('fill', colorScale(brand))
        .append('title')
        .text(d => `${brand}\n${d.month}\n${d.total_volume.toLocaleString()} searches`);
    });

    const legend = g.append('g')
      .attr('transform', `translate(${width - 100}, 0)`);

    Array.from(groupedByBrand.keys()).forEach((brand, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', colorScale(brand));

      legendRow.append('text')
        .attr('x', 18)
        .attr('y', 10)
        .style('font-size', '11px')
        .text(brand);
    });
  };

  const drawKeywordsChart = (keywords: Array<{ keyword: string; volume: number }>) => {
    const svg = d3.select(keywordsRef.current);
    svg.selectAll('*').remove();

    if (!keywords.length) return;

    const margin = { top: 20, right: 30, bottom: 100, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(keywords.map(d => d.keyword))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(keywords, d => d.volume) || 0])
      .nice()
      .range([height, 0]);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('font-size', '10px')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(d as number / 1000).toFixed(0)}K`))
      .selectAll('text')
      .style('font-size', '12px');

    g.selectAll('.bar')
      .data(keywords)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.keyword) || 0)
      .attr('y', d => y(d.volume))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.volume))
      .attr('fill', '#3b82f6')
      .append('title')
      .text(d => `${d.keyword}\n${d.volume.toLocaleString()} searches`);
  };

  const generateTrendAriaLabel = () => {
    const brands = Array.from(new Set(data.map(d => d.brand)));
    const brandList = selectedBrand || brands.join(', ');
    return `Line chart showing search volume trends over time for ${brandList}`;
  };

  const generateKeywordsAriaLabel = () => {
    if (!selectedBrand) return '';
    return `Bar chart displaying top keywords by search volume for ${selectedBrand}`;
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Search Volume Trends</h3>
        <svg
          ref={trendRef}
          className="w-full"
          aria-label={generateTrendAriaLabel()}
          title="Search volume trends over time"
          role="img"
        ></svg>
      </div>

      {selectedBrand && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Top Keywords - {selectedBrand}</h3>
          <svg
            ref={keywordsRef}
            className="w-full"
            aria-label={generateKeywordsAriaLabel()}
            title={`Top keywords for ${selectedBrand}`}
            role="img"
          ></svg>
        </div>
      )}
    </div>
  );
}
