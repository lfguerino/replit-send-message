import * as XLSX from 'xlsx';

export interface ExcelContact {
  name: string;
  phone: string;
  customFields?: Record<string, any>;
}

export interface ExcelProcessResult {
  success: boolean;
  contacts: ExcelContact[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

export class ExcelService {
  static async processExcelFile(buffer: Buffer): Promise<ExcelProcessResult> {
    const result: ExcelProcessResult = {
      success: false,
      contacts: [],
      errors: [],
      totalRows: 0,
      validRows: 0,
    };

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      
      if (!sheetName) {
        result.errors.push('Planilha não encontrada');
        return result;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) {
        result.errors.push('Planilha vazia');
        return result;
      }

      // Get headers from first row
      const headers = jsonData[0].map((header: any) => 
        String(header).toLowerCase().trim()
      );

      // Use specific columns: B for company name (index 1) and F for phone (index 5)
      const nameIndex = 1; // Column B (0-indexed, so B = 1)
      const phoneIndex = 5; // Column F (0-indexed, so F = 5)

      // Check if the required columns exist in the data
      if (jsonData[0].length <= nameIndex) {
        result.errors.push('Coluna B (nome da empresa) não encontrada na planilha');
        return result;
      }

      if (jsonData[0].length <= phoneIndex) {
        result.errors.push('Coluna F (telefone) não encontrada na planilha');
        return result;
      }

      // Process data rows (skip header)
      const dataRows = jsonData.slice(1);
      result.totalRows = dataRows.length;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because we skip header and arrays are 0-indexed

        try {
          const name = this.extractCellValue(row[nameIndex]);
          const phone = this.extractCellValue(row[phoneIndex]);

          if (!name) {
            result.errors.push(`Linha ${rowNumber}: Nome vazio`);
            continue;
          }

          if (!phone) {
            result.errors.push(`Linha ${rowNumber}: Telefone vazio`);
            continue;
          }

          const cleanPhone = this.cleanPhoneNumber(phone);
          if (!this.isValidPhoneNumber(cleanPhone)) {
            result.errors.push(`Linha ${rowNumber}: Telefone inválido (${phone})`);
            continue;
          }

          // Extract custom fields from other columns
          const customFields: Record<string, any> = {};
          headers.forEach((header, index) => {
            if (index !== nameIndex && index !== phoneIndex && row[index]) {
              customFields[header] = this.extractCellValue(row[index]);
            }
          });

          const contact: ExcelContact = {
            name: name.trim(),
            phone: cleanPhone,
            customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          };

          result.contacts.push(contact);
          result.validRows++;

        } catch (error: any) {
          result.errors.push(`Linha ${rowNumber}: Erro ao processar (${error.message})`);
        }
      }

      result.success = result.contacts.length > 0;

      if (result.contacts.length === 0) {
        result.errors.push('Nenhum contato válido encontrado na planilha');
      }

    } catch (error: any) {
      result.errors.push(`Erro ao processar arquivo: ${error.message}`);
    }

    return result;
  }

  private static findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => 
        header.includes(name) || name.includes(header)
      );
      if (index !== -1) return index;
    }
    return -1;
  }

  private static extractCellValue(cell: any): string {
    if (cell === null || cell === undefined) return '';
    return String(cell).trim();
  }

  private static cleanPhoneNumber(phone: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Remove + if present
    cleaned = cleaned.replace(/^\+/, '');
    
    // Remove country code if present and add it back
    if (cleaned.startsWith('55') && cleaned.length > 11) {
      cleaned = cleaned.substring(2);
    }
    
    // Add Brazil country code
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    
    return cleaned;
  }

  private static isValidPhoneNumber(phone: string): boolean {
    // Brazilian phone number validation
    // Should have 13 digits (55 + area code + number)
    if (phone.length !== 13) return false;
    
    // Should start with 55 (Brazil)
    if (!phone.startsWith('55')) return false;
    
    // Area code should be valid (11-99)
    const areaCode = phone.substring(2, 4);
    const areaCodeNum = parseInt(areaCode);
    if (areaCodeNum < 11 || areaCodeNum > 99) return false;
    
    return true;
  }

  static validateExcelFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Tipo de arquivo inválido. Use apenas arquivos Excel (.xlsx ou .xls)' };
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'Arquivo muito grande. Tamanho máximo: 10MB' };
    }

    return { valid: true };
  }
}
