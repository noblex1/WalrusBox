# Requirements Document

## Introduction

This document specifies requirements for fixing the encrypted file download functionality in WalrusBox. Currently, when users upload files with Seal encryption, the system stores blob IDs in metadata but fails to download them because the blobs don't exist on the Walrus network. The download process attempts to fetch from Walrus aggregator endpoints that return 404 errors, preventing users from accessing their encrypted files.

## Glossary

- **Seal**: The @mysten/seal encryption library that provides threshold encryption with key servers
- **WalrusBox**: The file storage application that uses Walrus for decentralized storage
- **Blob ID**: A unique identifier for data stored on the Walrus network
- **Seal Metadata**: Structured data containing encryption details, chunk information, and blob references
- **Local Storage**: Browser localStorage used to persist file metadata and Seal metadata
- **Walrus Aggregator**: The endpoint used to retrieve blobs from the Walrus network
- **File Preview**: The UI feature that displays file contents to users
- **File Download**: The feature that allows users to save files to their local system

## Requirements

### Requirement 1

**User Story:** As a user, I want to download my encrypted files successfully, so that I can access the content I previously uploaded.

#### Acceptance Criteria

1. WHEN a user clicks the download button on an encrypted file, THE WalrusBox SHALL retrieve the file data using the correct blob ID from Seal metadata
2. WHEN the Seal metadata contains chunk information, THE WalrusBox SHALL download all chunks sequentially from the Walrus network
3. IF a blob ID returns a 404 error from Walrus, THEN THE WalrusBox SHALL log detailed error information including the blob ID and file metadata
4. WHEN all chunks are downloaded successfully, THE WalrusBox SHALL reassemble and decrypt the file before presenting it to the user
5. THE WalrusBox SHALL display progress indicators during the download and decryption process

### Requirement 2

**User Story:** As a user, I want to preview my encrypted files in the browser, so that I can view content without downloading it.

#### Acceptance Criteria

1. WHEN a user clicks to preview an encrypted file, THE WalrusBox SHALL load the Seal metadata from local storage
2. WHEN Seal metadata is found, THE WalrusBox SHALL use the sealStorageService to download and decrypt the file
3. IF the file is an image, THEN THE WalrusBox SHALL display it in the preview modal after decryption
4. IF the file is a PDF or text document, THEN THE WalrusBox SHALL render it appropriately in the preview modal
5. THE WalrusBox SHALL handle preview errors gracefully with user-friendly error messages

### Requirement 3

**User Story:** As a developer, I want proper error handling for missing blobs, so that I can diagnose and fix storage issues.

#### Acceptance Criteria

1. WHEN a blob ID is not found on Walrus (404 error), THE WalrusBox SHALL log the blob ID, file ID, and associated metadata
2. THE WalrusBox SHALL distinguish between network errors and missing blob errors in error messages
3. WHEN a download fails, THE WalrusBox SHALL provide actionable error messages to users indicating the specific failure reason
4. THE WalrusBox SHALL track failed download attempts in analytics for monitoring
5. WHERE debugging is enabled, THE WalrusBox SHALL log the complete download flow including all blob IDs attempted

### Requirement 4

**User Story:** As a user, I want the system to verify blob existence before attempting downloads, so that I receive immediate feedback if files are unavailable.

#### Acceptance Criteria

1. WHEN a user initiates a download or preview, THE WalrusBox SHALL verify blob existence using HEAD requests before downloading
2. IF any required blob is missing, THEN THE WalrusBox SHALL display a clear error message indicating the file is unavailable
3. THE WalrusBox SHALL cache blob verification results for 5 minutes to reduce redundant network requests
4. WHEN verification fails, THE WalrusBox SHALL offer users the option to retry or report the issue
5. THE WalrusBox SHALL display verification status in the UI during the check process

### Requirement 5

**User Story:** As a developer, I want consistent metadata storage for Seal-encrypted files, so that download operations can reliably locate file data.

#### Acceptance Criteria

1. WHEN a file is uploaded with Seal encryption, THE WalrusBox SHALL store complete Seal metadata including all chunk blob IDs in local storage
2. THE WalrusBox SHALL use a consistent key format for storing Seal metadata (seal_metadata_{fileId})
3. WHEN retrieving Seal metadata, THE WalrusBox SHALL validate that all required fields are present before attempting download
4. IF Seal metadata is incomplete or corrupted, THEN THE WalrusBox SHALL log the issue and prevent download attempts
5. THE WalrusBox SHALL provide a utility function to migrate or repair Seal metadata for existing files
