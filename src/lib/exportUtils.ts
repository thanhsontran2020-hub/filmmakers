import { Document, Packer, Paragraph, TextRun, AlignmentType, Table as DocxTable, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import type { ScriptBlock, Shot } from '../components/EditorContext';

/**
 * HELPER: PARSE SIMPLE HTML TO docx TextRuns
 */
const parseHtmlToTextRuns = (html: string, options: { bold?: boolean, italics?: boolean, size?: number } = {}) => {
  const runs: TextRun[] = [];
  
  // Create a temporary DOM element to parse HTML
  // In a node environment or if window isn't available, you'd use a regex or parser
  // But here we're in a browser app
  const div = document.createElement('div');
  div.innerHTML = html;

  const traverse = (node: Node, parentBold: boolean, parentItalic: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        runs.push(new TextRun({
          text: node.textContent,
          bold: parentBold || options.bold,
          italics: parentItalic || options.italics,
          size: options.size,
        }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const isBold = parentBold || tag === 'b' || tag === 'strong';
      const isItalic = parentItalic || tag === 'i' || tag === 'em';
      
      el.childNodes.forEach(child => traverse(child, isBold, isItalic));
    }
  };

  div.childNodes.forEach(node => traverse(node, false, false));
  
  // If empty, add a blank run
  if (runs.length === 0) {
    runs.push(new TextRun({ text: "", ...options }));
  }

  return runs;
};

/**
 * GENERATE SCRIPT DOCUMENT OBJECT
 */
export const generateScriptDocument = (projectName: string, author: string, blocks: ScriptBlock[]) => {
  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Courier New",
            size: 24, // 12pt
          },
          paragraph: {
            spacing: {
              line: 276, // 1.15 line spacing for better readability
              lineRule: 'auto',
            },
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1.0"
            right: 1440,  // 1.0"
            bottom: 1440, // 1.0"
            left: 2160,   // 1.5" (Gutter for binding)
          },
        },
      },
      children: [
        // Title Page - Positioned to look professional (Centered title, footer author)
        new Paragraph({
          children: [new TextRun({ text: projectName.toUpperCase(), bold: true, size: 72 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 3600 }, // Position title roughly in the upper-middle
        }),
        new Paragraph({
          children: [new TextRun({ text: "viết bởi", size: 20, italics: true, color: "666666" })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 5000 }, // Push towards the bottom
        }),
        new Paragraph({
          children: [new TextRun({ text: author.toUpperCase(), bold: true, size: 28 })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 120 },
        }),

        // Script Content
        ...blocks.flatMap((block, index) => {
          let leftIndent = 0;
          let rightIndent = 0;
          let alignment: any = AlignmentType.LEFT;
          let spacingBefore = 0;
          let spacingAfter = 360; // 18pt after for action blocks

          if (block.type === 'scene') {
            spacingBefore = 480; // 24pt before
            spacingAfter = 240;  // 12pt after
          } else if (block.type === 'character') {
            spacingBefore = 240; // 12pt before
            spacingAfter = 0;
            leftIndent = 3168;   // 2.2" indent
          } else if (block.type === 'parenthetical') {
            spacingBefore = 0;
            spacingAfter = 0;
            leftIndent = 2304;   // 1.6" indent
            rightIndent = 2880;  // 2.0" from right margin
          } else if (block.type === 'dialogue') {
            spacingBefore = 0;
            spacingAfter = 360;  // 18pt after for extra breathing room
            leftIndent = 1440;   // 1.0" indent
            rightIndent = 2160;  // 1.5" from right margin
          } else if (block.type === 'transition') {
            spacingBefore = 480;
            spacingAfter = 480;
            alignment = AlignmentType.RIGHT;
          }

          return new Paragraph({
            children: parseHtmlToTextRuns(block.content, {
              bold: block.type === 'scene' || block.type === 'character',
              italics: block.type === 'parenthetical',
            }),
            alignment,
            indent: { start: leftIndent, end: rightIndent },
            spacing: { before: spacingBefore, after: spacingAfter },
            pageBreakBefore: index === 0, // Force TITLE PAGE to be its own page
          });
        }),
      ],
    }],
  });
};

/**
 * EXPORT SCRIPT TO DOCX
 */
