// release-sign signs release manifests offline and never uploads private keys.
package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"plotkitycat/internal/releaseauth"
	"strings"
	"time"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func run() error {
	keyPath := flag.String("key", os.Getenv("PLOTKITYCAT_RELEASE_KEY"), "private key outside repository")
	generate := flag.Bool("generate", false, "generate a new key")
	publicPath := flag.String("public", "", "public trust JSON output")
	artifact := flag.String("artifact", "", "artifact file")
	version := flag.String("version", "", "release version")
	url := flag.String("url", "", "artifact HTTPS URL")
	format := flag.String("format", "zip", "zip or exe")
	notes := flag.String("notes", "", "release notes")
	output := flag.String("output", "", "signed manifest output")
	flag.Parse()
	if *keyPath == "" {
		return fmt.Errorf("set PLOTKITYCAT_RELEASE_KEY or -key to a private key outside the repository")
	}
	if *generate {
		if *publicPath == "" {
			return fmt.Errorf("-public required")
		}
		if _, err := os.Stat(*keyPath); !os.IsNotExist(err) {
			return fmt.Errorf("refusing to overwrite an existing or inaccessible key")
		}
		pub, priv, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return err
		}
		trust := map[string]string{}
		if data, err := os.ReadFile(*publicPath); err == nil {
			if err := json.Unmarshal(data, &trust); err != nil {
				return err
			}
		}
		if err := os.MkdirAll(filepath.Dir(*keyPath), 0700); err != nil {
			return err
		}
		if err := os.WriteFile(*keyPath, []byte(base64.StdEncoding.EncodeToString(priv)), 0600); err != nil {
			return err
		}
		trust[releaseauth.KeyID(pub)] = base64.StdEncoding.EncodeToString(pub)
		data, _ := json.MarshalIndent(trust, "", "  ")
		return os.WriteFile(*publicPath, data, 0644)
	}
	if !strings.HasPrefix(*url, "https://") || *version == "" || (*format != "zip" && *format != "exe") {
		return fmt.Errorf("valid HTTPS URL, version and artifact format required")
	}
	encoded, err := os.ReadFile(*keyPath)
	if err != nil {
		return err
	}
	key, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(encoded)))
	if err != nil || len(key) != ed25519.PrivateKeySize {
		return fmt.Errorf("invalid private key")
	}
	file, err := os.Open(*artifact)
	if err != nil {
		return err
	}
	defer file.Close()
	hash := sha256.New()
	size, err := io.Copy(hash, file)
	if err != nil {
		return err
	}
	m := releaseauth.Manifest{Version: *version, Notes: *notes, PublishedAt: time.Now().UTC().Format(time.RFC3339), Windows: releaseauth.Artifact{URL: *url, SHA256: hex.EncodeToString(hash.Sum(nil)), Size: size, Format: *format}}
	if err := releaseauth.Sign(&m, ed25519.PrivateKey(key)); err != nil {
		return err
	}
	if err := releaseauth.Verify(m); err != nil {
		return fmt.Errorf("key absent from app trust store: %w", err)
	}
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(*output, data, 0644)
}
