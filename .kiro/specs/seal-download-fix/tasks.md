# Implementation Plan

- [x] 1. Create Seal Metadata Service
  - Create `src/services/seal/sealMetadata.ts` with centralized metadata management
  - Implement `saveSealMetadata()` method with consistent key format `seal_metadata_{fileId}`
  - Implement `getSealMetadata()` method to retrieve metadata from localStorage
  - Implement `validateSealMetadata()` to check for required fields and data integrity
  - Implement `verifyBlobsExist()` to check blob availability on Walrus using HEAD requests
  - Add caching mechanism for verification results (5-minute TTL)
  - Export service from `src/services/seal/index.ts`
  - _Requirements: 1.1, 1.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_

- [ ]* 1.1 Write unit tests for Seal Metadata Service
  - Test metadata storage with various file IDs
  - Test metadata retrieval with missing data
  - Test validation with incomplete metadata
  - Test blob verification with mocked Walrus responses
  - _Requirements: 1.1, 5.3, 5.4_

- [x] 2. Implement Download Service
  - Create `downloadEncryptedFile()` method in files.ts or new download service
  - Add pre-download blob verification step (optional, controlled by parameter)
  - Integrate sealMetadata service for metadata retrieval
  - Implement progress tracking for multi-chunk downloads with callbacks
  - Add timeout handling with configurable timeout values
  - Use sealStorageService.downloadFile() for actual download and decryption
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1_

- [ ]* 2.1 Write unit tests for Download Service
  - Test download with valid Seal metadata
  - Test download with missing blobs (404 responses)
  - Test progress tracking callbacks
  - Test timeout scenarios
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Enhance Error Handling
  - Add new error types to `src/services/seal/sealErrorHandler.ts`: BLOB_NOT_FOUND, METADATA_CORRUPTED, METADATA_MISSING, PARTIAL_DOWNLOAD_FAILURE
  - Create `BlobNotFoundError` interface with recovery options
  - Implement error categorization logic to distinguish network vs missing blob errors
  - Add detailed logging for missing blobs including blob ID, file ID, and metadata
  - Implement recovery option generation (retry, report, delete)
  - Update sealErrorLogger to track failed download attempts
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 3.1 Write unit tests for Error Handler
  - Test error type categorization
  - Test recovery option generation
  - Test logging without sensitive data exposure
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Update FileListTable Download Handler
  - Modify download button click handler in `src/components/FileListTable.tsx`
  - Replace direct sealStorageService calls with new downloadEncryptedFile service
  - Add loading state during blob verification
  - Implement progress indicator for multi-chunk downloads
  - Add error handling with user-friendly messages
  - Display recovery options when download fails (retry, remove file)
  - _Requirements: 1.1, 1.5, 3.3, 4.4_

- [x] 5. Update FilePreviewModal
  - Modify preview logic in `src/components/FilePreviewModal.tsx`
  - Use sealMetadata service to load metadata
  - Add verification step before loading preview
  - Implement loading states during verification and download
  - Add error display with recovery options
  - Handle different file types (images, PDFs, text) after decryption
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.4_

- [x] 6. Update File Upload Flow
  - Ensure FileUploadArea.tsx saves Seal metadata using sealMetadata service
  - Verify metadata is saved with correct key format after upload
  - Add metadata validation after save
  - Update local file metadata to include `hasSealMetadata` flag
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Add Metadata Migration Utility
  - Create `migrateOldMetadata()` function in sealMetadata service
  - Scan localStorage for old metadata key formats
  - Convert to new `seal_metadata_{fileId}` format
  - Validate migrated metadata
  - Log migration results
  - _Requirements: 5.5_

- [ ]* 7.1 Write integration test for migration
  - Create test data with old metadata format
  - Run migration
  - Verify new format is correct
  - _Requirements: 5.5_

- [x] 8. Add Blob Verification UI
  - Create verification status indicator component
  - Show verification progress in FileListTable
  - Display verification results (available/unavailable)
  - Add manual verification trigger button
  - Cache and display last verification time
  - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [ ]* 9. Integration Testing
  - Test complete upload-download flow with Seal encryption
  - Test preview functionality for encrypted images
  - Test preview functionality for encrypted PDFs
  - Test error scenarios (missing blobs, network errors)
  - Test blob verification caching
  - Test metadata migration
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.1, 5.5_

- [ ]* 10. Update Documentation
  - Document Seal metadata storage format in code comments
  - Add JSDoc comments to all new service methods
  - Update README with troubleshooting section for download issues
  - Document error types and recovery options
  - _Requirements: 3.3, 5.2_