export const exportScriptToDocx = async (projectName: string, author: string, blocks: ScriptBlock[]) => {
  const doc = generateScriptDocument(projectName, author, blocks);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${projectName}_${author}.docx`);
};

/**
 * EXPORT SHOTLIST TO DOCX (DIRECTOR OR DP)
 */
export const exportShotlistToDocx = async (projectName: string, author: string, shotlist: Shot[], view: 'director' | 'dp') => {
  const isDir = view === 'director';

  // Define columns and labels matching the app UI
  const columns = isDir
    ? ['scene', 'shot', 'location', 'dayNight', 'actors', 'fov', 'duration', 'content', 'actorAction', 'scriptNotes']
    : ['scene', 'shot', 'lens', 'framerate', 'roll', 'size', 'movement', 'angle', 'memoryCard', 'techNotes'];

  const labels: Record<string, string> = {
    scene: 'Scene', shot: 'Shot', location: 'Địa điểm', dayNight: 'I/E',
    actors: 'Diễn viên', fov: 'FOV', duration: 'T.Lượng', content: 'Nội dung',
    actorAction: 'Diễn xuất', scriptNotes: 'Thư ký',    lens: 'Lens (mm)',
    framerate: 'FPS', roll: 'Roll', size: 'Size', movement: 'Move',
    angle: 'Angle', memoryCard: 'Card', techNotes: 'Tech Note'
  };

  // Proportional widths to match UI behavior (total roughly 100%)
  const dirWidths: Record<string, number> = {
    scene: 5, shot: 5, location: 12, dayNight: 5, actors: 10,
    fov: 8, duration: 6, content: 20, actorAction: 18, scriptNotes: 11
  };
  const dpWidths: Record<string, number> = {
    scene: 5, shot: 5, lens: 10, framerate: 6,
    size: 16, movement: 9, angle: 14, memoryCard: 5, techNotes: 30
  };
  const widths = isDir ? dirWidths : dpWidths;

  const table = new DocxTable({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header Row
      new TableRow({
        children: columns.map(col => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: labels[col], bold: true, size: 16 })],
            alignment: AlignmentType.CENTER
          })],
          shading: { fill: "F1F5F9" },
          verticalAlign: "center" as any,
          width: { size: widths[col], type: WidthType.PERCENTAGE }
        })),
        tableHeader: true,
      }),
      // Data Rows
      ...shotlist.map(shot => new TableRow({
        children: columns.map(col => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: (shot[col as keyof Shot] || '').toString(), size: 16 })],
            spacing: { before: 80, after: 80 },
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: "center" as any,
          width: { size: widths[col], type: WidthType.PERCENTAGE }
        })),
      }))
    ],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: { size: { width: "11in", height: "8.5in", orientation: "landscape" } },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: `SHOTLIST - ${isDir ? 'ĐẠO DIỄN' : 'QUAY PHIM'}`, bold: true, size: 36 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Project: ${projectName} | Director: ${author} | Date: ${new Date().toLocaleDateString()}`, size: 20 })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 240 },
        }),
        table
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const suffix = isDir ? 'Director' : 'DP';
  saveAs(blob, `${projectName}_${author}_Shotlist_${suffix}.docx`);
};

import ExcelJS from 'exceljs';

/**
 * EXPORT SHOTLIST TO EXCEL (2 TABS) - Using ExcelJS for perfect styling
 */
