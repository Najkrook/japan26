import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'src', 'config', 'authorizedUploaders.json');
const firestoreRulesPath = path.join(rootDir, 'firestore.rules');
const storageRulesPath = path.join(rootDir, 'storage.rules');

const rawAccounts = await fs.readFile(configPath, 'utf8');
const accounts = JSON.parse(rawAccounts);

if (!Array.isArray(accounts) || accounts.length === 0) {
  throw new Error('authorizedUploaders.json must contain at least one account.');
}

const adminAccounts = accounts.filter((account) => account?.role === 'admin');
if (adminAccounts.length !== 1) {
  throw new Error('authorizedUploaders.json must contain exactly one admin account.');
}

const adminUid = adminAccounts[0].uid;
const posterUids = accounts
  .filter((account) => account?.role === 'poster')
  .map((account) => account.uid);

const renderUidList = (uids, indent) =>
  uids.length > 0 ? uids.map((uid) => `${indent}"${uid}"`).join(',\n') : `${indent}"__NO_POSTERS__"`;

const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.uid == "${adminUid}";
    }

    function isPoster() {
      return request.auth != null && request.auth.uid in [
${renderUidList(posterUids, '        ')}
      ];
    }

    function isValidCapturedAtSource(source) {
      return source == "exif" || source == "fallback";
    }

    function isValidUploadStatus(status) {
      return status == "uploading" || status == "ready" || status == "error";
    }

    function optionalNumber(field) {
      return !request.resource.data.keys().hasAny([field]) || request.resource.data[field] is number;
    }

    function isValidMediaPayload() {
      return request.resource.data.keys().hasOnly([
        "dayId",
        "type",
        "url",
        "thumbnailUrl",
        "storagePath",
        "thumbnailStoragePath",
        "fileName",
        "capturedAt",
        "uploadedAt",
        "width",
        "height",
        "caption",
        "latitude",
        "longitude",
        "uploadStatus",
        "capturedAtSource",
        "uploaderUid"
      ])
      && request.resource.data.dayId is string
      && (request.resource.data.type == "photo" || request.resource.data.type == "video")
      && request.resource.data.url is string
      && request.resource.data.thumbnailUrl is string
      && request.resource.data.storagePath is string
      && request.resource.data.thumbnailStoragePath is string
      && request.resource.data.fileName is string
      && request.resource.data.capturedAt is timestamp
      && request.resource.data.uploadedAt is timestamp
      && request.resource.data.width is number
      && request.resource.data.height is number
      && request.resource.data.caption is string
      && optionalNumber("latitude")
      && optionalNumber("longitude")
      && isValidUploadStatus(request.resource.data.uploadStatus)
      && isValidCapturedAtSource(request.resource.data.capturedAtSource)
      && request.resource.data.uploaderUid is string;
    }

    function isPosterAutoDayCreate(dayId) {
      return request.resource.data.keys().hasOnly([
        "date",
        "dateKey",
        "title",
        "description",
        "itinerary",
        "createdAt",
        "updatedAt"
      ])
      && request.resource.data.dateKey == dayId
      && request.resource.data.date is timestamp
      && request.resource.data.title is string
      && request.resource.data.description == ""
      && request.resource.data.itinerary == "";
    }

    match /media/{mediaId} {
      allow read: if true;
      allow create: if isAdmin()
        && isValidMediaPayload()
        && request.resource.data.uploaderUid == request.auth.uid;
      allow update: if isAdmin()
        && isValidMediaPayload()
        && request.resource.data.uploaderUid == resource.data.uploaderUid;
      allow delete: if isAdmin();
    }

    match /days/{dayId} {
      allow read: if true;
      allow create: if isAdmin() || (isPoster() && isPosterAutoDayCreate(dayId));
      allow update, delete: if isAdmin();
    }

    match /comments/{commentId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if isAdmin();
    }
  }
}
`;

const storageRules = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null && request.auth.uid == "${adminUid}";
    }

    function isPoster() {
      return request.auth != null && request.auth.uid in [
${renderUidList(posterUids, '        ')}
      ];
    }

    function hasMediaContentType() {
      return request.resource.contentType.matches('image/.*') || request.resource.contentType.matches('video/.*');
    }

    function isValidMediaUpload() {
      return request.resource != null
        && request.resource.size > 0
        && request.resource.size <= 262144000
        && hasMediaContentType();
    }

    function isValidThumbnailUpload() {
      return request.resource != null
        && request.resource.size > 0
        && request.resource.size <= 2097152
        && request.resource.contentType == 'image/jpeg';
    }

    match /media/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin() && (request.resource == null || isValidMediaUpload());
    }

    match /thumbnails/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin() && (request.resource == null || isValidThumbnailUpload());
    }
  }
}
`;

await Promise.all([
  fs.writeFile(firestoreRulesPath, firestoreRules, 'utf8'),
  fs.writeFile(storageRulesPath, storageRules, 'utf8'),
]);

console.log('Synchronized firestore.rules and storage.rules from authorizedUploaders.json');
