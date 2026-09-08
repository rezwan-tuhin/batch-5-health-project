// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
*@title HealthRecordSystem
*@notice Manages patient consent, record hash integrity and audited emergency access
*/

contract HealthRecordSystem is AccessControl, Pausable {

//------------------------------------------
//Role definition
//-------------------------------------------

bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");
bytes32 public constant VERIFIED_PROVIDER_ROLE = keccak256("VERIFIED_PROVIDER_ROLE");
bytes32 public constant ER_SPECIALIST_ROLE = keccak256("ER_SPECIALIST_ROLE");

//-------------------------------------------
//Custom error
//--------------------------------------------

error AlreadyRegistered();
error NotRegistered();
error NotVerifiedProvider();
error Unauthorized();
error InvalidExpiry();
error ConsentNotActive();
error RecordNotFound();
error EmergencyWindowClosed();

//-------------------------------
//Struct & State Variables 
//------------------------------

struct Patient{
    bool registered;
    string didURI;
}

struct Provider{
    bool registered;
    bool verified;
    string didURI;
    string name;
}

struct Consent{
    bool active;
    uint64 expiresAt;
    string purpose;
}

struct EmergencyAccess {
    uint64 validUntil;
    address doctor;
    string justification;
}

struct RecordAnchor{
    bytes32 recordHash;
    string pointer;  //ipfs cid
    address anchoredBy;
    uint64 anchoredAt;
    bool tombstoned;
}

mapping (address => Patient) public patients;
mapping (address => Provider) public providers;

//patinet -> provider -> consent

mapping (address => mapping (address => Consent)) private consents;

//patient -> record -> Rcordanchor

mapping (address => mapping (bytes32 => RecordAnchor)) public recordAnchors;

//patinet -> active emergency session
mapping (address => EmergencyAccess) public emergencySessions;

//----------------------------
//Events
//-------------------------------

event PatientRegistered(address indexed patient, string didURI);
event ProviderRegistered(address indexed provider, string didURI, string name);
event ProviderVerified (address indexed provider, bool isVerified);
event ConsentGranted (address indexed patient, address indexed provider, string purpose, uint64 expiresAt);
event ConsentRevoked(address indexed patient, address indexed provider);
event RecordAnchored(address indexed patient, bytes32 indexed recordId, bytes32 recordHash, string pointer, address anchoredBy);
event RecordTombstoned(address indexed patient, bytes32 indexed recordId);
event RecordAccessed (address indexed patient, bytes32 recordId, address indexed accessor, string purpose);

event EmergencyAccessTriggered (address indexed patient, address indexed doctor, string justification, uint64 validUntil);


constructor (address initialAdmin) {
    if(initialAdmin == address(0)) revert Unauthorized();

    _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    _grantRole(REGULATOR_ROLE, initialAdmin);
}


//----------------------------------
// Registration
//----------------------------------

function registerPatient (string calldata didURI) external whenNotPaused {
    if(patients[msg.sender].registered) revert AlreadyRegistered();

    patients[msg.sender] = Patient({
        registered: true,
        didURI: didURI
    });

    emit PatientRegistered(msg.sender, didURI);
}

function registerProvider (string calldata didURI, string calldata name) external whenNotPaused {
    if(providers[msg.sender].registered) revert AlreadyRegistered();

    providers[msg.sender] = Provider({
        registered: true,
        verified: false, 
        didURI: didURI,
        name: name
    });

    emit ProviderRegistered(msg.sender, didURI, name);
}

/// @notice Regulators or Hospital Admins verify a doctor

function verifyProvider (address provider, bool isVerified, bool isERQualified) external onlyRole(REGULATOR_ROLE) {
    if(!providers[provider].registered) revert NotRegistered();

    providers[provider].verified = isVerified;

    if(isVerified) {
        _grantRole(VERIFIED_PROVIDER_ROLE, provider);

        if(isERQualified) {
            _grantRole(ER_SPECIALIST_ROLE, provider);
        }
    }else {
        _revokeRole(VERIFIED_PROVIDER_ROLE, provider);
        _revokeRole(ER_SPECIALIST_ROLE, provider);
    }
}


//-----------------------------------------
//Consent Management
//------------------------------------------


function grantConsent (address provider, string calldata purpose, uint64 expiresAt) external whenNotPaused {
    if(!patients[msg.sender].registered) revert NotRegistered();
    if(!hasRole(VERIFIED_PROVIDER_ROLE, provider)) revert NotVerifiedProvider();
    if(expiresAt !=0 && expiresAt <= block.timestamp) revert InvalidExpiry();

    consents[msg.sender][provider] = Consent ({
        active: true,
        expiresAt: expiresAt,
        purpose: purpose
    });

    emit ConsentGranted(msg.sender, provider, purpose, expiresAt);
}

function revokeConsent (address patient, address provider) external {
    if(msg.sender != patient && !hasRole(REGULATOR_ROLE, msg.sender)) revert Unauthorized();

    if(!consents[patient][provider].active) revert ConsentNotActive();

    consents[patient][provider].active = false;

    emit ConsentRevoked(patient, provider);
}


//------------------------------------
// Break-Glass protocol
//-----------------------------------

/// @notice Allow ER doctor to bypass consent during life-threatening situations
/// @param patient Address of the unconscious or trauma patient
/// @param justification Reason for emergency bypass 
/// @param duration Max duration allowed (in seconds)

function triggerEmergencyAccess (address patient, string calldata justification, uint64 duration) external onlyRole(ER_SPECIALIST_ROLE) whenNotPaused{
if(!patients[patient].registered) revert NotRegistered();
uint64 validUntil = uint64(block.timestamp) + duration;

emergencySessions[patient] = EmergencyAccess({
    validUntil: validUntil,
    doctor: msg.sender,
    justification: justification
});

emit EmergencyAccessTriggered(patient, msg.sender, justification, validUntil);
}

//-----------------------------------
//Record Anchoring and Verification
//-----------------------------------

function anchorRecord (
    address patient, 
    bytes32 recordId, 
    bytes32 recordHash, 
    string calldata pointer) external whenNotPaused {
        if(!patients[patient].registered) revert NotRegistered();
        if(msg.sender != patient && !hasValidAccess(patient, msg.sender)) {
            revert Unauthorized();
        }

        recordAnchors[patient][recordId] = RecordAnchor({
            recordHash: recordHash,
            pointer: pointer,
            anchoredBy: msg.sender,
            anchoredAt: uint64(block.timestamp),
            tombstoned: false
        });

        emit RecordAnchored(patient, recordId, recordHash, pointer, msg.sender);
    }

    function tombstoneRecord (address patient, bytes32 recordId) external {
        if(msg.sender != patient && !hasRole(REGULATOR_ROLE, msg.sender)) revert Unauthorized();
        if(recordAnchors[patient][recordId].anchoredAt == 0) revert RecordNotFound();

        recordAnchors[patient][recordId].tombstoned = true;

        emit RecordTombstoned(patient, recordId);
    } 


    function verifyRecordHash (
        address patient, 
        bytes32 recordId,
        bytes32 candidateHash
    ) external view returns (bool matches, bool tombstoned) {
        RecordAnchor storage a = recordAnchors[patient][recordId];
        
        return (a.recordHash == candidateHash, a.tombstoned);

    }


function hasValidAccess (address patient, address accessor) public view returns (bool ) {
    //1. check direct consent 
    Consent storage c = consents[patient][accessor];

    if(c.active && (c.expiresAt == 0 || c.expiresAt >= block.timestamp)) {
        return true;
    }

    //2. Check emergency session
    EmergencyAccess storage er = emergencySessions[patient];
    if(er.doctor == accessor && er.validUntil >= block.timestamp) {
        return true;
    }

    return false;
}

function logRecordAccess (address patient, bytes32 recordId, string calldata purpose) external {
    if(msg.sender != patient && !hasValidAccess (patient, msg.sender)) {
        revert Unauthorized();
    }

    emit RecordAccessed (patient, recordId, msg.sender, purpose);
}

}

