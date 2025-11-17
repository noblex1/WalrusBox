module walrusbox::walrusbox;

use sui::object::{UID, ID};
use sui::tx_context::TxContext;
use sui::table::Table;
use std::string::String;

/// Visibility constants
const VISIBILITY_PRIVATE: u8 = 0;
const VISIBILITY_PUBLIC: u8 = 1;

/// Maximum folder depth
const MAX_FOLDER_DEPTH: u64 = 10;

/// Error codes
const E_NOT_OWNER: u64 = 0;
const E_INVALID_VISIBILITY: u64 = 2;
const E_ADDRESS_ALREADY_ALLOWED: u64 = 3;
const E_ADDRESS_NOT_ALLOWED: u64 = 4;
const E_FOLDER_NOT_FOUND: u64 = 5;
const E_MAX_DEPTH_EXCEEDED: u64 = 6;
const E_INVALID_PARENT: u64 = 7;

/// FolderObject struct stores folder metadata
public struct FolderObject has key, store {
    id: UID,
    /// Unique identifier for the folder
    folder_id: String,
    /// Folder name
    name: String,
    /// Parent folder ID (empty string for root folders)
    parent_id: String,
    /// Full path (e.g., "/Documents/Projects")
    path: String,
    /// Owner address of the folder
    owner: address,
    /// Optional folder color for UI
    color: String,
    /// Timestamp when folder was created
    created_at: u64,
    /// Depth in folder hierarchy (0 for root)
    depth: u64,
}

/// FileObject struct stores metadata for encrypted files stored on Walrus
public struct FileObject has key, store {
    id: UID,
    /// Unique identifier for the file
    file_id: String,
    /// Walrus object hash (CID-like reference) for the encrypted file
    walrus_object_hash: vector<u8>,
    /// Owner address of the file
    owner: address,
    /// Visibility: 0 = private, 1 = public
    visibility: u8,
    /// List of addresses allowed to access this file (for private files)
    allowed_addresses: vector<address>,
    /// Timestamp when file was created
    created_at: u64,
    /// Reference to parent folder (empty string for root)
    folder_id: String,
    /// Full path for display
    path: String,
}

/// Registry to track all FileObjects by file_id
public struct FileRegistry has key {
    id: UID,
    /// Maps file_id to FileObject ID
    files: Table<String, ID>,
}

/// Registry to track all FolderObjects by folder_id
public struct FolderRegistry has key {
    id: UID,
    /// Maps folder_id to FolderObject ID
    folders: Table<String, ID>,
}

/// Helper function to check if address exists in vector
fun contains_address(addresses: &vector<address>, addr: address): bool {
    let mut i = 0;
    let len = std::vector::length(addresses);
    while (i < len) {
        if (*std::vector::borrow(addresses, i) == addr) {
            return true
        };
        i = i + 1;
    };
    false
}

/// Helper function to remove address from vector
fun remove_address(addresses: &mut vector<address>, addr: address) {
    let mut i = 0;
    let len = std::vector::length(addresses);
    while (i < len) {
        if (*std::vector::borrow(addresses, i) == addr) {
            std::vector::remove(addresses, i);
            return
        };
        i = i + 1;
    };
}

/// Create a new FolderObject and register it
public entry fun create_folder(
    folder_registry: &mut FolderRegistry,
    folder_id: vector<u8>,
    name: vector<u8>,
    parent_id: vector<u8>,
    path: vector<u8>,
    color: vector<u8>,
    depth: u64,
    ctx: &mut TxContext
) {
    let owner = sui::tx_context::sender(ctx);
    let timestamp = sui::tx_context::epoch_timestamp_ms(ctx);
    let folder_id_string = std::string::utf8(folder_id);
    
    // Validate depth
    assert!(depth <= MAX_FOLDER_DEPTH, E_MAX_DEPTH_EXCEEDED);
    
    let folder_object = FolderObject {
        id: sui::object::new(ctx),
        folder_id: folder_id_string,
        name: std::string::utf8(name),
        parent_id: std::string::utf8(parent_id),
        path: std::string::utf8(path),
        owner,
        color: std::string::utf8(color),
        created_at: timestamp,
        depth,
    };
    
    let folder_object_id = sui::object::id(&folder_object);
    
    // Register the folder
    sui::table::add(&mut folder_registry.folders, folder_id_string, folder_object_id);
    
    // Transfer ownership to the creator
    sui::transfer::transfer(folder_object, owner);
}

/// Create a new FileObject and register it
public entry fun create_file(
    registry: &mut FileRegistry,
    file_id: vector<u8>,
    walrus_object_hash: vector<u8>,
    folder_id: vector<u8>,
    path: vector<u8>,
    ctx: &mut TxContext
) {
    let owner = sui::tx_context::sender(ctx);
    let timestamp = sui::tx_context::epoch_timestamp_ms(ctx);
    let file_id_string = std::string::utf8(file_id);
    
    let file_object = FileObject {
        id: sui::object::new(ctx),
        file_id: file_id_string,
        walrus_object_hash,
        owner,
        visibility: VISIBILITY_PRIVATE,
        allowed_addresses: std::vector::empty(),
        created_at: timestamp,
        folder_id: std::string::utf8(folder_id),
        path: std::string::utf8(path),
    };
    
    let file_object_id = sui::object::id(&file_object);
    
    // Register the file
    sui::table::add(&mut registry.files, file_id_string, file_object_id);
    
    // Transfer ownership to the creator
    sui::transfer::transfer(file_object, owner);
}

