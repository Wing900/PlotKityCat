// Package releaseauth is the shared publisher/client Ed25519 wire format.
package releaseauth

import (
	"crypto/ed25519"
	"crypto/sha256"
	_ "embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
)

type Artifact struct {
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size,omitempty"`
	Format string `json:"format,omitempty"`
}
type Manifest struct {
	Version     string            `json:"version"`
	Notes       string            `json:"notes"`
	PublishedAt string            `json:"publishedAt"`
	Windows     Artifact          `json:"windows"`
	Channels    map[string]string `json:"channels,omitempty"`
	KeyID       string            `json:"keyId,omitempty"`
	Signature   string            `json:"signature,omitempty"`
}

// Only public keys are embedded. Private keys must stay outside the repository.
//
//go:embed trusted_keys.json
var trustedKeysJSON []byte

func KeyID(key ed25519.PublicKey) string {
	sum := sha256.Sum256(key)
	return hex.EncodeToString(sum[:16])
}
func Payload(m Manifest) ([]byte, error) { m.Signature = ""; return json.Marshal(m) }
func Sign(m *Manifest, key ed25519.PrivateKey) error {
	m.KeyID = KeyID(key.Public().(ed25519.PublicKey))
	data, err := Payload(*m)
	if err != nil {
		return err
	}
	m.Signature = base64.StdEncoding.EncodeToString(ed25519.Sign(key, data))
	return nil
}
func Verify(m Manifest) error {
	var trusted map[string]string
	if err := json.Unmarshal(trustedKeysJSON, &trusted); err != nil {
		return err
	}
	encoded, ok := trusted[m.KeyID]
	if !ok {
		return fmt.Errorf("更新发布密钥未受信任")
	}
	key, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(key) != ed25519.PublicKeySize {
		return fmt.Errorf("更新公钥无效")
	}
	sig, err := base64.StdEncoding.DecodeString(m.Signature)
	if err != nil || len(sig) != ed25519.SignatureSize {
		return fmt.Errorf("更新描述缺少有效签名")
	}
	data, err := Payload(m)
	if err != nil {
		return err
	}
	if !ed25519.Verify(key, data, sig) {
		return fmt.Errorf("更新发布签名校验失败")
	}
	return nil
}
