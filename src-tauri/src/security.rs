use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::rngs::OsRng;
use rand::Rng;

// BIP-39 English word list (first 256 words for recovery phrase generation)
// 256 words × 12 picks = 96 bits of entropy — more than sufficient for recovery
const WORDLIST: [&str; 256] = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
    "absurd", "abuse", "access", "account", "accuse", "achieve", "acid", "acoustic",
    "acquire", "across", "action", "actor", "actual", "adapt", "add", "addict",
    "address", "adjust", "admit", "adult", "advance", "advice", "aerobic", "affair",
    "afford", "afraid", "again", "agent", "agree", "ahead", "aim", "air",
    "airport", "aisle", "alarm", "album", "alert", "alien", "allow", "almost",
    "alone", "alpha", "already", "also", "alter", "always", "amazing", "among",
    "amount", "amused", "anchor", "ancient", "anger", "angle", "animal", "annual",
    "another", "answer", "antenna", "antique", "anxiety", "apart", "apple", "approve",
    "arctic", "area", "arena", "argue", "armor", "army", "arrange", "arrest",
    "arrive", "arrow", "artist", "artwork", "aspect", "assault", "asset", "atom",
    "auction", "audit", "august", "aunt", "auto", "autumn", "average", "avocado",
    "avoid", "awake", "aware", "awesome", "awful", "bamboo", "banana", "banner",
    "bargain", "barrel", "basic", "basket", "battle", "beach", "beauty", "because",
    "become", "before", "begin", "behind", "believe", "below", "bench", "benefit",
    "bicycle", "bird", "blade", "blanket", "blast", "blaze", "bless", "blind",
    "blood", "blossom", "board", "bonus", "border", "bottom", "bounce", "brain",
    "brand", "brave", "bread", "breeze", "bridge", "bright", "bring", "broken",
    "bronze", "brother", "brush", "bubble", "budget", "build", "bullet", "bundle",
    "burden", "burger", "butter", "cabin", "cable", "cactus", "cage", "cake",
    "camera", "camp", "canal", "cancel", "canvas", "canyon", "capable", "capital",
    "capture", "carbon", "carpet", "carry", "castle", "catalog", "catch", "cattle",
    "ceiling", "celery", "cement", "census", "cereal", "certain", "champion", "change",
    "channel", "chapter", "charge", "cherry", "chicken", "chief", "choice", "chronic",
    "chunk", "circle", "citizen", "civil", "claim", "clarify", "classic", "clean",
    "clever", "clinic", "clock", "close", "cluster", "coach", "coconut", "coffee",
    "collect", "column", "combine", "comfort", "comic", "common", "company", "concert",
    "conduct", "confirm", "congress", "connect", "consider", "control", "convince", "coral",
    "correct", "cotton", "couch", "country", "couple", "cover", "craft", "crane",
    "crash", "crater", "crawl", "crazy", "cream", "credit", "cricket", "crisp",
    "critic", "crop", "crucial", "cruel", "cruise", "crystal", "culture", "curtain",
    "custom", "cycle", "dance", "danger", "daring", "dawn", "debate", "decade",
];

/// Hash a password using Argon2id (PHC string format for storage)
pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("Password hashing failed: {}", e))?;
    Ok(hash.to_string())
}

/// Verify a password against a stored Argon2id hash
pub fn verify_password(password: &str, hash_str: &str) -> Result<bool, String> {
    let parsed = PasswordHash::new(hash_str)
        .map_err(|e| format!("Invalid password hash format: {}", e))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

/// Derive a 32-byte encryption key from a password and salt using Argon2id
pub fn derive_encryption_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Key derivation failed: {}", e))?;
    Ok(key)
}

/// Encrypt data using AES-256-GCM. Returns nonce (12 bytes) prepended to ciphertext.
pub fn encrypt_data(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce_bytes: [u8; 12] = rand::thread_rng().gen();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext for later decryption
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    Ok(result)
}

/// Decrypt data that was encrypted with encrypt_data (expects nonce prepended to ciphertext)
pub fn decrypt_data(key: &[u8; 32], data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() < 12 {
        return Err("Encrypted data too short (missing nonce)".to_string());
    }
    let (nonce_bytes, ciphertext) = data.split_at(12);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))
}

/// Generate 12 random recovery words from the BIP-39 word list
pub fn generate_recovery_words() -> Vec<String> {
    let mut rng = rand::thread_rng();
    (0..12)
        .map(|_| {
            let idx = rng.gen_range(0..WORDLIST.len());
            WORDLIST[idx].to_string()
        })
        .collect()
}

/// Derive an encryption key from recovery words (deterministic, using fixed salt)
pub fn derive_key_from_recovery(words: &[String]) -> Result<[u8; 32], String> {
    let phrase = words.join(" ");
    // Fixed salt for recovery-based key derivation (deterministic)
    let salt = b"lbm-recovery-derive-v1";
    derive_encryption_key(&phrase, salt)
}

/// Encode binary data to base64 string
pub fn encode_base64(data: &[u8]) -> String {
    BASE64.encode(data)
}

/// Decode base64 string to binary data
pub fn decode_base64(encoded: &str) -> Result<Vec<u8>, String> {
    BASE64
        .decode(encoded)
        .map_err(|e| format!("Base64 decode failed: {}", e))
}

/// Generate a random 32-byte master encryption key
pub fn generate_master_key() -> [u8; 32] {
    rand::thread_rng().gen()
}

/// Generate a random 16-byte salt for key derivation
pub fn generate_salt() -> [u8; 16] {
    rand::thread_rng().gen()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hash_and_verify() {
        let password = "test_password_123";
        let hash = hash_password(password).unwrap();
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_encrypt_decrypt() {
        let key = generate_master_key();
        let plaintext = b"Hello, LBM! This is secret data.";
        let encrypted = encrypt_data(&key, plaintext).unwrap();
        let decrypted = decrypt_data(&key, &encrypted).unwrap();
        assert_eq!(plaintext.to_vec(), decrypted);
    }

    #[test]
    fn test_encrypt_decrypt_wrong_key() {
        let key1 = generate_master_key();
        let key2 = generate_master_key();
        let plaintext = b"Secret data";
        let encrypted = encrypt_data(&key1, plaintext).unwrap();
        assert!(decrypt_data(&key2, &encrypted).is_err());
    }

    #[test]
    fn test_recovery_words_generation() {
        let words = generate_recovery_words();
        assert_eq!(words.len(), 12);
        for word in &words {
            assert!(WORDLIST.contains(&word.as_str()));
        }
    }

    #[test]
    fn test_recovery_key_derivation_deterministic() {
        let words: Vec<String> = vec![
            "abandon", "ability", "able", "about", "above", "absent",
            "absorb", "abstract", "absurd", "abuse", "access", "account",
        ]
        .into_iter()
        .map(String::from)
        .collect();

        let key1 = derive_key_from_recovery(&words).unwrap();
        let key2 = derive_key_from_recovery(&words).unwrap();
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_base64_encode_decode() {
        let data = b"test data for base64";
        let encoded = encode_base64(data);
        let decoded = decode_base64(&encoded).unwrap();
        assert_eq!(data.to_vec(), decoded);
    }

    #[test]
    fn test_key_derivation() {
        let password = "strong_password";
        let salt = generate_salt();
        let key1 = derive_encryption_key(password, &salt).unwrap();
        let key2 = derive_encryption_key(password, &salt).unwrap();
        assert_eq!(key1, key2);
        // Different salt should produce different key
        let salt2 = generate_salt();
        let key3 = derive_encryption_key(password, &salt2).unwrap();
        assert_ne!(key1, key3);
    }
}