export const exportShotlistToExcel = async (projectName: string, author: string, date: string, shotlist: Shot[]) => {
  const workbook = new ExcelJS.Workbook();

  const labels: Record<string, string> = {
    scene: 'Scene #', shot: 'Shot #', location: 'Địa điểm', dayNight: 'I/E',
    actors: 'Diễn viên', fov: 'FOV', duration: 'Thời lượng', content: 'Nội dung',
    actorAction: 'Diễn xuất', scriptNotes: 'Thư ký', lens: 'Tiêu cự',
    framerate: 'FPS', memoryCard: 'Card', techNotes: 'Tech Note',
    size: 'Cỡ cảnh', movement: 'Chuyển động', angle: 'Góc máy'
  };

  const addSheet = (cols: string[], title: string) => {
    const sheet = workbook.addWorksheet(title.slice(0, 31));

    // 1. Column Widths & Basic Styling
    sheet.columns = cols.map(col => {
      let width = 20;
      if (['scene', 'shot', 'dayNight', 'framerate', 'duration'].includes(col)) width = 12;
      if (col === 'memoryCard') width = 8;
      if (['content', 'actorAction', 'techNotes', 'scriptNotes'].includes(col)) width = 65;
      if (['location', 'actors'].includes(col)) width = 35;
      if (col === 'size') width = 25;
      if (col === 'movement') width = 15;
      
      return { header: labels[col], key: col, width };
    });

    // 2. Header Rows (Simplified 5-row structure)
    // Row 1: Title
    const titleRow = sheet.getRow(1);
    titleRow.getCell(1).value = title.toUpperCase();
    sheet.mergeCells(1, 1, 1, cols.length);
    titleRow.height = 40;
    titleRow.font = { size: 18, bold: true };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Row 3: Project Info
    sheet.getRow(3).values = ['Production Title:', projectName, '', '', '', '', 'Date:', date || new Date().toLocaleDateString()];
    sheet.mergeCells(3, 2, 3, 6);
    sheet.mergeCells(3, 8, 3, 9);
    
    // Row 4: Director
    sheet.getRow(4).values = ['Director:', author, '', '', '', '', '', ''];
    sheet.mergeCells(4, 2, 4, 6);

    // Styling for Info Rows (3-4)
    [3, 4].forEach(rowIdx => {
      const row = sheet.getRow(rowIdx);
      row.height = 25;
      row.font = { size: 12 };
      row.alignment = { vertical: 'middle' };
      row.getCell(1).font = { bold: true };
      row.getCell(7).font = { bold: true };
    });

    // Row 6: Table Headers
    const headerRow = sheet.getRow(6);
    headerRow.values = cols.map(col => labels[col]);
    headerRow.height = 30;
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, 
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // 3. Add Data Rows
    shotlist.forEach((shot) => {
      const rowData = cols.reduce((acc, col) => ({ ...acc, [col]: shot[col as keyof Shot] || '' }), {});
      const row = sheet.addRow(rowData);
      
      row.height = 40; // Default height
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, 
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Special height adjustment for long text
      let maxLines = 1;
      cols.forEach(col => {
        const text = (shot[col as keyof Shot] || '').toString();
        const width = sheet.getColumn(col).width || 20;
        const lines = Math.ceil(text.length / (width * 0.8));
        if (lines > maxLines) maxLines = lines;
      });
      if (maxLines > 1) row.height = maxLines * 16 + 10;
    });
  };

  // Director Tab
  const dirCols = ['scene', 'shot', 'location', 'dayNight', 'actors', 'fov', 'duration', 'content', 'actorAction', 'scriptNotes'];
  addSheet(dirCols, "Director's Shot List");

  // DP Tab
  const dpCols = ['scene', 'shot', 'lens', 'framerate', 'size', 'movement', 'angle', 'memoryCard', 'techNotes'];
  addSheet(dpCols, "Camera Shot List");

  // Export File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${projectName}_Shotlist.xlsx`);
};

/**
 * GENERATE SHOTLIST EXCEL BLOB (FOR DRIVE SYNC)
 */
export const generateShotlistExcelBlob = async (shotlist: Shot[]): Promise<Blob> => {
  const workbook = new ExcelJS.Workbook();

  const labels: Record<string, string> = {
    scene: 'Scene #', shot: 'Shot #', location: 'Địa điểm', dayNight: 'I/E',
    actors: 'Diễn viên', fov: 'FOV', duration: 'Thời lượng', content: 'Nội dung',
    actorAction: 'Diễn xuất', scriptNotes: 'Thư ký', lens: 'Tiêu cự',
    framerate: 'FPS', memoryCard: 'Card', techNotes: 'Tech Note',
    size: 'Cỡ cảnh', movement: 'Chuyển động', angle: 'Góc máy'
  };

  const addSheet = (cols: string[], title: string) => {
    const sheet = workbook.addWorksheet(title.slice(0, 31));
    sheet.columns = cols.map(col => ({ header: labels[col], key: col, width: 25 }));
    
    // Add simple headers for sync version
    sheet.getRow(1).values = [title.toUpperCase()];
    sheet.mergeCells(1, 1, 1, cols.length);
    sheet.getRow(3).values = cols.map(col => labels[col]);
    
    shotlist.forEach(shot => {
      const rowData = cols.reduce((acc, col) => ({ ...acc, [col]: shot[col as keyof Shot] || '' }), {});
      const row = sheet.addRow(rowData);
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
  };

  const dirCols = ['scene', 'shot', 'location', 'dayNight', 'actors', 'fov', 'duration', 'content', 'actorAction', 'scriptNotes'];
  addSheet(dirCols, "Director's Shot List");

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