/// Set visibility of a file (public or private)
public entry fun set_visibility(
    file_object: &mut FileObject,
    visibility: u8,
    ctx: &TxContext
) {
    assert!(sui::tx_context::sender(ctx) == file_object.owner, E_NOT_OWNER);
    assert!(visibility == VISIBILITY_PRIVATE || visibility == VISIBILITY_PUBLIC, E_INVALID_VISIBILITY);
    
    file_object.visibility = visibility;
}

/// Add an address to the allowed list for a private file
public entry fun add_allowed_address(
    file_object: &mut FileObject,
    allowed_address: address,
    ctx: &TxContext
) {
    assert!(sui::tx_context::sender(ctx) == file_object.owner, E_NOT_OWNER);
    assert!(!contains_address(&file_object.allowed_addresses, allowed_address), E_ADDRESS_ALREADY_ALLOWED);
    
    std::vector::push_back(&mut file_object.allowed_addresses, allowed_address);
}

/// Remove an address from the allowed list
public entry fun remove_allowed_address(
    file_object: &mut FileObject,
    allowed_address: address,
    ctx: &TxContext
) {
    assert!(sui::tx_context::sender(ctx) == file_object.owner, E_NOT_OWNER);
    assert!(contains_address(&file_object.allowed_addresses, allowed_address), E_ADDRESS_NOT_ALLOWED);
    
    remove_address(&mut file_object.allowed_addresses, allowed_address);
}

/// Verify if a requester has access to a file
public fun verify_access(
    file_object: &FileObject,
    requester_address: address
): bool {
    // Owner always has access
    if (requester_address == file_object.owner) {
        return true
    };
    
    // Public files are accessible to everyone
    if (file_object.visibility == VISIBILITY_PUBLIC) {
        return true
    };
    
    // For private files, check if requester is in allowed list
    if (file_object.visibility == VISIBILITY_PRIVATE) {
        return contains_address(&file_object.allowed_addresses, requester_address)
    };
    
    false
}

/// Get file metadata (read-only view)
public fun get_file_metadata(file_object: &FileObject): (String, vector<u8>, address, u8, u64) {
    (
        file_object.file_id,
        file_object.walrus_object_hash,
        file_object.owner,
        file_object.visibility,
        file_object.created_at
    )
}

/// Get allowed addresses for a file
public fun get_allowed_addresses(file_object: &FileObject): vector<address> {
    file_object.allowed_addresses
}

/// Get FileObject ID from registry by file_id
public fun get_file_id(registry: &FileRegistry, file_id: String): &ID {
    sui::table::borrow(&registry.files, file_id)
}

/// Move a file to a different folder
public entry fun move_file(
    file_object: &mut FileObject,
    new_folder_id: vector<u8>,
    new_path: vector<u8>,
    ctx: &TxContext
) {
    assert!(sui::tx_context::sender(ctx) == file_object.owner, E_NOT_OWNER);
    
    file_object.folder_id = std::string::utf8(new_folder_id);
    file_object.path = std::string::utf8(new_path);
}

/// Delete a folder (must be called by owner)
public entry fun delete_folder(
    folder_registry: &mut FolderRegistry,
    folder_object: FolderObject,
    ctx: &TxContext
) {
    assert!(sui::tx_context::sender(ctx) == folder_object.owner, E_NOT_OWNER);
    
    let folder_id = folder_object.folder_id;
    
    // Remove from registry
    sui::table::remove(&mut folder_registry.folders, folder_id);
    
    // Destroy the folder object
    let FolderObject { id, folder_id: _, name: _, parent_id: _, path: _, owner: _, color: _, created_at: _, depth: _ } = folder_object;
    sui::object::delete(id);
}

/// Get folder metadata (read-only view)
public fun get_folder_metadata(folder_object: &FolderObject): (String, String, String, String, address, u64, u64) {
    (
        folder_object.folder_id,
        folder_object.name,
        folder_object.parent_id,
        folder_object.path,
        folder_object.owner,
        folder_object.created_at,
        folder_object.depth
    )
}

/// Get FolderObject ID from registry by folder_id
public fun get_folder_id(registry: &FolderRegistry, folder_id: String): &ID {
    sui::table::borrow(&registry.folders, folder_id)
}

/// Initialize the FileRegistry and FolderRegistry (called once during module publish)
fun init(ctx: &mut TxContext) {
    let file_registry = FileRegistry {
        id: sui::object::new(ctx),
        files: sui::table::new(ctx),
    };
    
    let folder_registry = FolderRegistry {
        id: sui::object::new(ctx),
        folders: sui::table::new(ctx),
    };
    
    sui::transfer::share_object(file_registry);
    sui::transfer::share_object(folder_registry);
}

