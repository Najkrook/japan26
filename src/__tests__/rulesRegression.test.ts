import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('admin-only media rules', () => {
  it('locks media mutations to admins in Firestore rules', () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

    expect(content).toContain('allow create: if isAdmin()');
    expect(content).toContain('allow update: if isAdmin()');
    expect(content).toContain('allow delete: if isAdmin();');
    expect(content).not.toContain('allow update: if isAdmin() ||');
  });

  it('allows admin deletes while still validating uploads in Storage rules', () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf8');

    expect(content).toContain('request.resource == null || isValidMediaUpload()');
    expect(content).toContain('request.resource == null || isValidThumbnailUpload()');
    expect(content).toContain('allow write: if isAdmin()');
  });
});
