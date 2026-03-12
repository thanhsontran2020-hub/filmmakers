import { Document, Packer, Paragraph, TextRun, AlignmentType, Table as DocxTable, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import type { ScriptBlock, Shot } from '../components/EditorContext';

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
        // Title Page
        new Paragraph({
          children: [new TextRun({ text: projectName.toUpperCase(), bold: true, size: 72 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 2400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "viết bởi", size: 24, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 480 },
        }),
        new Paragraph({
          children: [new TextRun({ text: author.toUpperCase(), bold: true, size: 36 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 240 },
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
            children: [new TextRun({
              text: block.content,
              bold: block.type === 'scene' || block.type === 'character',
            })],
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

  // Define columns based on view
  const columns = isDir
    ? ['scene', 'shot', 'dayNight', 'location', 'content', 'actorAction', 'sceneNotes', 'scriptNotes']
    : ['scene', 'shot', 'dayNight', 'memoryCard', 'size', 'movement', 'lens', 'angle', 'techNotes'];

  const labels: Record<string, string> = {
    scene: 'Scene', shot: 'Shot', dayNight: 'I/E', location: 'Địa điểm',
    content: 'Nội dung', actorAction: 'Diễn xuất', sceneNotes: 'Ghi chú ĐD',
    scriptNotes: 'Thư ký', memoryCard: 'Card', size: 'Shot Size',
    movement: 'Move', lens: 'Lens', angle: 'Angle', techNotes: 'Tech Note'
  };

  const table = new DocxTable({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header Row
      new TableRow({
        children: columns.map(col => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: labels[col], bold: true, size: 18 })],
            alignment: AlignmentType.CENTER
          })],
          shading: { fill: "F1F5F9" },
        })),
        tableHeader: true,
      }),
      // Data Rows
      ...shotlist.map(shot => new TableRow({
        children: columns.map(col => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: (shot[col as keyof Shot] || '').toString(), size: 18 })],
            spacing: { before: 120, after: 120 },
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: "center" as any
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
          children: [new TextRun({ text: `Project: ${projectName} | Director: ${author}`, size: 20 })],
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

/**
 * EXPORT SHOTLIST TO EXCEL (2 TABS)
 */
export const exportShotlistToExcel = (projectName: string, author: string, shotlist: Shot[]) => {
  const wb = XLSX.utils.book_new();
  console.log(`Exporting for ${author}`); // Use author

  // Helper to format data for sheets
  const formatData = (cols: string[], labels: Record<string, string>) => {
    const data = shotlist.map(shot => {
      const row: any = {};
      cols.forEach(col => {
        row[labels[col]] = shot[col as keyof Shot];
      });
      return row;
    });
    return data;
  };

  // Director Tab
  const dirCols = ['scene', 'shot', 'dayNight', 'location', 'content', 'actorAction', 'sceneNotes', 'scriptNotes'];
  const dirLabels: Record<string, string> = {
    scene: 'Scene', shot: 'Shot', dayNight: 'I/E', location: 'Địa điểm',
    content: 'Nội dung', actorAction: 'Diễn xuất', sceneNotes: 'Ghi chú ĐD', scriptNotes: 'Thư ký'
  };
  const wsDir = XLSX.utils.json_to_sheet(formatData(dirCols, dirLabels));
  XLSX.utils.book_append_sheet(wb, wsDir, "Đạo Diễn");

  // DP Tab
  const dpCols = ['scene', 'shot', 'dayNight', 'memoryCard', 'size', 'movement', 'lens', 'angle', 'techNotes'];
  const dpLabels: Record<string, string> = {
    scene: 'Scene', shot: 'Shot', dayNight: 'I/E', memoryCard: 'Card',
    size: 'Shot Size', movement: 'Move', lens: 'Lens', angle: 'Angle', techNotes: 'Tech Note'
  };
  const wsDp = XLSX.utils.json_to_sheet(formatData(dpCols, dpLabels));
  XLSX.utils.book_append_sheet(wb, wsDp, "Quay Phim");

  XLSX.writeFile(wb, `${projectName}_${author}_Shotlist.xlsx`);
};
/**
 * GENERATE SHOTLIST EXCEL BLOB (FOR DRIVE SYNC)
 */
export const generateShotlistExcelBlob = (shotlist: Shot[]): Blob => {
  const wb = XLSX.utils.book_new();
  
  const formatData = (cols: string[], labels: Record<string, string>) => {
    return shotlist.map(shot => {
      const row: any = {};
      cols.forEach(col => {
        row[labels[col]] = shot[col as keyof Shot];
      });
      return row;
    });
  };

  // Director Tab
  const dirCols = ['scene', 'shot', 'dayNight', 'location', 'content', 'actorAction', 'sceneNotes', 'scriptNotes'];
  const dirLabels: Record<string, string> = {
    scene: 'Scene', shot: 'Shot', dayNight: 'I/E', location: 'Địa điểm',
    content: 'Nội dung', actorAction: 'Diễn xuất', sceneNotes: 'Ghi chú ĐD', scriptNotes: 'Thư ký'
  };
  const wsDir = XLSX.utils.json_to_sheet(formatData(dirCols, dirLabels));
  XLSX.utils.book_append_sheet(wb, wsDir, "Đạo Diễn");

  // DP Tab
  const dpCols = ['scene', 'shot', 'dayNight', 'memoryCard', 'size', 'movement', 'lens', 'angle', 'techNotes'];
  const dpLabels: Record<string, string> = {
    scene: 'Scene', shot: 'Shot', dayNight: 'I/E', memoryCard: 'Card',
    size: 'Shot Size', movement: 'Move', lens: 'Lens', angle: 'Angle', techNotes: 'Tech Note'
  };
  const wsDp = XLSX.utils.json_to_sheet(formatData(dpCols, dpLabels));
  XLSX.utils.book_append_sheet(wb, wsDp, "Quay Phim");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
