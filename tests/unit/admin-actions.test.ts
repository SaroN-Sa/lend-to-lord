import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  }),
}));

import {
  updateHeroAction,
  deleteSponsorAction,
} from '@/app/admin/(dashboard)/content/actions';

describe('Task 7: Server Actions with Mocked Supabase', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Authorization checks', () => {
    it('rejects unauthenticated user without calling database or storage', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const fd = new FormData();
      fd.append('alt_en', 'Alt text');
      const res = await updateHeroAction(fd);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('Unauthorized');
      }
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });

    it('rejects authenticated user who is not an admin', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-123', email: 'user@example.com' } },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const fd = new FormData();
      fd.append('alt_en', 'Alt text');
      const res = await updateHeroAction(fd);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('Unauthorized');
      }
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });
  });

  describe('Validation & Rollback checks', () => {
    it('rejects invalid fields before uploading any file', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      // Image is provided, but alt_en is empty
      const fd = new FormData();
      const dummyFile = new File(['fake-png-bytes'], 'photo.png', { type: 'image/png' });
      fd.append('image', dummyFile);
      fd.append('alt_en', '');

      const res = await updateHeroAction(fd);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors?.alt_en).toBeDefined();
      }
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });

    it('rolls back newly uploaded file when database update fails', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      // Read current hero: .select('image_path').eq('id', 1).maybeSingle()
      const mockSelectMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: { image_path: 'hero/old-pic.webp' },
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ maybeSingle: mockSelectMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      // DB update failure: .update(...).eq('id', 1).select()
      const mockUpdateSelect = vi.fn().mockResolvedValueOnce({
        data: null,
        error: new Error('Postgres connection dead'),
      });
      const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      mockFrom.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      // Storage mock
      const mockUpload = vi.fn().mockResolvedValueOnce({ data: { path: 'hero/new.png' }, error: null });
      const mockRemove = vi.fn().mockResolvedValueOnce({ data: [], error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      });

      // Create minimal PNG file
      const pngBuf = new Uint8Array(33);
      pngBuf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
      pngBuf.set([0x00, 0x00, 0x00, 0x0d], 8);
      pngBuf.set([0x49, 0x48, 0x44, 0x52], 12);
      pngBuf[19] = 100;
      pngBuf[23] = 50;
      const pngFile = new File([pngBuf], 'pic.png', { type: 'image/png' });

      const fd = new FormData();
      fd.append('image', pngFile);
      fd.append('alt_en', 'Valid alt description');

      const res = await updateHeroAction(fd);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('Database update failed');
      }
      // Verify rollback removal was called on the new file
      expect(mockRemove).toHaveBeenCalled();
    });

    it('treats 0 affected rows as failure and rolls back uploaded file', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const mockSelectMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: { image_path: null },
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ maybeSingle: mockSelectMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      // 0 rows affected
      const mockUpdateSelect = vi.fn().mockResolvedValueOnce({
        data: [], // empty array!
        error: null,
      });
      const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      mockFrom.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      const mockUpload = vi.fn().mockResolvedValueOnce({ data: { path: 'hero/new.png' }, error: null });
      const mockRemove = vi.fn().mockResolvedValueOnce({ data: [], error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      });

      const pngBuf = new Uint8Array(33);
      pngBuf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
      pngBuf.set([0x00, 0x00, 0x00, 0x0d], 8);
      pngBuf.set([0x49, 0x48, 0x44, 0x52], 12);
      pngBuf[19] = 100;
      pngBuf[23] = 50;
      const pngFile = new File([pngBuf], 'pic.png', { type: 'image/png' });

      const fd = new FormData();
      fd.append('image', pngFile);
      fd.append('alt_en', 'Valid alt description');

      const res = await updateHeroAction(fd);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('Database update failed');
      }
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('Sponsor Delete & Orphan Logging', () => {
    it('deletes database row first, then removes logo file', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      // Sponsor select: .select('logo_path').eq('id', sponsorId).maybeSingle()
      const mockSelectMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: { logo_path: 'sponsors/logo-123.webp' },
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ maybeSingle: mockSelectMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      // Delete row succeeds: .delete().eq('id', sponsorId).select()
      const mockDeleteSelect = vi.fn().mockResolvedValueOnce({
        data: [{ id: '123e4567-e89b-12d3-a456-426614174000' }],
        error: null,
      });
      const mockDeleteEq = vi.fn().mockReturnValue({ select: mockDeleteSelect });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      mockFrom.mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });

      // Storage removal succeeds
      const mockRemove = vi.fn().mockResolvedValueOnce({ data: [], error: null });
      mockStorageFrom.mockReturnValue({ remove: mockRemove });

      const res = await deleteSponsorAction('123e4567-e89b-12d3-a456-426614174000');

      expect(res.ok).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalledWith(['sponsors/logo-123.webp']);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/content');
    });

    it('logs orphan with context if logo file removal fails, but still reports success for row', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const mockSelectMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: { logo_path: 'sponsors/logo-456.webp' },
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ maybeSingle: mockSelectMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      const mockDeleteSelect = vi.fn().mockResolvedValueOnce({
        data: [{ id: '123e4567-e89b-12d3-a456-426614174000' }],
        error: null,
      });
      const mockDeleteEq = vi.fn().mockReturnValue({ select: mockDeleteSelect });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      mockFrom.mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });

      // Storage removal fails
      const mockRemove = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('S3 timeout') });
      mockStorageFrom.mockReturnValue({ remove: mockRemove });

      const res = await deleteSponsorAction('123e4567-e89b-12d3-a456-426614174000');

      expect(res.ok).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedError = consoleErrorSpy.mock.calls.find((call: unknown[]) =>
        String(call[0]).includes('[admin-content:orphan-logo]')
      );
      expect(loggedError).toBeDefined();
    });
  });
});
