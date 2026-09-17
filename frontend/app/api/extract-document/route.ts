/**
 * API Route for Document Text Extraction
 * Extracts text from PDF, DOCX, and other document formats
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Dynamic imports to avoid issues
async function extractPDFText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // pdf-parse handles PDF extraction
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
  };
}

async function extractDOCXText(buffer: Buffer): Promise<{ text: string }> {
  // mammoth handles DOCX extraction
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    const buffer = Buffer.from(await file.arrayBuffer());

    let content = '';
    let pageCount: number | undefined;

    // Handle different file types
    switch (fileType) {
      case 'pdf':
        try {
          const pdfResult = await extractPDFText(buffer);
          content = pdfResult.text;
          pageCount = pdfResult.pageCount;
        } catch (error) {
          console.error('PDF extraction error:', error);
          return NextResponse.json(
            { error: 'Failed to extract PDF text. The file may be encrypted or corrupted.' },
            { status: 400 }
          );
        }
        break;

      case 'docx':
      case 'doc':
        try {
          const docxResult = await extractDOCXText(buffer);
          content = docxResult.text;
        } catch (error) {
          console.error('DOCX extraction error:', error);
          return NextResponse.json(
            { error: 'Failed to extract document text. The file may be corrupted.' },
            { status: 400 }
          );
        }
        break;

      case 'txt':
      case 'md':
      case 'csv':
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
      case 'html':
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'css':
      case 'scss':
      case 'sql':
      case 'sh':
      case 'bash':
      case 'zsh':
        // Plain text files - read directly
        content = buffer.toString('utf-8');
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported file type: ${fileType}` },
          { status: 400 }
        );
    }

    // Clean up content - remove excessive whitespace
    content = content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return NextResponse.json({
      success: true,
      content,
      fileName,
      fileType,
      pageCount,
      characterCount: content.length,
    });

  } catch (error) {
    console.error('Document extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
