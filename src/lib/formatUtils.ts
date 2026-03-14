/**
 * Utility functions for script formatting during import process
 */

export const formatImportSceneHeading = (text: string): string => {
  if (!text.trim()) return text;

  // 1. Clean extra spaces and convert to uppercase
  let cleaned = text.trim().replace(/\s+/g, ' ').toUpperCase();

  // 2. Extract leading scene number if exists (e.g., "1", "1.", "1-", "01")
  let sceneNumber = "";
  const numMatch = cleaned.match(/^([0-9]+[A-Z]?)([.\-\s\)]*)(\s+)/);
  if (numMatch) {
    sceneNumber = numMatch[1] + ". ";
    cleaned = cleaned.substring(numMatch[0].length).trim();
  }

  // 3. Detect and Standardize INT/EXT/IE
  const typeRegex = /^(INT|EXT|I\/E|INT\.\/EXT\.|CẢNH|PHÂN CẢNH|SCENE|HỒI|TAP|TẬP)(\.|\s|\/)?/;
  const typeMatch = cleaned.match(typeRegex);
  let prefix = "";
  if (typeMatch) {
    const rawType = typeMatch[1];
    // Standardize to common markers
    if (rawType.includes('INT')) prefix = "INT. ";
    else if (rawType.includes('EXT')) prefix = "EXT. ";
    else if (rawType.includes('I/E')) prefix = "I/E. ";
    else prefix = rawType + ". ";
    
    cleaned = cleaned.substring(typeMatch[0].length).trim();
  }

  // 4. Assemble: [NUMBER] [TYPE] [LOCATION]
  // The rest of the string is treated as location
  return (sceneNumber + prefix + cleaned).trim();
};
