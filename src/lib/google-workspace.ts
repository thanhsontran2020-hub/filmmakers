declare const gapi: any;
declare const google: any;
import { Packer } from 'docx';
import { generateScriptDocument, generateShotlistExcelBlob } from './exportUtils';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/docs/v1/rest",
  "https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest",
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
];

// Scopes: Chỉ yêu cầu quyền đối với các File do ứng dụng tạo ra (drive.file) để người dùng yên tâm tuyệt đối.
const SCOPES = "openid profile email https://www.googleapis.com/auth/drive.file";

export class GoogleWorkspaceService {
  private tokenClient: any;
  private accessToken: string | null = null;
  public currentUser: any = null;
  private appFolderId: string | null = null;
  private onLoginCallback: ((user: any) => void) | null = null;

  async initialize() {
    return new Promise((resolve) => {
      // Đợi script nạp xong
      const checkScripts = setInterval(() => {
        if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
          clearInterval(checkScripts);
          this.setupGapi(resolve);
        }
      }, 100);
    });
  }

  private setupGapi(resolve: (val: any) => void) {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          discoveryDocs: DISCOVERY_DOCS,
        });

        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (resp: any) => {
            if (resp.error !== undefined) {
              console.error("Auth error:", resp);
              throw resp;
            }
            this.accessToken = resp.access_token;
            const expiresAt = Date.now() + (resp.expires_in * 1000);
            localStorage.setItem('google_access_token', resp.access_token);
            localStorage.setItem('google_token_expires_at', expiresAt.toString());
            gapi.client.setToken({ access_token: resp.access_token });
            await this.fetchUserInfo();
          },
        });

        // Tự động khôi phục session nếu có token cũ và chưa hết hạn
        const savedToken = localStorage.getItem('google_access_token');
        const expiresAt = localStorage.getItem('google_token_expires_at');
        
        if (savedToken && expiresAt && Date.now() < parseInt(expiresAt)) {
          this.accessToken = savedToken;
          gapi.client.setToken({ access_token: savedToken });
          await this.fetchUserInfo();
        } else if (savedToken) {
          // Token cũ hết hạn, dọn dẹp để login lại sạch sẽ
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_token_expires_at');
        }

        resolve(true);
      } catch (e) {
        console.error("GAPI init failed", e);
        resolve(false);
      }
    });
  }

  async login(callback?: (user: any) => void, silent = false) {
    if (callback) this.onLoginCallback = callback;
    if (this.tokenClient) {
      // Nếu là silent, không hiện popup trừ khi buộc phải login lại
      this.tokenClient.requestAccessToken({ prompt: silent ? '' : 'select_account' });
    }
  }

  private async fetchUserInfo() {
    try {
      // Lấy thông tin cơ bản từ profile endpoint
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      const user = await resp.json();
      this.currentUser = {
        name: user.name,
        email: user.email,
        picture: user.picture
      };
      if (this.onLoginCallback) this.onLoginCallback(this.currentUser);
      // Đảm bảo thư mục ứng dụng tồn tại ngay khi login
      await this.ensureAppFolder();
    } catch (err) {
      console.error("Fetch user info failed", err);
    }
  }

  async ensureAppFolder(): Promise<string | null> {
    if (this.appFolderId) return this.appFolderId;
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      // 1. Tìm thư mục Filmmakers.vn
      const searchResp = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='Filmmakers.vn' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!searchResp.ok) {
        const errorData = await searchResp.json();
        console.error("Search app folder failed:", errorData);
        if (searchResp.status === 403) {
           return null; // Stop here if we don't have permission to even search
        }
      }
      const searchResult = await searchResp.json();

      if (searchResult.files && searchResult.files.length > 0) {
        this.appFolderId = searchResult.files[0].id;
        return this.appFolderId;
      }

      // 2. Nếu không thấy, tạo mới
      const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Filmmakers.vn',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      
      if (!createResp.ok) {
        const errorData = await createResp.json();
        console.error("Create app folder failed:", errorData);
        return null;
      }

      const createResult = await createResp.json();
      this.appFolderId = createResult.id;
      return this.appFolderId;
    } catch (err) {
      console.error("Ensure app folder failed:", err);
      return null;
    }
  }

  async listFilesFromAppFolder(): Promise<any[]> {
    const token = this.getAccessToken();
    const folderId = await this.ensureAppFolder();
    if (!token || !folderId) return [];

    try {
      const resp = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id, name, mimeType, modifiedTime)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = await resp.json();
      return result.files || [];
    } catch (err) {
      console.error("List files failed:", err);
      return [];
    }
  }

  async downloadFileAsBlob(fileId: string, mimeType: string): Promise<Blob | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      
      // Nếu là Google Doc hoặc Sheet, cần export sang định dạng tương ứng
      if (mimeType === 'application/vnd.google-apps.document') {
        url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`;
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
      }

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return await resp.blob();
    } catch (err) {
      console.error("Download file failed:", err);
      return null;
    }
  }

  getAccessToken() {
    const token = this.accessToken || localStorage.getItem('google_access_token');
    const expiresAt = localStorage.getItem('google_token_expires_at');
    
    // Nếu hết hạn thì coi như không có token
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
      this.accessToken = null;
      return null;
    }

    if (token && typeof gapi !== 'undefined' && gapi.client) {
      gapi.client.setToken({ access_token: token });
    }
    return token;
  }

  async syncScriptToDoc(docId: string, content: string) {
    const token = this.getAccessToken();
    if (!token) return;
    try {
      await gapi.client.docs.documents.batchUpdate({
        documentId: docId,
        resource: {
          requests: [{ insertText: { location: { index: 1 }, text: content } }]
        }
      });
    } catch (err) {
      console.error("Sync to Doc failed:", err);
    }
  }

  async syncShotlistToSheet(sheetId: string, data: any[][]) {
    const token = this.getAccessToken();
    if (!token) return;
    try {
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        resource: { values: data }
      });
    } catch (err) {
      console.error("Sync to Sheet failed:", err);
    }
  }

  async saveProjectToDrive(projectData: any) {
    const token = this.getAccessToken();
    if (!token) return { success: false, message: 'Chưa đăng nhập Google' };

    const folderId = await this.ensureAppFolder();
    const fileName = `[Filmmakers.vn] ${projectData.projectName || 'Unnamed Project'}.json`;
    const metadata: any = {
      name: fileName,
      mimeType: 'application/json',
      description: 'Dữ liệu thô từ Filmmakers.vn'
    };

    try {
      const projectId = projectData.id || 'default';
      // 1. Kiểm tra xem đã có fileId lưu trữ chưa (Ưu tiên ID hiện tại -> ID tên -> ID mặc định cũ)
      let fileId = localStorage.getItem(`google_file_id_${projectId}`) || 
                   localStorage.getItem(`google_file_id_${projectData.projectName}`) ||
                   localStorage.getItem(`google_file_id_default`);

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const contentType = 'application/json';
      const body =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        JSON.stringify(projectData) +
        close_delim;

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (fileId) {
        // Cập nhật file cũ và đảm bảo nó nằm ở folder ứng dụng
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart${folderId ? `&addParents=${folderId}` : ''}`;
        method = 'PATCH';
      } else if (folderId) {
        metadata.parents = [folderId];
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'multipart/related; boundary=' + boundary
        },
        body: body
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('google_access_token');
          return { success: false, message: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." };
        }
        if (response.status === 403) {
          return { 
            success: false, 
            message: "Lỗi 403: Không có quyền truy cập Drive. Có thể do ứng dụng đang ở chế độ 'Thử nghiệm' và email của bạn chưa được cấp phép (Test Users), hoặc API Drive chưa được bật." 
          };
        }
        console.error("Save Project API Error:", result);
        return { success: false, error: result, message: result.error?.message || "Lỗi khi lưu vào Drive" };
      }

      if (result.id) {
        localStorage.setItem(`google_file_id_${projectId}`, result.id);
        // Dọn dẹp các key cũ/thừa để tránh nhầm lẫn lần sau
        if (projectId !== 'default') {
          if (projectData.projectName) localStorage.removeItem(`google_file_id_${projectData.projectName}`);
          localStorage.removeItem(`google_file_id_default`);
        }
        return { success: true, fileId: result.id };
      }
      return { success: false, error: result };
    } catch (err) {
      console.error("Drive save failed:", err);
      return { success: false, error: err };
    }
  }

  async syncFullProjectToGoogleDoc(projectData: any): Promise<{ success: boolean; docId?: string; error?: any; message?: string }> {
    const token = this.getAccessToken();
    if (!token) return { success: false, message: 'Chưa đăng nhập Google' };

    try {
      // 1. Tạo file DOCX Blob từ dữ liệu kịch bản (Y hệt bản trích xuất hoàn hảo của bạn)
      const doc = generateScriptDocument(projectData.projectName || 'Chưa đặt tên', projectData.author || 'Tác giả', projectData.scriptBlocks || []);
      const docxBlob = await Packer.toBlob(doc);

      const projectId = (projectData as any).id || 'default';
      let docId = localStorage.getItem(`google_doc_id_${projectId}`) || 
                  localStorage.getItem(`google_doc_id_${projectData.projectName}`) ||
                  localStorage.getItem(`google_doc_id_default`);

      const folderId = await this.ensureAppFolder();
      const fileName = `[Filmmakers.vn] ${projectData.projectName || 'Chưa đặt tên'}`;
      const metadata: any = {
        name: fileName,
        mimeType: 'application/vnd.google-apps.document', // Google sẽ tự convert DOCX -> Doc
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      // Chuyển Blob sang Base64 hoặc ArrayBuffer để gửi
      const arrayBuffer = await docxBlob.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        base64Data +
        close_delim;

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (docId) {
        // Cập nhật nội dung cho file Google Doc hiện tại và đảm bảo ở folder ứng dụng
        url = `https://www.googleapis.com/upload/drive/v3/files/${docId}?uploadType=multipart${folderId ? `&addParents=${folderId}` : ''}`;
        method = 'PATCH';
      } else if (folderId) {
        metadata.parents = [folderId];
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'multipart/related; boundary=' + boundary
        },
        body: body
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('google_access_token');
          return { success: false, message: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." };
        }
        if (response.status === 403) {
          return { 
            success: false, 
            message: "Lỗi 403: Không có quyền đồng bộ Kịch bản. Vui lòng kiểm tra quyền truy cập hoặc cấu hình Test Users trong Google Cloud." 
          };
        }
        console.error("Sync Script API Error:", result);
        return { success: false, error: result, message: result.error?.message || "Lỗi khi đồng bộ Kịch bản" };
      }

      if (result.id) {
        localStorage.setItem(`google_doc_id_${projectId}`, result.id);
        if (projectId !== 'default') {
          if (projectData.projectName) localStorage.removeItem(`google_doc_id_${projectData.projectName}`);
          localStorage.removeItem(`google_doc_id_default`);
        }
        return { success: true, docId: result.id };
      }

      return { success: false, error: result, message: result.error?.message };
    } catch (err: any) {
      console.error("Docx-to-Doc Sync failed:", err);
      const isAuthError = err.status === 401 || (err.result?.error?.status === 'UNAUTHENTICATED');

      if (isAuthError) {
        localStorage.setItem('google_access_token', ''); // Clear invalid token
        return {
          success: false,
          message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng Logout rồi Login lại.'
        };
      }

      const msg = err.result?.error?.message || err.message || 'Lỗi không xác định';
      return { success: false, error: err, message: msg };
    }
  }

  async syncShotlistToDriveXlsx(projectData: any): Promise<{ success: boolean; fileId?: string; error?: any; message?: string }> {
    const token = this.getAccessToken();
    if (!token) return { success: false, message: 'Chưa đăng nhập Google' };

    try {
      // 1. Tạo file XLSX Blob từ dữ liệu shotlist
      const xlsxBlob = await generateShotlistExcelBlob(projectData.shotlist || []);

      const projectId = (projectData as any).id || 'default';
      let fileId = localStorage.getItem(`google_shotlist_id_${projectId}`) || 
                   localStorage.getItem(`google_shotlist_id_${projectData.shotlistProjectName}`) ||
                   localStorage.getItem(`google_shotlist_id_${projectData.projectName}`) ||
                   localStorage.getItem(`google_shotlist_id_default`);

      const folderId = await this.ensureAppFolder();
      const fileName = `[Filmmakers.vn] Shotlist - ${projectData.shotlistProjectName || projectData.projectName || 'Chưa đặt tên'}`;
      const metadata: any = {
        name: fileName,
        mimeType: 'application/vnd.google-apps.spreadsheet', // Google sẽ tự convert XLSX -> Sheet
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const arrayBuffer = await xlsxBlob.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        base64Data +
        close_delim;

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart${folderId ? `&addParents=${folderId}` : ''}`;
        method = 'PATCH';
      } else if (folderId) {
        metadata.parents = [folderId];
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'multipart/related; boundary=' + boundary
        },
        body: body
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('google_access_token');
          return { success: false, message: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." };
        }
        console.error("Sync Shotlist API Error:", result);
        return { success: false, error: result, message: result.error?.message || "Lỗi khi đồng bộ Shotlist" };
      }

      if (result.id) {
        localStorage.setItem(`google_shotlist_id_${projectId}`, result.id);
        if (projectId !== 'default') {
          if (projectData.projectName) localStorage.removeItem(`google_shotlist_id_${projectData.projectName}`);
          localStorage.removeItem(`google_shotlist_id_default`);
        }
        return { success: true, fileId: result.id };
      }

      return { success: false, error: result, message: result.error?.message };
    } catch (err: any) {
      console.error("Shotlist Drive Sync failed:", err);
      return { success: false, error: err, message: err.message || 'Lỗi không xác định' };
    }
  }

  logout() {
    this.accessToken = null;
    this.currentUser = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expires_at');
    // Clear all google file/doc IDs to avoid permission issues on re-login
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('google_file_id_') || key.startsWith('google_doc_id_') || key.startsWith('google_shotlist_id_')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  }
}

export const googleService = new GoogleWorkspaceService();
