import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  title?: string;
  includeCharts?: boolean;
  includeTables?: boolean;
  includeMetrics?: boolean;
}

export class PDFExporter {
  private pdf: jsPDF;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
  }

  async addPageTitle(title: string, subtitle?: string) {
    this.pdf.setFontSize(20);
    this.pdf.setTextColor(40, 40, 40);
    this.pdf.text(title, 20, 30);

    if (subtitle) {
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text(subtitle, 20, 45);
    }

    // Add timestamp
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.text(`Generated on ${new Date().toLocaleString()}`, 20, 55);

    return 65; // Return next Y position
  }

  async addMetricsSection(
    metrics: Array<{ label: string; value: string; delta?: string }>,
    startY: number
  ) {
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(40, 40, 40);
    this.pdf.text('Key Metrics', 20, startY);

    let yPos = startY + 15;

    metrics.forEach((metric, index) => {
      // Metric box
      this.pdf.setFillColor(248, 250, 252);
      this.pdf.rect(20, yPos - 5, 170, 20, 'F');

      this.pdf.setFontSize(12);
      this.pdf.setTextColor(40, 40, 40);
      this.pdf.text(metric.label, 25, yPos + 2);

      this.pdf.setFontSize(14);
      this.pdf.setTextColor(59, 130, 246);
      this.pdf.text(metric.value, 25, yPos + 10);

      if (metric.delta) {
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(34, 197, 94);
        this.pdf.text(metric.delta, 140, yPos + 10);
      }

      yPos += 25;
    });

    return yPos + 10;
  }

  async addChartFromElement(
    element: HTMLElement,
    title: string,
    startY: number
  ): Promise<number> {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 170;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if we need a new page
      if (startY + imgHeight > 270) {
        this.pdf.addPage();
        startY = 20;
      }

      // Add chart title
      this.pdf.setFontSize(14);
      this.pdf.setTextColor(40, 40, 40);
      this.pdf.text(title, 20, startY);

      // Add chart image
      this.pdf.addImage(imgData, 'PNG', 20, startY + 5, imgWidth, imgHeight);

      return startY + imgHeight + 15;
    } catch (error) {
      console.error('Error adding chart to PDF:', error);
      return startY;
    }
  }

  async addTableSection(
    title: string,
    headers: string[],
    rows: string[][],
    startY: number
  ): Promise<number> {
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(40, 40, 40);
    this.pdf.text(title, 20, startY);

    let yPos = startY + 10;

    // Table headers
    this.pdf.setFillColor(59, 130, 246);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.rect(20, yPos, 170, 8, 'F');

    headers.forEach((header, index) => {
      const xPos = 25 + index * 50;
      this.pdf.setFontSize(10);
      this.pdf.text(header, xPos, yPos + 5);
    });

    yPos += 8;

    // Table rows
    rows.forEach((row, rowIndex) => {
      const fillColor = rowIndex % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      this.pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      this.pdf.setTextColor(40, 40, 40);
      this.pdf.rect(20, yPos, 170, 8, 'F');

      row.forEach((cell, cellIndex) => {
        const xPos = 25 + cellIndex * 50;
        this.pdf.setFontSize(9);
        this.pdf.text(cell.substring(0, 15), xPos, yPos + 5);
      });

      yPos += 8;
    });

    return yPos + 10;
  }

  async addSummarySection(summary: string[], startY: number): Promise<number> {
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(40, 40, 40);
    this.pdf.text('Summary & Insights', 20, startY);

    let yPos = startY + 15;

    this.pdf.setFontSize(11);
    this.pdf.setTextColor(80, 80, 80);

    summary.forEach((line) => {
      const lines = this.pdf.splitTextToSize(line, 170);
      lines.forEach((splitLine: string) => {
        if (yPos > 270) {
          this.pdf.addPage();
          yPos = 20;
        }
        this.pdf.text(splitLine, 20, yPos);
        yPos += 6;
      });
      yPos += 3;
    });

    return yPos + 10;
  }

  async save(filename: string = 'analytics-report.pdf') {
    this.pdf.save(filename);
  }

  getPDF() {
    return this.pdf;
  }
}

// Utility function to export analytics dashboard
export async function exportAnalyticsToPDF(
  analyticsData: any,
  options: PDFExportOptions = {}
) {
  const exporter = new PDFExporter();

  const {
    filename = 'analytics-report.pdf',
    title = 'Analytics Report',
    includeCharts = true,
    includeTables = true,
    includeMetrics = true,
  } = options;

  let yPos = await exporter.addPageTitle(
    title,
    'Comprehensive Analytics Overview'
  );

  if (includeMetrics && analyticsData) {
    const metrics = [
      {
        label: 'Total Conversations',
        value:
          analyticsData.usage?.conversations?.current?.toLocaleString() || '0',
        delta: analyticsData.weeklyTrend?.conversationsChange || '',
      },
      {
        label: 'API Calls',
        value: analyticsData.usage?.apiCalls?.current?.toLocaleString() || '0',
        delta: analyticsData.weeklyTrend?.apiCallsChange || '',
      },
      {
        label: 'Active Agents',
        value: `${analyticsData.usage?.agents?.current || 0}/${analyticsData.usage?.agents?.limit || 0}`,
      },
      {
        label: 'Messages Sent',
        value: analyticsData.usage?.messages?.current?.toLocaleString() || '0',
        delta: analyticsData.weeklyTrend?.messagesChange || '',
      },
    ];

    yPos = await exporter.addMetricsSection(metrics, yPos);
  }

  if (includeTables && analyticsData?.agentPerformance) {
    const headers = [
      'Agent',
      'Success Rate',
      'Response Time',
      'Total Requests',
    ];
    const rows = analyticsData.agentPerformance
      .slice(0, 10)
      .map((agent: any) => [
        agent.name || `Agent ${agent.agentId}`,
        `${agent.successRate?.toFixed(1)}%` || '0%',
        `${agent.avgResponseTime?.toFixed(0)}ms` || '0ms',
        agent.totalRequests?.toString() || '0',
      ]);

    yPos = await exporter.addTableSection(
      'Agent Performance',
      headers,
      rows,
      yPos
    );
  }

  // Add summary insights
  const summary = [
    'This report provides a comprehensive overview of your AI agent platform usage and performance.',
    `Total conversations: ${analyticsData?.usage?.conversations?.current || 0}`,
    `Average success rate: ${
      analyticsData?.agentPerformance?.length
        ? (
            analyticsData.agentPerformance.reduce(
              (sum: number, agent: any) => sum + (agent.successRate || 0),
              0
            ) / analyticsData.agentPerformance.length
          ).toFixed(1)
        : 0
    }%`,
    'Key insights: Monitor agent performance regularly and optimize based on usage patterns.',
  ];

  yPos = await exporter.addSummarySection(summary, yPos);

  await exporter.save(filename);
}

// Utility function to export any element to PDF
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string = 'export.pdf',
  title?: string
) {
  const exporter = new PDFExporter();

  let yPos = title ? await exporter.addPageTitle(title) : 20;

  yPos = await exporter.addChartFromElement(
    element,
    title || 'Exported Content',
    yPos
  );

  await exporter.save(filename);
}
