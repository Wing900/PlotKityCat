package paths

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// RuntimeRevision keys immutable environments by the shipped archive digest.
// Releases without metadata retain the legacy directory for compatibility.
func RuntimeRevision() (string, error) {
	root, err := AppRoot()
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(filepath.Join(root, "resources", "runtime", "release.json"))
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	var release struct {
		SHA256 string `json:"sha256"`
	}
	if err := json.Unmarshal(data, &release); err != nil {
		return "", err
	}
	decoded, err := hex.DecodeString(release.SHA256)
	if err != nil || len(decoded) != 32 {
		return "", fmt.Errorf("runtime release digest invalid")
	}
	return hex.EncodeToString(decoded), nil
}
